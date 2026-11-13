import { consolidateAnnualDashboard, summarizeConsumptionForPeriod } from "@/lib/finance/annual-dashboard";
import { extendFixedConsumptionsForNewContract } from "@/lib/finance/annual-projections.functions";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clampDueDate, expensePaymentAdjustment, monthOfDueDate, parseBRL } from "./money";
import { assertUserCreditCard } from "@/lib/pluggy.functions";
import { SEED_ANNUAL, SEED_BILLS, SEED_CONTRACTS, SEED_INSTALLMENTS, SEED_YEAR, SEED_YEAR_SOURCE } from "./seed-data";

type Ctx = { supabase: any; userId: string };

// Compatibilidade temporária com bancos ainda sem a migração de quitação.
// Não deduz descontos nem altera os pagamentos existentes.
function isMissingSettlementColumn(error: {message?:string}|null|undefined) {
  return /is_settled/i.test(error?.message ?? "");
}
async function paymentSettlementColumnExists(supabase:any, table:"finance_bills"|"installment_entries") {
  const {error}=await supabase.from(table).select("is_settled").limit(1);
  if(!error) return true;
  if(isMissingSettlementColumn(error)) return false;
  throw new Error("Falha ao verificar estrutura de quitação: "+error.message);
}
async function selectPaymentRows(
  supabase:any, table:"finance_bills"|"installment_entries",
  columns:string, filter:(q:any)=>any,
):Promise<{data:any[]|null;error:any}> {
  const first=await filter(supabase.from(table).select(columns));
  if(!first.error || !isMissingSettlementColumn(first.error)) return first;
  const withoutSettlement=columns.split(",").map(x=>x.trim()).filter(x=>x!=="is_settled").join(",");
  const legacy=await filter(supabase.from(table).select(withoutSettlement));
  if(legacy.error) return legacy;
  return {...legacy,data:(legacy.data??[]).map((item:any)=>({...item,is_settled:null}))};
}

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Competência inválida (AAAA-MM)");

function periodBounds(period: string): { start: string; end: string } {
  const [y = 0, m = 1] = period.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { start: `${period}-01`, end: next };
}

function contractForCreditor(creditor: string): string | null {
  const c = creditor.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (c.includes("emprestimo") && c.includes("c6")) return "c6";
  if (c.includes("emprestimo") && c.includes("caixa")) return "caixa";
  if (c.includes("negociacao") && c.includes("inter")) return "inter";
  if (c.includes("negociacao") && c.includes("porto")) return "porto";
  return null;
}

async function audit(supabase: any, action: string, entityType: string, entityId: string | null, before: unknown, after: unknown, details?: unknown) {
  await supabase.rpc("audit_append", {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_before: before ?? null,
    p_after: after ?? null,
    p_details: details ?? null,
  });
}

// ================= IMPORTAÇÃO INICIAL (idempotente) =================

export const importAxionData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as Ctx;
    const { data: existing } = await supabase.from("annual_years").select("year").eq("year", SEED_YEAR).maybeSingle();
    if (existing) return { alreadyImported: true };

    const { error: yErr } = await supabase.from("annual_years").insert({ user_id: userId, year: SEED_YEAR, source_name: SEED_YEAR_SOURCE });
    if (yErr) throw new Error(yErr.message);

    const { error: eErr } = await supabase.from("annual_expenses").insert(
      SEED_ANNUAL.map((r) => ({ id: r.id, user_id: userId, year: SEED_YEAR, creditor: r.creditor, due_day: r.dueDay, position: r.position })),
    );
    if (eErr) throw new Error(eErr.message);

    const monthRows = SEED_ANNUAL.flatMap((r) =>
      r.months.map((v, i) => ({ annual_expense_id: r.id, month: i + 1, expected_cents: v })),
    );
    const { error: mErr } = await supabase.from("annual_expense_months").insert(monthRows);
    if (mErr) throw new Error(mErr.message);

    const { error: cErr } = await supabase.from("installment_contracts").insert(
      SEED_CONTRACTS.map((c) => ({
        id: c.id, user_id: userId, name: c.name, description: c.description,
        details_json: c.details, source_sheet: c.source_sheet, archived_at: c.archived_at,
      })),
    );
    if (cErr) throw new Error(cErr.message);

    const { error: iErr } = await supabase.from("installment_entries").upsert(
      SEED_INSTALLMENTS.map((i) => ({
        user_id: userId, contract_id: i.contractId, number: i.number, expected_cents: i.expectedCents,
        due_date: i.dueDate, paid_date: i.paidDate, paid_cents: i.paidCents, note: i.note,
      })),
      { onConflict: "user_id,contract_id,number", ignoreDuplicates: true },
    );
    if (iErr) throw new Error(iErr.message);

    const { error: bErr } = await supabase.from("finance_bills").upsert(
      SEED_BILLS.map((b) => ({
        id: b.id, user_id: userId, creditor: b.creditor, description: b.description, due_date: b.dueDate,
        expected_cents: b.expectedCents, paid_date: b.paidDate, paid_cents: b.paidCents, paid_note: b.paidNote,
        source_annual_id: b.sourceAnnualId, source_period: b.sourcePeriod,
        contract_id: b.contractId, installment_number: b.installmentNumber,
      })),
      { onConflict: "user_id,id", ignoreDuplicates: true },
    );
    if (bErr) throw new Error(bErr.message);

    await audit(supabase, "import_seed", "annual_year", String(SEED_YEAR), null, {
      creditors: SEED_ANNUAL.length, bills: SEED_BILLS.length, contracts: SEED_CONTRACTS.length, installments: SEED_INSTALLMENTS.length,
    });
    return { alreadyImported: false, creditors: SEED_ANNUAL.length, bills: SEED_BILLS.length, contracts: SEED_CONTRACTS.length, installments: SEED_INSTALLMENTS.length };
  });

// ================= DESPESAS DO MÊS =================

