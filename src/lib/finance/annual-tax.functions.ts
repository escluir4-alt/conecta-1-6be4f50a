import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { annualTaxSchedule } from "./annual-tax";

type Ctx = {supabase:any;userId:string};

/** Gera somente parcelas que ainda não existem, sem alterar competências, pagamentos ou históricos. */
export const scheduleAnnualTax = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>z.object({
    expenseId:z.string().uuid(),
    totalCents:z.number().int().positive().max(999999999999),
    firstMonth:z.number().int().min(1).max(12),
    installments:z.number().int().min(1).max(12),
  }).parse(input))
  .handler(async({data,context})=>{
    const {supabase,userId}=context as Ctx;
    const plan=annualTaxSchedule(data);
    const {data:row,error:rowError}=await supabase.from("annual_expenses")
      .select("id,year,creditor,expense_source,annual_tax_kind").eq("user_id",userId)
      .eq("id",data.expenseId).maybeSingle();
    if(rowError || !row)throw new Error("Tributo não encontrado no exercício.");
    if(row.expense_source!=="annual_tax" || !["iptu","ipva","other"].includes(row.annual_tax_kind))
      throw new Error("Classifique a despesa como tributo anual antes de lançar parcelas.");
    const {data:period,error:periodError}=await supabase.from("annual_years")
      .select("archived_at").eq("user_id",userId).eq("year",row.year).maybeSingle();
    if(periodError)throw new Error(periodError.message);
    if(period?.archived_at)throw new Error("Exercício arquivado: nenhuma parcela modificada.");
    const {data:existing,error:existingError}=await supabase.from("annual_expense_months")
      .select("month,expected_cents").eq("annual_expense_id",row.id);
    if(existingError)throw new Error(existingError.message);
    const months=new Map<number,number|null>((existing??[]).map((m:any)=>[m.month,m.expected_cents]));
    const planned=new Map(plan.map(p=>[p.month,p.expected_cents]));
    // Não substitui valor lançado e não soma silenciosamente um segundo IPTU ou IPVA no mesmo credor.
    for(const [month,value] of months){
      if(!planned.has(month)) throw new Error(
        "Esta despesa já possui outras competências. Ajuste a grade manualmente antes de mudar o parcelamento.");
      if(value !== planned.get(month)) throw new Error(
        "Já existe um valor diferente nesta competência. O histórico foi preservado; ajuste manualmente se necessário.");
    }
    const missing=plan.filter(p=>!months.has(p.month));
    if(!missing.length)return {created:0,preserved:plan.length,year:row.year};
    const periods=missing.map(p=>`${row.year}-${String(p.month).padStart(2,"0")}`);
    const {data:paid,error:paymentError}=await supabase.from("finance_bills").select("id")
      .eq("user_id",userId).eq("source_annual_id",row.id)
      .in("source_period",periods).not("paid_date","is",null).limit(1);
    if(paymentError)throw new Error(paymentError.message);
    if(paid?.length)throw new Error("Há pagamento confirmado nessas competências; o lançamento foi preservado.");
    const {error:insertError}=await supabase.from("annual_expense_months").upsert(
      missing.map(p=>({annual_expense_id:row.id,month:p.month,expected_cents:p.expected_cents})),
      {onConflict:"annual_expense_id,month",ignoreDuplicates:true});
    if(insertError)throw new Error(insertError.message);
    const {error:auditError}=await supabase.rpc("audit_append",{
      p_action:"schedule_annual_tax",p_entity_type:"annual_expense",p_entity_id:row.id,
      p_before:null,p_after:{year:row.year,kind:row.annual_tax_kind,plan:missing},
      p_details:{total_cents:data.totalCents,first_month:data.firstMonth,installments:data.installments},
    });
    if(auditError)throw new Error("As parcelas foram registradas, mas houve falha na auditoria: "+auditError.message);
    return {created:missing.length,preserved:plan.length-missing.length,year:row.year};
  });
