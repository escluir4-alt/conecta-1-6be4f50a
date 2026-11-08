// Consolidação global e vitalícia das obrigações (sem filtro de mês/ano).
// Cada obrigação entra uma única vez: parcelas de contrato prevalecem sobre
// espelhos em contas do mês ou despesas anuais vinculadas à mesma parcela.
export type DebtBill = { id: string; creditor: string; due_date: string; expected_cents: number; paid_cents: number | null;
  source_annual_id: string | null; source_period: string | null; contract_id: string | null; installment_number: number | null };
export type DebtInstallment = { contract_id: string; number: number; expected_cents: number; paid_cents: number | null };
export type DebtAnnualMonth = { annual_expense_id: string; month: number; expected_cents: number | null };

export function consolidateGlobalDebt(input: {
  bills: DebtBill[]; annual: Array<{ id: string; year: number }>; annualMonths: DebtAnnualMonth[];
  contractIds: string[]; installments: DebtInstallment[];
}) {
  const paid = (r: { paid_cents?: number | null }) => Math.max(0, Number(r.paid_cents) || 0);
  const amount = (r: { expected_cents?: number | null }) => Math.max(0, Number(r.expected_cents) || 0);
  const contractIds = new Set(input.contractIds);
  const yearOf = new Map(input.annual.map(a => [a.id, a.year]));
  const linkedAnnual = new Map<string, DebtBill>();
  const linkedInstallments = new Map<string, DebtBill>();
  for (const bill of input.bills) {
    if (bill.source_annual_id && bill.source_period) {
      const key = `${bill.source_annual_id}:${bill.source_period}`;
      if (linkedAnnual.has(key)) throw new Error(`Há contas anuais duplicadas para ${key}. Revise os lançamentos antes de consolidar.`);
      linkedAnnual.set(key, bill);
    }
    if (bill.contract_id && bill.installment_number != null) {
      const key = `${bill.contract_id}:${bill.installment_number}`;
      if (linkedInstallments.has(key)) throw new Error(`Há parcelas duplicadas para ${key}. Revise os lançamentos antes de consolidar.`);
      linkedInstallments.set(key, bill);
    }
  }
  const candidates: Array<{ key: string; label: string; open: number }> = [];
  let total = 0, totalPaid = 0, standalone = 0, contractsTotal = 0, annualTotal = 0;
  const installmentKeys = new Set<string>();
  for (const entry of input.installments) {
    if (!contractIds.has(entry.contract_id)) continue;
    const key = `${entry.contract_id}:${entry.number}`;
    if (installmentKeys.has(key)) continue;
    installmentKeys.add(key);
    const value = amount(entry);
    total += value; contractsTotal += value;
    const settled = Math.max(paid(entry), paid(linkedInstallments.get(key) ?? {}));
    totalPaid += settled;
    const open = Math.max(0, value - settled);
    if (open > 0) candidates.push({ key: `contract:${key}`, label: `Contrato ${entry.contract_id} · Parcela ${entry.number}`, open });
  }
  const annualCells = new Set<string>();
  for (const cell of input.annualMonths) {
    const year = yearOf.get(cell.annual_expense_id);
    if (year == null) continue;
    const period = `${year}-${String(cell.month).padStart(2, "0")}`;
    const bill = linkedAnnual.get(`${cell.annual_expense_id}:${period}`);
    annualCells.add(`${cell.annual_expense_id}:${period}`);
    if (bill?.contract_id && installmentKeys.has(`${bill.contract_id}:${bill.installment_number}`)) continue;
    const value = amount(cell);
    total += value; annualTotal += value;
    const settled = paid(bill ?? {});
    totalPaid += settled;
    const open = Math.max(0, value - settled);
    if (open > 0) candidates.push({ key: `annual:${cell.annual_expense_id}:${cell.month}`, label: `Despesa anual ${year} · Mês ${cell.month} · ${bill?.creditor ?? cell.annual_expense_id}`, open });
  }
  for (const bill of input.bills) {
    if (bill.contract_id && installmentKeys.has(`${bill.contract_id}:${bill.installment_number}`)) continue;
    if (bill.source_annual_id && annualCells.has(`${bill.source_annual_id}:${bill.source_period}`)) continue;
    total += amount(bill); totalPaid += paid(bill); standalone += amount(bill);
    const open = Math.max(0, amount(bill) - paid(bill));
    if (open > 0) candidates.push({ key: `bill:${bill.id}`, label: `${bill.creditor} · ${bill.due_date}`, open });
  }
  return { expected: total, paid: totalPaid, open: Math.max(0, total - totalPaid),
    contracts: contractsTotal, annual: annualTotal, standalone, candidates };
}

/** Indicadores do topo do painel: globais, cartões somados só pelo saldo não conciliado. */
export function globalPanelIndicators(debt: { expected: number; paid: number }, cardUsed: number, overlap: number) {
  const total = Math.max(0, debt.expected + Math.max(0, cardUsed - overlap));
  const open = Math.max(0, total - debt.paid);
  const pct = total > 0 ? Math.min(100, Math.round((debt.paid / total) * 100)) : 0;
  return { total, paid: debt.paid, open, pct };
}