export const getMonthExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ period: periodSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const { period } = data;
    const [y = 0, m = 1] = period.split("-").map(Number);
    const { start, end } = periodBounds(period);
    const reviewFlags: string[] = [];
    const billSettlementAvailable = await paymentSettlementColumnExists(supabase, "finance_bills");
    if(!billSettlementAvailable) {
      reviewFlags.push("A estrutura Quita ainda não está ativada no banco; os pagamentos existentes são mostrados sem inferir descontos.");
    }

    // Sincronização anual → contas do mês (idempotente)
    const { data: rows, error: rowError } = await supabase.from("annual_expenses").select("*").eq("year", y).order("position");
    if (rowError) throw new Error(rowError.message);
    const rowIds = (rows ?? []).map((r: any) => r.id);
    const { data: monthCells, error: monthError } = rowIds.length
      ? await supabase.from("annual_expense_months").select("annual_expense_id, expected_cents").in("annual_expense_id", rowIds).eq("month", m)
      : { data: [], error: null };
    if (monthError) throw new Error(monthError.message);
    const cellByRow = new Map<string, number | null>((monthCells ?? []).map((c: any) => [c.annual_expense_id as string, c.expected_cents as number | null]));

    const { data: existing, error: billError } = await supabase.from("finance_bills").select("*").gte("due_date", start).lt("due_date", end);
    if (billError) throw new Error(billError.message);
    const bills = (existing ?? []) as any[];
    const linkedAnnual = new Set(bills.filter((b) => b.source_annual_id).map((b) => `${b.source_annual_id}:${b.source_period}`));
    const linkedInst = new Set(bills.filter((b) => b.contract_id).map((b) => `${b.contract_id}:${b.installment_number}`));

    let created = 0;
    for (const row of rows ?? []) {
      const expected = cellByRow.get(row.id);
      if (expected === null || expected === undefined || expected <= 0) continue;
      if (linkedAnnual.has(`${row.id}:${period}`)) continue;

      const dueDate = clampDueDate(y, m, row.due_day ?? 1);
      // Vínculo explícito do cadastro prevalece. Heurística legada somente para linhas ainda não classificadas.
      const contractId = row.expense_source === "contract" ? (row.source_contract_id ?? null)
        : row.expense_source === "manual" || !row.expense_source ? contractForCreditor(row.creditor) : null;

      // Parcela única do contrato nesta competência
      let inst: any = null;
      if (contractId) {
        const { data: entries, error: entriesError } = await selectPaymentRows(
          supabase, "installment_entries", "number,paid_date,paid_cents,note,is_settled",
          (q:any)=>q.eq("contract_id",contractId).gte("due_date",start).lt("due_date",end)
        );
        if(entriesError) throw new Error("Falha ao consultar parcelas: "+entriesError.message);
        const candidates = (entries ?? []).filter((e: any) => !linkedInst.has(`${contractId}:${e.number}`));
        if (candidates.length === 1) inst = candidates[0];
      }

      // Lançamentos manuais são independentes. Nunca presumir vínculo por credor, valor ou data.
      // A idempotência depende apenas de IDs de origem explícitos (source_annual_id/source_period).

      const { error } = await supabase.from("finance_bills").insert({
        id: `${row.id}:${period}`, user_id: userId, creditor: row.creditor,
        description: `Despesa anual · ${period}`, due_date: dueDate, expected_cents: expected,
        source_annual_id: row.id, source_period: period,
        expense_kind: row.expense_kind ?? "debt",
        contract_id: inst ? contractId : null, installment_number: inst?.number ?? null,
        paid_date: inst?.paid_date ?? null, paid_cents: inst?.paid_cents ?? null, paid_note: inst?.note ?? null,
        ...(billSettlementAvailable ? {is_settled: inst?.is_settled === true} : {}),
      });
      if (!error) {
        created++;
        if (inst) linkedInst.add(`${contractId}:${inst.number}`);
      }
    }
    if (created > 0) await audit(supabase, "ensure_month", "period", period, null, { created });

    const { data: finalBills, error: finalBillError } = await supabase.from("finance_bills").select("*").gte("due_date", start).lt("due_date", end);
    if (finalBillError) throw new Error(finalBillError.message);
    const list = ((finalBills ?? []) as any[]).sort((a, b) => a.due_date.localeCompare(b.due_date) || a.creditor.localeCompare(b.creditor));

    // Inclui as parcelas desta competência sem criar cópias de finance_bills.
    // A baixa das parcelas virtuais usa a função canônica pay_installment.
    const {data:monthInstallments,error:installmentError}=await selectPaymentRows(
      supabase,"installment_entries","contract_id,number,expected_cents,paid_date,paid_cents,due_date,note,is_settled",
      (q:any)=>q.gte("due_date",start).lt("due_date",end)
    );
    if (installmentError) throw new Error(installmentError.message);
    const { data: contractRows, error: contractError } = await supabase
      .from("installment_contracts").select("id,name");
    if (contractError) throw new Error(contractError.message);
    const contractNames = new Map<string, string>((contractRows ?? []).map((r: any) => [r.id, r.name]));
    const represented = new Set(list.filter(b => b.contract_id && b.installment_number != null)
      .map(b => `${b.contract_id}:${b.installment_number}`));
    for (const inst of monthInstallments ?? []) {
      const key = `${inst.contract_id}:${inst.number}`;
      if (represented.has(key) || !contractNames.has(inst.contract_id)) continue;
      list.push({
        id: `installment:${key}`, kind: "installment", contract_id: inst.contract_id,
        installment_number: inst.number, creditor: contractNames.get(inst.contract_id),
        due_date: inst.due_date, expected_cents: inst.expected_cents,
        paid_date: inst.paid_date, paid_cents: inst.paid_cents, paid_note: inst.note,
        is_settled: inst.is_settled,
      });
    }
    list.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.creditor.localeCompare(b.creditor));
    const kpis = {
      expected: list.reduce((s, b) => s + b.expected_cents, 0),
      paid: list.reduce((s, b) => s + (b.paid_date ? (b.paid_cents ?? 0) : 0), 0),
      covered: list.reduce((s, b) => s + expensePaymentAdjustment(b.expected_cents, b.paid_date ? b.paid_cents : null, b.is_settled === true).coveredCents, 0),
      open: list.reduce((s, b) => s + expensePaymentAdjustment(b.expected_cents, b.paid_date ? b.paid_cents : null, b.is_settled === true).openCents, 0),
      count: list.length,
    };
    return { bills: list, kpis, reviewFlags };
  });

