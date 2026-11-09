import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contractProjection, fixedConsumptionProjection, missingProjections, type MonthlyProjection } from "./annual-projections";

type Ctx = { supabase: any; userId: string };

const uuid = z.string().uuid();
async function assertOpenYear(supabase: any, userId: string, year: number) {
  const { data, error } = await supabase.from("annual_years").select("archived_at")
    .eq("user_id", userId).eq("year", year).maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.archived_at) throw new Error(`O exercício ${year} está arquivado. Nenhum valor foi alterado.`);
}
async function sourceRow(supabase: any, userId: string, expenseId: string) {
  const { data, error } = await supabase.from("annual_expenses").select("*")
    .eq("user_id", userId).eq("id", expenseId).maybeSingle();
  if (error || !data) throw new Error("Despesa anual não localizada ou sem acesso.");
  return data;
}

/** Projeta os meses ausentes e preserva valores, pagamentos e anos já cadastrados. Repetição é segura. */
async function materialize(
  supabase: any, userId: string, base: any, plan: MonthlyProjection[],
  source: "contract" | "consumption", contractId?: string,
) {
  const years = [...new Set(plan.map(p => p.year))].sort((a,b)=>a-b);
  if (!years.length) return { years: [], created: 0, preserved: 0 };
  if (years.length > 75) throw new Error("Horizonte de projeção excessivo.");
  const existingRows: any[] = [];
  const { data: rows, error: rowsError } = await supabase.from("annual_expenses")
    .select("id,year,creditor,source_contract_id,source_template_id,expense_source,expense_kind")
    .eq("user_id",userId).gte("year",years[0]).lte("year",years.at(-1));
  if (rowsError) throw new Error(rowsError.message);
  existingRows.push(...(rows ?? []));

  // Verificação antecipada para impedir projetar sobre uma linha diferente com o mesmo credor.
  for (const year of years) {
    await assertOpenYear(supabase,userId,year);
    const candidate = existingRows.find(r => r.year === year && r.creditor.toLowerCase() === base.creditor.toLowerCase());
    if (candidate && candidate.id !== base.id &&
      !(source === "contract" && candidate.source_contract_id === contractId) &&
      !(source === "consumption" && candidate.source_template_id === (base.source_template_id ?? base.id))) {
      throw new Error(`Já existe "${base.creditor}" em ${year} sem vínculo com esta origem. Confira o credor antes de gerar parcelas.`);
    }
  }
  let created = 0, preserved = 0;
  for (const year of years) {
    let dest = year === base.year ? base :
      existingRows.find(r => r.year === year && (source === "contract"
        ? r.source_contract_id === contractId : r.source_template_id === (base.source_template_id ?? base.id)));
    if (!dest) {
      const { error: yearError } = await supabase.from("annual_years")
        .upsert({ user_id: userId, year }, { onConflict:"user_id,year", ignoreDuplicates:true });
      if (yearError) throw new Error(yearError.message);
      const { data: maxRows, error: maxError } = await supabase.from("annual_expenses")
        .select("position").eq("user_id",userId).eq("year",year).order("position",{ascending:false}).limit(1);
      if (maxError) throw new Error(maxError.message);
      const payload = {
        id: crypto.randomUUID(), user_id:userId, year, creditor:base.creditor, due_day:base.due_day,
        position:(maxRows?.[0]?.position ?? -1) + 1,
        expense_kind: source === "consumption" ? "consumption" : "debt",
        consumption_value_type: base.consumption_value_type ?? "fixed",
        expense_source:source,
        source_contract_id:source === "contract" ? contractId : null,
        source_template_id:source === "consumption" ? (base.source_template_id ?? base.id) : null,
      };
      const { data: inserted, error: insertError } = await supabase.from("annual_expenses").insert(payload).select("id").single();
      if (insertError) throw new Error(`Não foi possível criar o exercício ${year}: ${insertError.message}`);
      dest = { ...payload, id:inserted.id };
      existingRows.push(dest);
    }
    const target = plan.filter(p=>p.year===year);
    const { data: prior, error: priorError } = await supabase.from("annual_expense_months")
      .select("month,expected_cents").eq("annual_expense_id",dest.id);
    if (priorError) throw new Error(priorError.message);
    // Mesmo um valor 0 ou NULL existente é uma decisão registrada, não um espaço a sobrescrever.
    const missing = missingProjections(target,(prior ?? []).map((p:any)=>({year,month:p.month})));
    preserved += target.length - missing.length;
    if(missing.length) {
      const { error: monthError } = await supabase.from("annual_expense_months").upsert(
        missing.map(p=>({annual_expense_id:dest.id,month:p.month,expected_cents:p.expected_cents})),
        {onConflict:"annual_expense_id,month",ignoreDuplicates:true});
      if(monthError) throw new Error(monthError.message);
      created += missing.length;
    }
  }
  return {years,created,preserved};
}

export const getAnnualContractChoices = createServerFn({ method: "GET" })
.middleware([requireSupabaseAuth])
.handler(async({context})=>{
  const {supabase,userId}=context as Ctx;
  const {data:contracts,error}=await supabase.from("installment_contracts")
    .select("id,name").eq("user_id",userId).is("archived_at",null).order("name");
  if(error) throw new Error(error.message);
  return (contracts??[]) as Array<{id:string;name:string}>;
});

