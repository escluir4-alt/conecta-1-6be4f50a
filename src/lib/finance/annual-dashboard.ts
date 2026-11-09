/**
 * Painel Financeiro — fonte única: Despesas Anuais.
 * Os valores previstos vêm exclusivamente de annual_expense_months do exercício;
 * finance_bills fornece SOMENTE a baixa vinculada explicitamente à célula anual.
 * Nunca incorpora diretamente saldos de cartões, contratos ou contas avulsas.
 */
export type AnnualDashboardRow = {
  id: string; year: number; expense_kind?: "debt" | "consumption" | null;
};
export type AnnualDashboardCell = {
  annual_expense_id: string; month: number; expected_cents: number | null;
};
export type AnnualDashboardPayment = {
  source_annual_id: string | null; source_period: string | null;
  paid_cents: number | null; paid_date: string | null;
};
export type AnnualDashboardTotals = {
  year: number; currentMonth: number; expected: number; paid: number;
  open: number; pct: number;
  consumption: { apurado: number; pago: number; month: number };
};

const cents = (value: number | null | undefined) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value ?? 0)) : 0;

export function consolidateAnnualDashboard(input: {
  year: number; currentMonth: number; rows: AnnualDashboardRow[];
  cells: AnnualDashboardCell[]; payments: AnnualDashboardPayment[];
}): AnnualDashboardTotals {
  const { year } = input;
  const currentMonth = Math.max(1, Math.min(12, Math.trunc(input.currentMonth)));
  const kinds = new Map(
    input.rows.filter(row => row.year === year).map(row => [row.id, row.expense_kind ?? "debt"]),
  );
  const payments = new Map<string, number>();
  for (const payment of input.payments) {
    if (!payment.source_annual_id || !payment.source_period ||
        !kinds.has(payment.source_annual_id)) continue;
    const key = `${payment.source_annual_id}:${payment.source_period}`;
    // A ligação anual deve ser única; se houver espelhos repetidos, não somar pagamentos em duplicidade.
    payments.set(key, Math.max(payments.get(key) ?? 0, cents(payment.paid_cents)));
  }

  let expected = 0, paid = 0, apurado = 0, consumoPago = 0, consumoMes = 0;
  const seen = new Set<string>();
  for (const cell of input.cells) {
    const kind = kinds.get(cell.annual_expense_id);
    if (!kind || !Number.isInteger(cell.month) || cell.month < 1 || cell.month > 12) continue;
    const period = `${year}-${String(cell.month).padStart(2, "0")}`;
    const key = `${cell.annual_expense_id}:${period}`;
    if (seen.has(key)) throw new Error(`Competência anual duplicada: ${key}`);
    seen.add(key);
    const value = cents(cell.expected_cents);
    const settled = payments.get(key) ?? 0;
    if (kind === "consumption") {
      // Futuros permanecem projeções. Consumo do mês usa a célula do exercício vigente.
      if (cell.month <= currentMonth || settled > 0) apurado += value;
      consumoPago += settled;
      if (cell.month === currentMonth) consumoMes += value;
    } else {
      expected += value;
      // Encargos excedentes não reduzem o principal além do valor devido da competência.
      paid += Math.min(value, settled);
    }
  }

  const open = Math.max(0, expected - paid);
  const pct = expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) : 0;
  return {
    year, currentMonth, expected, paid, open, pct,
    consumption: { apurado, pago: consumoPago, month: consumoMes },
  };
}