export const payBillFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ billId: z.string(), paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), paidCents: z.number().int().positive(), note: z.string().max(1000).optional(), quits: z.boolean().default(false) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { error } = await supabase.rpc("record_expense_payment", { p_bill_id: data.billId, p_contract_id: null, p_number: null, p_paid_date: data.paidDate, p_paid_cents: data.paidCents, p_note: data.note ?? "", p_is_settled: data.quits, p_revision: false });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviseBillFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ billId: z.string(), paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), paidCents: z.number().int().positive(), note: z.string().max(1000).optional(), quits: z.boolean().default(false) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { error } = await supabase.rpc("record_expense_payment", { p_bill_id: data.billId, p_contract_id: null, p_number: null, p_paid_date: data.paidDate, p_paid_cents: data.paidCents, p_note: data.note ?? "", p_is_settled: data.quits, p_revision: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addManualBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      creditor: z.string().trim().min(1).max(100), description: z.string().trim().max(200).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), expectedCents: z.number().int().positive(),
      expenseKind: z.enum(["debt", "consumption"]).default("debt"),
    }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const id = `manual-${crypto.randomUUID()}`;
    const { error } = await supabase.from("finance_bills").insert({
      id, user_id: userId, creditor: data.creditor, description: data.description || "Conta avulsa",
      due_date: data.dueDate, expected_cents: data.expectedCents, expense_kind: data.expenseKind,
    });
    if (error) throw new Error(error.message);
    await audit(supabase, "add_bill", "bill", id, null, data);
    return { id };
  });

export const deleteBillFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ billId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: bill } = await supabase.from("finance_bills").select("*").eq("id", data.billId).single();
    if (!bill) throw new Error("Conta não encontrada");
    if (bill.paid_date) throw new Error("Conta já paga não pode ser excluída; corrija pelo Histórico.");
    const { error } = await supabase.from("finance_bills").delete().eq("id", data.billId);
    if (error) throw new Error(error.message);
    await audit(supabase, "delete_bill", "bill", data.billId, bill, null);
    return { ok: true };
  });

// ================= CSV =================

function toCsvDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const exportBillsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ period: periodSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { start, end } = periodBounds(data.period);
    const { data: bills } = await supabase.from("finance_bills").select("*").gte("due_date", start).lt("due_date", end).order("due_date");
    const lines = ["Credor;Descrição;Vencimento;Valor previsto"];
    for (const b of bills ?? []) {
      const value = (b.expected_cents / 100).toFixed(2).replace(".", ",");
      lines.push([b.creditor, b.description ?? "", toCsvDate(b.due_date), value].join(";"));
    }
    return { csv: lines.join("\n") };
  });