export const projectAnnualContract = createServerFn({method:"POST"})
.middleware([requireSupabaseAuth])
.inputValidator((input:unknown)=>z.object({expenseId:uuid,contractId:z.string().min(1).max(120)}).parse(input))
.handler(async({data,context})=>{
  const {supabase,userId}=context as Ctx;
  const base=await sourceRow(supabase,userId,data.expenseId);
  if(base.expense_kind==="consumption" || base.expense_source==="card") throw new Error("Classifique a despesa como contrato parcelado antes de gerar anos.");
  await assertOpenYear(supabase,userId,base.year);
  const {data:contract,error:contractError}=await supabase.from("installment_contracts")
    .select("id,name").eq("user_id",userId).eq("id",data.contractId).maybeSingle();
  if(contractError || !contract) throw new Error("Contrato não encontrado neste cadastro.");
  const {data:entries,error:entriesError}=await supabase.from("installment_entries")
    .select("due_date,expected_cents").eq("user_id",userId).eq("contract_id",contract.id).order("due_date");
  if(entriesError) throw new Error(entriesError.message);
  const plan=contractProjection(entries??[],base.year);
  if(!plan.length) throw new Error("O contrato não tem parcelas a partir deste exercício.");
  if(base.source_contract_id && base.source_contract_id!==contract.id) throw new Error("Este credor já está vinculado a outro contrato.");
  const {error:updateError}=await supabase.from("annual_expenses").update({
    expense_kind:"debt",expense_source:"contract",source_contract_id:contract.id,
    updated_at:new Date().toISOString(),
  }).eq("id",base.id).eq("user_id",userId);
  if(updateError) throw new Error(updateError.message);
  const outcome=await materialize(supabase,userId,{...base,expense_source:"contract",source_contract_id:contract.id},plan,"contract",contract.id);
  await supabase.rpc("audit_append",{
    p_action:"project_annual_contract",p_entity_type:"annual_expense",p_entity_id:base.id,
    p_before:null,p_after:{contract_id:contract.id,...outcome},p_details:{source:"installment_entries"},
  });
  return outcome;
});

export const projectFixedAnnualConsumption = createServerFn({method:"POST"})
.middleware([requireSupabaseAuth])
.inputValidator((input:unknown)=>z.object({expenseId:uuid,monthlyCents:z.number().int().positive().max(999999999999)}).parse(input))
.handler(async({data,context})=>{
  const {supabase,userId}=context as Ctx;
  const base=await sourceRow(supabase,userId,data.expenseId);
  if(base.expense_kind!=="consumption" || base.consumption_value_type!=="fixed")
    throw new Error("Projeção mensal disponível somente para consumo fixo.");
  await assertOpenYear(supabase,userId,base.year);
  // Horizonte derivado exclusivamente do último vencimento efetivo de contratos cadastrados.
  const {data:last,error:lastError}=await supabase.from("installment_entries")
    .select("due_date").eq("user_id",userId).gte("due_date",`${base.year}-01-01`)
    .order("due_date",{ascending:false}).limit(1);
  if(lastError) throw new Error(lastError.message);
  const throughYear=Math.max(base.year,Number(last?.[0]?.due_date?.slice(0,4) ?? base.year));
  const plan=fixedConsumptionProjection(base.year,throughYear,data.monthlyCents);
  const {error:updateError}=await supabase.from("annual_expenses").update({
    source_template_id:base.source_template_id ?? base.id,expense_source:"consumption",updated_at:new Date().toISOString(),
  }).eq("user_id",userId).eq("id",base.id);
  if(updateError) throw new Error(updateError.message);
  const outcome=await materialize(supabase,userId,{...base,source_template_id:base.source_template_id??base.id},plan,"consumption");
  await supabase.rpc("audit_append",{
    p_action:"project_fixed_consumption",p_entity_type:"annual_expense",p_entity_id:base.id,
    p_before:null,p_after:{monthly_cents:data.monthlyCents,...outcome},p_details:{source:"fixed_consumption"},
  });
  return outcome;
});

/** Ao cadastrar financiamento mais longo, amplia somente consumos fixos já ativados para projeção.
 * Nunca altera competências anteriores, valores pagos ou cobranças variáveis.
 */
export async function extendFixedConsumptionsForNewContract(supabase:any,userId:string,throughYear:number) {
  if(!Number.isInteger(throughYear) || throughYear > 2100) return {extended:0,warnings:["Horizonte do contrato inválido."]};
  const {data:rows,error}=await supabase.from("annual_expenses")
    .select("id,year,creditor,due_day,consumption_value_type,source_template_id,expense_source,expense_kind")
    .eq("user_id",userId).eq("expense_kind","consumption")
    .eq("consumption_value_type","fixed").not("source_template_id","is",null)
    .order("year",{ascending:false});
  if(error) throw new Error(error.message);
  const latest = new Map<string,any>();
  for(const row of rows??[]) {
    const root=row.source_template_id as string;
    if(!latest.has(root))latest.set(root,row);
  }
  let extended=0;
  const warnings:string[]=[];
  for(const row of latest.values()){
    if(row.year >= throughYear)continue;
    const {data:monthly,error:monthError}=await supabase.from("annual_expense_months")
      .select("month,expected_cents").eq("annual_expense_id",row.id)
      .order("month",{ascending:false}).limit(12);
    if(monthError){warnings.push(row.creditor+": "+monthError.message);continue;}
    const cents=(monthly??[]).find((m:any)=>Number(m.expected_cents)>0)?.expected_cents;
    if(!Number.isSafeInteger(Number(cents)) || Number(cents)<=0){
      warnings.push(row.creditor+": mensalidade não identificada; projeção mantida sem alterações.");continue;
    }
    try{
      const plan=fixedConsumptionProjection(row.year+1,throughYear,Number(cents));
      const result=await materialize(supabase,userId,row,plan,"consumption");
      extended+=result.created;
    }catch(e){warnings.push(row.creditor+": "+(e instanceof Error?e.message:"Falha de projeção"));}
  }
  return {extended,warnings};
}