function parseCsvDate(s: string): string | null {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3] ?? ""}-${br[2] ?? ""}-${br[1] ?? ""}`;
  return null;
}

export const importBillsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ period: periodSchema, csv: z.string().max(200_000), confirm: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const { start, end } = periodBounds(data.period);
    const lines = data.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) throw new Error("Arquivo vazio");
    const delim = (lines[0]!.match(/;/g) ?? []).length >= (lines[0]!.match(/,/g) ?? []).length ? ";" : ",";
    const rows = lines.map((l) => l.split(delim).map((c) => c.trim()));
    const hasHeader = /credor/i.test(rows[0]?.[0] ?? "");
    const body = hasHeader ? rows.slice(1) : rows;

    const { data: existing } = await supabase.from("finance_bills").select("creditor, description, due_date, expected_cents").gte("due_date", start).lt("due_date", end);
    const seen = new Set((existing ?? []).map((b: any) => `${b.creditor.toLowerCase()}|${(b.description ?? "").toLowerCase()}|${b.due_date}|${b.expected_cents}`));

    const valid: any[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    for (const r of body) {
      const [creditor, description, dateRaw, valueRaw] = [r[0] ?? "", r[1] ?? "", r[2] ?? "", r[3] ?? ""];
      if (!creditor) { errors.push("Linha sem credor ignorada"); continue; }
      if (/^click 28$/i.test(creditor)) { skipped.push(`${creditor} (importação proibida)`); continue; }
      const dueDate = parseCsvDate(dateRaw);
      const cents = parseBRL(valueRaw);
      if (!dueDate) { errors.push(`${creditor}: data inválida "${dateRaw}"`); continue; }
      if (cents === null || cents <= 0) { errors.push(`${creditor}: valor inválido "${valueRaw}"`); continue; }
      const key = `${creditor.toLowerCase()}|${description.toLowerCase()}|${dueDate}|${cents}`;
      if (seen.has(key)) { skipped.push(`${creditor} ${dueDate} (duplicado)`); continue; }
      seen.add(key);
      valid.push({ creditor, description, dueDate, cents });
    }

    if (data.confirm && valid.length > 0) {
      const { error } = await supabase.from("finance_bills").insert(
        valid.map((v) => ({
          id: `csv-${crypto.randomUUID()}`, user_id: userId, creditor: v.creditor,
          description: v.description || "Importado via CSV", due_date: v.dueDate, expected_cents: v.cents,
        })),
      );
      if (error) throw new Error(error.message);
      await audit(supabase, "import_csv", "period", data.period, null, { imported: valid.length, skipped: skipped.length });
    }
    return { preview: valid, skipped, errors, imported: data.confirm ? valid.length : 0 };
  });

// ================= DESPESAS ANUAIS =================

export const getAnnualYear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ year: z.number().int().min(2000).max(2100) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: yearRow } = await supabase.from("annual_years").select("*").eq("year", data.year).maybeSingle();
    const { data: rows, error: annualError } = await supabase.from("annual_expenses").select("*").eq("year", data.year).order("position");
    if(annualError) throw new Error("Falha ao consultar Despesas Anuais: " + annualError.message);
    const ids = (rows ?? []).map((r: any) => r.id);
    const { data: months } = ids.length
      ? await supabase.from("annual_expense_months").select("*").in("annual_expense_id", ids)
      : { data: [] };
    const { data: paidBills } = ids.length
      ? await supabase.from("finance_bills").select("source_annual_id, source_period").in("source_annual_id", ids).not("paid_date", "is", null)
      : { data: [] };
    const paidMonths: Record<string, number[]> = {};
    for (const b of paidBills ?? []) {
      const mm = Number(b.source_period?.slice(5, 7));
      if (!mm) continue;
      paidMonths[b.source_annual_id] = [...new Set([...(paidMonths[b.source_annual_id] ?? []), mm])];
    }
    const { data: years } = await supabase.from("annual_years").select("year, archived_at").order("year", { ascending: false });
    const {data:yearBills,error:yearBillsError}=ids.length ? await selectPaymentRows(
      supabase,"finance_bills","expected_cents,paid_cents,paid_date,is_settled,source_period",
      (q:any)=>q.in("source_annual_id",ids).gte("source_period",`${data.year}-01`).lte("source_period",`${data.year}-12`)
    ) : {data:[],error:null};
    if(yearBillsError) throw new Error("Falha ao consultar baixas das Despesas Anuais: "+yearBillsError.message);
    const paidYearBills = (yearBills ?? []).filter((b: any) => b.paid_date);
    const stats = {
      paidCents: paidYearBills.reduce((s: number, b: any) => s + (b.paid_cents ?? 0), 0),
      paidExpected: paidYearBills.reduce((s: number, b: any) => s + (b.is_settled ? b.expected_cents : Math.min(b.expected_cents, b.paid_cents ?? 0)), 0),
    };
    // Nome de apresentação unificado pelo vínculo técnico account_id → credor anual.
    // Não renomeia registros históricos ou muda os valores originais.
    const { data: accountNames, error: accountNamesError } = await (supabase as any)
      .from("finance_account_profiles").select("annual_expense_id,display_name")
      .not("annual_expense_id","is",null);
    if (accountNamesError && !/finance_account_profiles|PGRST205|42P01|schema cache/i.test(accountNamesError.message)) throw new Error("Não foi possível carregar nomes de cartões: " + accountNamesError.message);
    const alias = new Map<string,string>((accountNames ?? []).filter((p: {annual_expense_id:string;display_name:string|null})=>!!p.display_name)
      .map((p: {annual_expense_id:string;display_name:string})=>[p.annual_expense_id,p.display_name]));
    const visibleRows = (rows ?? []).map((row: any) => ({ ...row,
      creditor: alias.get(row.id) || row.creditor,
      creditor_original: row.creditor,
    }));
    return { year: yearRow ?? null, rows: visibleRows, months: months ?? [], paidMonths, years: years ?? [], stats,
      migrationRequired: visibleRows.some((row:any)=>row.expense_kind === undefined || row.expense_source === undefined) };
  });

async function assertYearOpen(supabase: any, year: number) {
  const { data: y } = await supabase.from("annual_years").select("archived_at").eq("year", year).maybeSingle();
  if (y?.archived_at) throw new Error("Exercício arquivado: somente leitura.");
}

export const updateAnnualCell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ expenseId: z.string().uuid(), month: z.number().int().min(1).max(12), expectedCents: z.number().int().min(0).nullable() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: row } = await supabase.from("annual_expenses").select("year, creditor").eq("id", data.expenseId).single();
    if (!row) throw new Error("Credor não encontrado");
    await assertYearOpen(supabase, row.year);
    const { data: before } = await supabase.from("annual_expense_months").select("expected_cents").eq("annual_expense_id", data.expenseId).eq("month", data.month).maybeSingle();
    const { error } = await supabase.from("annual_expense_months").upsert(
      { annual_expense_id: data.expenseId, month: data.month, expected_cents: data.expectedCents },
      { onConflict: "annual_expense_id,month" },
    );
    if (error) throw new Error(error.message);
    await audit(supabase, "update_annual_cell", "annual_expense", data.expenseId, { month: data.month, expected_cents: before?.expected_cents ?? null }, { month: data.month, expected_cents: data.expectedCents }, { creditor: row.creditor, year: row.year });
    return { ok: true };
  });

export const addCreditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ year: z.number().int(), creditor: z.string().trim().min(1).max(100), dueDay: z.number().int().min(1).max(31).nullable(),
      expenseKind: z.enum(["debt", "consumption"]).default("debt"), consumptionValueType: z.enum(["fixed", "variable"]).default("fixed"),
      expenseSource: z.enum(["manual","contract","card","consumption","annual_tax"]).default("manual"),
      annualTaxKind: z.enum(["iptu","ipva","other"]).nullable().default(null),
      sourceContractId: z.string().min(1).max(120).nullable().default(null) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;

    await assertYearOpen(supabase, data.year);
    if ((data.expenseSource === "consumption") !== (data.expenseKind === "consumption")) throw new Error("Classificação inconsistente.");
    if((data.expenseSource==="annual_tax") !== (data.annualTaxKind!==null)) throw new Error("Informe se o tributo anual é IPTU, IPVA ou outro.");
    if (data.expenseSource === "contract" && !data.sourceContractId) throw new Error("Selecione um contrato parcelado.");
    if (data.sourceContractId) {
      const {data:owned,error:ownedError}=await supabase.from("installment_contracts").select("id")
        .eq("user_id",userId).eq("id",data.sourceContractId).maybeSingle();
      if(ownedError || !owned) throw new Error("Contrato não encontrado neste cadastro.");
    }
    const { data: maxPos } = await supabase.from("annual_expenses").select("position").eq("year", data.year).order("position", { ascending: false }).limit(1);
    const position = (maxPos?.[0]?.position ?? -1) + 1;
    const { data: inserted, error } = await supabase.from("annual_expenses")
      .insert({ user_id: userId, year: data.year, creditor: data.creditor, due_day: data.dueDay, position,
        expense_kind: data.expenseKind, consumption_value_type: data.consumptionValueType,
        expense_source:data.expenseSource, annual_tax_kind: data.annualTaxKind,
        source_contract_id: data.expenseSource === "contract" ? data.sourceContractId : null })
      .select("id").single();
    if (error) throw new Error(error.message.includes("annual_expenses_creditor_uniq") ? "Já existe um credor com esse nome neste exercício." : error.message);
    await supabase.from("annual_years").upsert({ user_id: userId, year: data.year }, { onConflict: "user_id,year", ignoreDuplicates: true });
    await audit(supabase, "add_creditor", "annual_expense", inserted.id, null, data);
    return { id: inserted.id as string };
  });

export const updateCreditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ expenseId: z.string().uuid(), creditor: z.string().trim().min(1).max(100), dueDay: z.number().int().min(1).max(31).nullable(),
      expenseKind: z.enum(["debt", "consumption"]).default("debt"), consumptionValueType: z.enum(["fixed", "variable"]).default("fixed"),
      expenseSource: z.enum(["manual","contract","card","consumption","annual_tax"]).default("manual"),
      annualTaxKind: z.enum(["iptu","ipva","other"]).nullable().default(null),
      sourceContractId: z.string().min(1).max(120).nullable().default(null) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const { data: row } = await supabase.from("annual_expenses").select("*").eq("user_id",userId).eq("id", data.expenseId).single();
    if (!row) throw new Error("Credor não encontrado");
    await assertYearOpen(supabase, row.year);
    if((data.expenseSource === "consumption") !== (data.expenseKind === "consumption")) throw new Error("Classificação inconsistente.");
    if((data.expenseSource==="annual_tax") !== (data.annualTaxKind!==null)) throw new Error("Informe se o tributo anual é IPTU, IPVA ou outro.");
    if(data.expenseSource === "contract" && !data.sourceContractId) throw new Error("Selecione o contrato parcelado.");
    if(data.sourceContractId) {
      const {data:owned,error:ownedError}=await supabase.from("installment_contracts").select("id")
        .eq("user_id",userId).eq("id",data.sourceContractId).maybeSingle();
      if(ownedError || !owned) throw new Error("Contrato não encontrado neste cadastro.");
    }
    const { error } = await supabase.from("annual_expenses").update({ creditor: data.creditor, due_day: data.dueDay, expense_kind: data.expenseKind,
      consumption_value_type: data.consumptionValueType, expense_source:data.expenseSource,
      annual_tax_kind:data.annualTaxKind, source_contract_id:data.expenseSource === "contract" ? data.sourceContractId : null,
      updated_at: new Date().toISOString() }).eq("id", data.expenseId).eq("user_id",userId);
    if (error) throw new Error(error.message.includes("annual_expenses_creditor_uniq") ? "Já existe um credor com esse nome neste exercício." : error.message);
    await audit(supabase, "update_creditor", "annual_expense", data.expenseId, row, data);
    return { ok: true };
  });

export const deleteCreditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ expenseId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: row } = await supabase.from("annual_expenses").select("year, creditor").eq("id", data.expenseId).single();
    if (!row) throw new Error("Credor não encontrado");
    await assertYearOpen(supabase, row.year);
    const { count } = await supabase.from("finance_bills").select("id", { count: "exact", head: true }).eq("source_annual_id", data.expenseId);
    if ((count ?? 0) > 0) throw new Error("Este credor já gerou contas mensais e não pode ser excluído (o histórico seria perdido).");
    const { error } = await supabase.from("annual_expenses").delete().eq("id", data.expenseId);
    if (error) throw new Error(error.message);
    await audit(supabase, "delete_creditor", "annual_expense", data.expenseId, row, null);
    return { ok: true };
  });

export const setYearArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ year: z.number().int(), archived: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const { error } = await supabase.from("annual_years").upsert(
      { user_id: userId, year: data.year, archived_at: data.archived ? new Date().toISOString() : null },
      { onConflict: "user_id,year" },
    );
    if (error) throw new Error(error.message);
    await audit(supabase, data.archived ? "archive_year" : "reopen_year", "annual_year", String(data.year), null, { archived: data.archived });
    return { ok: true };
  });

// ================= CONTRATOS / PARCELAS =================

function contractKpis(entries: any[]) {
  const total = entries.reduce((s, e) => s + e.expected_cents, 0);
  const paidEntries = entries.filter((e) => e.paid_date);
  const paid = paidEntries.reduce((s, e) => s + (e.paid_cents ?? 0), 0);
  const remaining = entries.reduce((s, e) => s + expensePaymentAdjustment(e.expected_cents, e.paid_date ? e.paid_cents : null, e.is_settled === true).openCents, 0);
  return {
    total, paid, remaining,
    paidCount: paidEntries.filter(e => e.is_settled === true ||
      (e.is_settled == null && (e.paid_cents ?? 0) >= e.expected_cents)).length,
    count: entries.length,
    pct: entries.length ? (paidEntries.length / entries.length) * 100 : 0,
    firstDue: entries[0]?.due_date ?? null, lastDue: entries[entries.length - 1]?.due_date ?? null,
  };
}

export const getContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ includeArchived: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    let q = supabase.from("installment_contracts").select("*").order("created_at");
    if (!data.includeArchived) q = q.is("archived_at", null);
    const { data: contracts } = await q;
    const {data:entries,error:entryError}=await selectPaymentRows(
      supabase,"installment_entries","contract_id,expected_cents,paid_date,paid_cents,due_date,is_settled",
      (q:any)=>q.order("due_date")
    );
    if(entryError) throw new Error("Falha ao consultar parcelas: "+entryError.message);
    const byContract = new Map<string, any[]>();
    for (const e of entries ?? []) byContract.set(e.contract_id, [...(byContract.get(e.contract_id) ?? []), e]);
    return (contracts ?? []).map((c: any) => ({ ...c, kpis: contractKpis(byContract.get(c.id) ?? []) }));
  });

export const getContractDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ contractId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: contract } = await supabase.from("installment_contracts").select("*").eq("id", data.contractId).single();
    if (!contract) throw new Error("Contrato não encontrado");
    const { data: entries } = await supabase.from("installment_entries").select("*").eq("contract_id", data.contractId).order("number");
    const { data: comments } = await supabase.from("finance_contract_comments").select("*").eq("contract_id", data.contractId).order("created_at");
    return { contract, entries: entries ?? [], comments: comments ?? [], kpis: contractKpis(entries ?? []) };
  });

export const payInstallmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ contractId: z.string(), number: z.number().int(), paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), paidCents: z.number().int().positive(), note: z.string().max(1000).optional(), quits: z.boolean().default(false) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { error } = await supabase.rpc("record_expense_payment", { p_bill_id: null, p_contract_id: data.contractId, p_number: data.number, p_paid_date: data.paidDate, p_paid_cents: data.paidCents, p_note: data.note ?? "", p_is_settled: data.quits, p_revision: false });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviseInstallmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ contractId: z.string(), number: z.number().int(), paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), paidCents: z.number().int().positive(), note: z.string().max(1000).optional(), quits: z.boolean().default(false) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { error } = await supabase.rpc("record_expense_payment", { p_bill_id: null, p_contract_id: data.contractId, p_number: data.number, p_paid_date: data.paidDate, p_paid_cents: data.paidCents, p_note: data.note ?? "", p_is_settled: data.quits, p_revision: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setContractArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ contractId: z.string(), archived: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { error } = await supabase.from("installment_contracts").update({ archived_at: data.archived ? new Date().toISOString() : null }).eq("id", data.contractId);
    if (error) throw new Error(error.message);
    await audit(supabase, data.archived ? "archive_contract" : "reopen_contract", "contract", data.contractId, null, { archived: data.archived });
    return { ok: true };
  });

export const createContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      name: z.string().trim().min(1).max(100), description: z.string().trim().max(500).optional(),
      count: z.number().int().min(1).max(180), firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), totalCents: z.number().int().positive(),
    }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const id = `c-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await supabase.from("installment_contracts").insert({ id, user_id: userId, name: data.name, description: data.description || null });
    if (error) throw new Error(error.message);

    const base = Math.floor(data.totalCents / data.count);
    const rest = data.totalCents - base * data.count;
    const [fy = 0, fm = 1, fd = 1] = data.firstDueDate.split("-").map(Number);
    const entries = Array.from({ length: data.count }, (_, i) => {
      const monthIndex = fm - 1 + i;
      const year = fy + Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      return {
        user_id: userId, contract_id: id, number: i + 1,
        expected_cents: base + (i < rest ? 1 : 0),
        due_date: clampDueDate(year, month, fd),
      };
    });
    const { error: eErr } = await supabase.from("installment_entries").insert(entries);
    if (eErr) throw new Error(eErr.message);
    await audit(supabase, "create_contract", "contract", id, null, { ...data, installments: data.count });
    // Extensão das projeções de consumo não pode invalidar um contrato já criado.
    let forecastWarning: string | null = null;
    let extendedConsumptionMonths = 0;
    try {
      const horizon = Number(entries[entries.length-1]?.due_date.slice(0,4) ?? 0);
      const extended = await extendFixedConsumptionsForNewContract(supabase,userId,horizon);
      extendedConsumptionMonths = extended.extended;
      if(extended.warnings.length) forecastWarning = extended.warnings.join("; ").slice(0,1000);
    } catch(e) {
      forecastWarning = e instanceof Error?e.message:"Falha na projeção automática de consumo.";
    }
    return { id, extendedConsumptionMonths, forecastWarning };
  });

export const addContractComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ contractId: z.string(), text: z.string().trim().min(1).max(1500) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const { data: contract } = await supabase.from("installment_contracts").select("archived_at").eq("id", data.contractId).single();
    if (contract?.archived_at) throw new Error("Contrato arquivado: somente leitura.");
    const { data: user } = await supabase.auth.getUser();
    const author = (user?.user?.user_metadata?.['full_name'] as string) || user?.user?.email || "Titular";
    const { error } = await supabase.from("finance_contract_comments").insert({ user_id: userId, contract_id: data.contractId, text: data.text, author });
    if (error) throw new Error(error.message);
    await audit(supabase, "add_comment", "contract", data.contractId, null, { text: data.text });
    return { ok: true };
  });

// ================= HISTÓRICO =================

export const getHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ year: z.number().int().nullable(), creditor: z.string().nullable() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    let billQ = supabase.from("finance_bills").select("*").not("paid_date", "is", null);
    if (data.creditor) billQ = billQ.eq("creditor", data.creditor);
    const { data: bills } = await billQ;

    const { data: entries } = await supabase.from("installment_entries").select("*").not("paid_date", "is", null);
    const { data: contracts } = await supabase.from("installment_contracts").select("id, name");
    const contractName = new Map((contracts ?? []).map((c: any) => [c.id, c.name]));
    const represented = new Set((bills ?? []).filter((b: any) => b.contract_id).map((b: any) => `${b.contract_id}:${b.installment_number}`));

    const items: any[] = [];
    for (const b of bills ?? []) {
      items.push({
        kind: "bill", id: b.id, creditor: b.creditor, expectedCents: b.expected_cents, dueDate: b.due_date,
        paidDate: b.paid_date, paidCents: b.paid_cents, note: b.paid_note, is_settled: b.is_settled,
        contractId: b.contract_id, installmentNumber: b.installment_number,
      });
    }
    for (const e of entries ?? []) {
      if (represented.has(`${e.contract_id}:${e.number}`)) continue;
      const creditor = contractName.get(e.contract_id) ?? e.contract_id;
      if (data.creditor && creditor !== data.creditor) continue;
      items.push({
        kind: "installment", id: `${e.contract_id}:${e.number}`, creditor, expectedCents: e.expected_cents,
        dueDate: e.due_date, paidDate: e.paid_date, paidCents: e.paid_cents, note: e.note, is_settled: e.is_settled,
        contractId: e.contract_id, installmentNumber: e.number,
      });
    }
    const filtered = data.year ? items.filter((i) => i.dueDate.startsWith(String(data.year))) : items;
    filtered.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    const years = [...new Set(items.map((i) => Number(i.dueDate.slice(0, 4))))].sort((a, b) => b - a);
    const creditors = [...new Set(items.map((i) => i.creditor))].sort();
    return { items: filtered, years, creditors };
  });

// ================= AUDITORIA =================

export const getAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as Ctx;
    const { data } = await supabase.from("audit_log").select("*").order("seq", { ascending: false }).limit(300);
    return { entries: data ?? [] };
  });

// ================= COMPROVANTES =================

const ALLOWED_MIME: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
};
const MAX_ATTACHMENT = 1_250_000;

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

export const uploadAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      entityType: z.enum(["bill", "installment", "contract"]), entityId: z.string().min(1).max(120),
      fileName: z.string().min(1).max(200), mimeType: z.string(), sizeBytes: z.number().int().positive(), dataBase64: z.string(),
    }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    if (data.sizeBytes > MAX_ATTACHMENT) throw new Error("Arquivo maior que 1.250.000 bytes.");
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_ATTACHMENT) throw new Error("Arquivo maior que 1.250.000 bytes.");

    const magic = ALLOWED_MIME[data.mimeType];
    const valid = magic ? magic.every((b, i) => bytes[i] === b) : data.mimeType === "image/webp" && isWebp(bytes);
    if (!valid) throw new Error("Tipo de arquivo não permitido (apenas PDF, JPEG, PNG ou WEBP).");

    const safeName = (data.fileName.split(/[\\/]/).pop() ?? "arquivo").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
    const path = `${userId}/${data.entityType}/${data.entityId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("comprovantes").upload(path, bytes, { contentType: data.mimeType });
    if (upErr) throw new Error(upErr.message);

    const { data: row, error } = await supabase.from("finance_attachments").insert({
      user_id: userId, entity_type: data.entityType, entity_id: data.entityId,
      original_name: data.fileName.split(/[\\/]/).pop() ?? safeName, mime_type: data.mimeType,
      size_bytes: bytes.length, storage_path: path, created_by: userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await audit(supabase, "upload_attachment", data.entityType, data.entityId, null, { file: data.fileName, size: bytes.length });
    return { id: row.id as string };
  });

export const listAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ entityType: z.enum(["bill", "installment", "contract"]), entityId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: rows } = await supabase.from("finance_attachments").select("id, original_name, mime_type, size_bytes, created_at")
      .eq("entity_type", data.entityType).eq("entity_id", data.entityId).order("created_at");
    return { attachments: rows ?? [] };
  });

export const getAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ attachmentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context as Ctx;
    const { data: row } = await supabase.from("finance_attachments").select("storage_path").eq("id", data.attachmentId).single();
    if (!row) throw new Error("Comprovante não encontrado");
    const { data: signed, error } = await supabase.storage.from("comprovantes").createSignedUrl(row.storage_path, 300);
    if (error || !signed) throw new Error("Não foi possível gerar o link do comprovante.");
    return { url: signed.signedUrl };
  });


// Resumo anual: fonte ÚNICA de valores previstos = tabela Despesas Anuais.
// As baixas vêm somente das contas explicitamente vinculadas à linha e competência anual.
// Não soma diretamente contratos, limites de cartão ou contas avulsas.
/**
 * Consumo registrado na competência escolhida no Registro de Pagamento.
 * Independente do resumo anual (que continua restrito ao ano vigente).
 * Não cria lançamentos e não inventa valores para consumo variável.
 */
export const getConsumptionForPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const rows: Array<{ id: string; creditor: string }> = [];
    for (let start = 0; ; start += 1000) {
      const { data: page, error } = await supabase.from("annual_expenses")
        .select("id,creditor").eq("user_id", userId).eq("year", data.year)
        .eq("expense_kind", "consumption").order("position").range(start, start + 999);
      if (error) throw new Error("Falha ao consultar credores de consumo: " + error.message);
      rows.push(...(page ?? []));
      if ((page ?? []).length < 1000) break;
    }
    const cells: Array<{ annual_expense_id: string; expected_cents: number | null }> = [];
    for (let i = 0; i < rows.length; i += 50) {
      const ids = rows.slice(i, i + 50).map(row => row.id);
      const { data: page, error } = await supabase.from("annual_expense_months")
        .select("annual_expense_id,expected_cents")
        .in("annual_expense_id", ids).eq("month", data.month);
      if (error) throw new Error("Falha ao consultar valores de consumo: " + error.message);
      cells.push(...(page ?? []));
    }
    return { year: data.year, month: data.month, ...summarizeConsumptionForPeriod({ rows, cells }) };
  });

export const getAnnualDebtTotals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as Ctx;
    const nowParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric",
    }).formatToParts(new Date());
    const year = Number(nowParts.find(p => p.type === "year")?.value);
    const currentMonth = Number(nowParts.find(p => p.type === "month")?.value);
    if (!Number.isInteger(year) || !Number.isInteger(currentMonth)) {
      throw new Error("Não foi possível identificar o exercício vigente.");
    }

    const rows: any[] = [];
    let migrationRequired = false;
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("annual_expenses")
        .select("id,year,creditor,expense_kind,source_contract_id").eq("user_id", userId).eq("year", year)
        .range(start, start + 999);
      if(error) {
        // O app segue consultável enquanto a migração SQL aguarda aplicação.
        // Sem classificação efetiva não é correto exibir Consumo Apurado/Pago como zero.
        if (!/expense_kind|source_contract_id|PGRST204|42703|schema cache/i.test(error.message))
          throw new Error("Falha ao consultar Despesas Anuais: "+error.message);
        migrationRequired = true;
        const {data:legacy,error:legacyError}=await supabase.from("annual_expenses")
          .select("id,year,creditor").eq("user_id",userId).eq("year",year).range(start,start+999);
        if(legacyError) throw new Error("Falha ao consultar Despesas Anuais: "+legacyError.message);
        rows.push(...(legacy ?? []).map((x:any)=>({...x,expense_kind:"debt",source_contract_id:null})));
        if((legacy??[]).length < 1000) break;
      } else {
        rows.push(...(data??[]));
        if((data??[]).length < 1000) break;
      }
    }

    const cells: any[] = [];
    const payments: any[] = [];
    const ids = rows.map(row => row.id as string);
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      // Paginação integral: dezenas de credores podem ter 12 competências por exercício.
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("annual_expense_months")
          .select("annual_expense_id,month,expected_cents")
          .in("annual_expense_id", chunk).range(from, from + 999);
        if (error) throw new Error("Falha ao consultar competências anuais: " + error.message);
        cells.push(...(data ?? []));
        if ((data ?? []).length < 1000) break;
      }
      for (let from = 0; ; from += 1000) {
        const {data,error}=await selectPaymentRows(
          supabase,"finance_bills","source_annual_id,source_period,paid_cents,paid_date,is_settled",
          (q:any)=>q.eq("user_id",userId).in("source_annual_id",chunk).range(from,from+999)
        );
        if (error) throw new Error("Falha ao consultar pagamentos anuais: " + error.message);
        payments.push(...(data ?? []));
        if ((data ?? []).length < 1000) break;
      }
    }

    // Baixas de parcelas entram exclusivamente quando a parcela estiver ligada
    // a uma linha de Despesas Anuais deste exercício. Não adicionam dívidas avulsas.
    const contractRows = rows.filter(row => !!row.source_contract_id);
    const contractIds = [...new Set(contractRows.map((r:any)=>r.source_contract_id as string))];
    const installments: any[] = [];
    for(let i=0;i<contractIds.length;i+=50) {
      const chunk=contractIds.slice(i,i+50);
      for(let from=0;;from+=1000){
        const {data,error}=await selectPaymentRows(
          supabase,"installment_entries","contract_id,due_date,paid_date,paid_cents,is_settled",
          (q:any)=>q.eq("user_id",userId).in("contract_id",chunk)
            .gte("due_date",`${year}-01-01`).range(from,from+999)
        );
        if(error) throw new Error("Falha ao verificar pagamentos de contratos: "+error.message);
        installments.push(...(data??[]));
        if((data??[]).length<1000)break;
      }
    }
    for(const row of contractRows){
      const months = new Map<number,{paidCents:number; isSettled:boolean}>();
      for(const inst of installments) {
        if(inst.contract_id !== row.source_contract_id || !inst.paid_date) continue;
        const month=Number(inst.due_date.slice(5,7));
        const dueYear=Number(inst.due_date.slice(0,4));
        const periodKey=dueYear*100+month;
        const prev = months.get(periodKey) ?? {paidCents:0,isSettled:true};
        months.set(periodKey,{paidCents:prev.paidCents+Math.max(0,Number(inst.paid_cents)||0),
          isSettled:prev.isSettled && inst.is_settled === true});
      }
      for(const [periodKey,amount] of months){
        const dueYear=Math.floor(periodKey/100);
        if(dueYear!==row.year) continue;
        const month=periodKey%100;
        payments.push({source_annual_id:row.id,source_period:`${dueYear}-${String(month).padStart(2,"0")}`,
          paid_cents:amount.paidCents,paid_date:`${year}-${String(month).padStart(2,"0")}-01`,is_settled:amount.isSettled});
      }
    }
    const currentRows = rows.filter(r => r.year === year);
    const totals=consolidateAnnualDashboard({ year, currentMonth, rows:currentRows, cells, payments });
    return {...totals,migrationRequired};
  });


// Conciliação manual e explícita: nunca inferir duplicidade só por nome ou valor.
// A ligação não modifica a despesa nem o saldo fornecido pelo banco.
export const setCardDebtLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    key: z.string().min(3).max(160).regex(/^(bill|annual|contract):/),
    cardId: z.string().min(1).max(160).nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const [kind, entityId, part] = data.key.split(":");
    if (kind === "bill") {
      const { data: bill, error } = await supabase.from("finance_bills").select("id").eq("user_id", userId).eq("id", entityId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!bill) throw new Error("Despesa não encontrada");
    } else if (kind === "contract") {
      const number = Number(part);
      if (!Number.isInteger(number) || number < 1) throw new Error("Parcela inválida");
      const { data: inst, error } = await supabase.from("installment_entries").select("number").eq("user_id", userId).eq("contract_id", entityId).eq("number", number).maybeSingle();
      if (error) throw new Error(error.message);
      if (!inst) throw new Error("Parcela não encontrada");
    } else if (kind === "annual") {
      const month = Number(part);
      if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Mês inválido");
      const { data: annual, error } = await supabase.from("annual_expenses").select("id").eq("user_id", userId).eq("id", entityId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!annual) throw new Error("Despesa anual não encontrada");
    } else throw new Error("Origem inválida");
    if (data.cardId) {
      const { data: connected, error } = await supabase.from("pluggy_items").select("item_id").eq("user_id", userId);
      if (error) throw new Error(error.message);
      if (!connected?.length) throw new Error("Não há cartões conectados para conciliação");
      // O ID bancário só afeta o total quando também está presente na carteira autenticada.
      const { error: writeError } = await supabase.from("finance_card_debt_links").upsert({
        user_id: userId, liability_key: data.key, card_id: data.cardId, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,liability_key" });
      if (writeError) throw new Error(writeError.message);
    } else {
      const { error } = await supabase.from("finance_card_debt_links").delete()
        .eq("user_id", userId).eq("liability_key", data.key);
      if (error) throw new Error(error.message);
    }
    await audit(supabase, "reconcile_card_debt", "card_debt_link", data.key, null, { cardLinked: Boolean(data.cardId) });
    return { ok: true };
  });


/** Limites manuais são uma sobreposição visível, nunca uma edição na origem Open Finance. */
export const getCardLimitOverrides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as Ctx;
    const { data, error } = await supabase.from("finance_card_limit_overrides")
      .select("account_id,limit_cents,used_cents,updated_at").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ account_id: string; limit_cents: number; used_cents: number; updated_at: string }>;
  });

export const saveCardLimitOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    accountId: z.string().min(1).max(200),
    limitCents: z.number().int().min(0).max(999999999999),
    usedCents: z.number().int().min(0).max(999999999999),
  }).refine(v => v.usedCents <= v.limitCents, "Utilizado não pode ultrapassar o limite.").parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    await assertUserCreditCard(supabase, userId, data.accountId);
    // Apenas cartões de crédito confirmados pelo servidor junto à conexão autorizada.
    // Não remover lançamentos financeiros ao alterar exibição dos limites.
    const { data: previous, error: readError } = await supabase.from("finance_card_limit_overrides")
      .select("limit_cents,used_cents").eq("user_id", userId).eq("account_id", data.accountId).maybeSingle();
    if (readError) throw new Error(readError.message);
    const { error } = await supabase.from("finance_card_limit_overrides").upsert({
      user_id: userId, account_id: data.accountId,
      limit_cents: data.limitCents, used_cents: data.usedCents,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,account_id" });
    if (error) throw new Error(error.message);
    await audit(supabase, "manual_card_limit_override", "finance_card_limit_override", data.accountId, previous ?? null, {
      limit_cents: data.limitCents, used_cents: data.usedCents,
    });
    return { ok: true };
  });

export const clearCardLimitOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accountId: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    await assertUserCreditCard(supabase, userId, data.accountId);
    const { data: previous, error: readError } = await supabase.from("finance_card_limit_overrides")
      .select("limit_cents,used_cents").eq("user_id", userId).eq("account_id", data.accountId).maybeSingle();
    if (readError) throw new Error(readError.message);
    const { error } = await supabase.from("finance_card_limit_overrides").delete()
      .eq("user_id", userId).eq("account_id", data.accountId);
    if (error) throw new Error(error.message);
    await audit(supabase, "clear_card_limit_override", "finance_card_limit_override", data.accountId, previous ?? null, null);
    return { ok: true };
  });
