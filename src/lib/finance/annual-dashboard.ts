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
  paid_cents: number | null; paid_date: string | null; is_settled?: boolean | null;
};
export type AnnualDashboardTotals = {
  year: number; currentMonth: number; expected: number; paid: number;
  open: number; pct: number;
  consumption: { apurado: number; pago: number; month: number };
  consumptionTrend: Array<{month:number;apurado:number;pago:number}>;
};

const cents = (value: number | null | undefined) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
};

export function consolidateAnnualDashboard(input: {
  year: number; currentMonth: number; rows: AnnualDashboardRow[];
  cells: AnnualDashboardCell[]; payments: AnnualDashboardPayment[];
}): AnnualDashboardTotals {
  const { year } = input;
  const currentMonth = Math.max(1, Math.min(12, Math.trunc(input.currentMonth)));
  const kinds = new Map(
    input.rows.filter(row => row.year === year).map(row => [row.id, row.expense_kind ?? "debt"]),
  );
  const payments = new Map<string, { paid: number; settled: boolean }>();
  for (const payment of input.payments) {
    if (!payment.source_annual_id || !payment.source_period || !payment.paid_date ||
        !kinds.has(payment.source_annual_id)) continue;
    const key = `${payment.source_annual_id}:${payment.source_period}`;
    // A ligação anual deve ser única; se houver espelhos repetidos, não somar pagamentos em duplicidade.
    const amount = cents(payment.paid_cents);
    const previous = payments.get(key);
    payments.set(key, {
      paid: Math.max(previous?.paid ?? 0, amount),
      // Em lançamentos espelhados, qualquer quitação confirmada é suficiente.
      settled: Boolean(previous?.settled || payment.is_settled === true),
    });
  }

  let expected = 0, paid = 0, covered = 0, apurado = 0, consumoPago = 0, consumoMes = 0;
  const consumptionTrend = Array.from({length:12},(_,i)=>({month:i+1,apurado:0,pago:0}));
  const seen = new Set<string>();
  for (const cell of input.cells) {
    const kind = kinds.get(cell.annual_expense_id);
    if (!kind || !Number.isInteger(cell.month) || cell.month < 1 || cell.month > 12) continue;
    const period = `${year}-${String(cell.month).padStart(2, "0")}`;
    const key = `${cell.annual_expense_id}:${period}`;
    if (seen.has(key)) throw new Error(`Competência anual duplicada: ${key}`);
    seen.add(key);
    const value = cents(cell.expected_cents);
    const payment = payments.get(key);
    const paidAmount = payment?.paid ?? 0;
    const fullyCovered = payment?.settled === true || (paidAmount >= value && !payment?.settled);
    const credited = fullyCovered ? value : Math.min(value, paidAmount);
    if (kind === "consumption") {
      // Futuros permanecem projeções. Consumo do mês usa a célula do exercício vigente.
      if (cell.month <= currentMonth || paidAmount > 0) apurado += value;
      consumoPago += paidAmount;
      const point = consumptionTrend[cell.month-1]!;
      if (cell.month <= currentMonth || paidAmount > 0) point.apurado += value;
      point.pago += paidAmount;
      if (cell.month === currentMonth) consumoMes += value;
    } else {
      expected += value;
      // Encargos excedentes não reduzem o principal além do valor devido da competência.
      paid += Math.min(value, paidAmount);
      covered += credited;
    }
  }

  const open = Math.max(0, expected - covered);
  const pct = expected > 0 ? Math.min(100, covered >= expected ? 100 : Math.floor((covered / expected) * 100)) : 0;
  return {
    year, currentMonth, expected, paid, open, pct,
    consumption: { apurado, pago: consumoPago, month: consumoMes }, consumptionTrend,
  };
}


/**
 * Indicador mensal do Registro de Pagamento.
 * Fonte exclusiva: credores classificados como consumo e células do mês/ano selecionado.
 * Valores ausentes ou zero não são substituídos por médias ou projeções fictícias.
 */
export function summarizeConsumptionForPeriod(input: {
  rows: Array<{ id: string; creditor: string }>;
  cells: Array<{ annual_expense_id: string; expected_cents: number | null }>;
}): { total: number; missing: string[]; creditorCount: number } {
  const known = new Set(input.rows.map(row => row.id));
  const amounts = new Map<string, number>();
  for (const cell of input.cells) {
    if (!known.has(cell.annual_expense_id)) continue;
    if (amounts.has(cell.annual_expense_id)) {
      throw new Error(`Competência de consumo duplicada: ${cell.annual_expense_id}`);
    }
    amounts.set(cell.annual_expense_id, cents(cell.expected_cents));
  }
  const missing: string[] = [];
  let total = 0;
  for (const row of input.rows) {
    const value = amounts.get(row.id) ?? 0;
    total += value;
    if (value === 0) missing.push(row.creditor);
  }
  return { total, missing, creditorCount: input.rows.length };
}


export type OpenCommitmentRow = AnnualDashboardRow & {
  creditor: string; source_contract_id?: string | null; expense_source?: string | null;
};
export type OpenCommitmentTotals = {
  expected: number; paid: number; open: number; pct: number; active: number;
  yearly: Array<{ year: number; expected: number; paid: number; open: number }>;
};

/**
 * Carteira de obrigações ATIVAS, não histórico de pagamentos.
 * Credores quitados inteiramente são excluídos de TODOS os indicadores.
 * O contrato vinculado é a identidade preferencial para agrupar exercícios.
 */
export function consolidateOpenCommitments(input: {
  currentYear: number;
  rows: OpenCommitmentRow[];
  cells: AnnualDashboardCell[];
  payments: AnnualDashboardPayment[];
  archivedYears?: number[];
  archivedContracts?: string[];
}): OpenCommitmentTotals {
  const archivedYears = new Set(input.archivedYears ?? []);
  const archivedContracts = new Set(input.archivedContracts ?? []);
  const currentNames = new Set(input.rows
    .filter(r => r.year === input.currentYear && r.expense_kind !== "consumption" &&
      !archivedYears.has(r.year) && (!r.source_contract_id || !archivedContracts.has(r.source_contract_id)))
    .map(r => r.creditor.trim().toLocaleLowerCase("pt-BR")));
  const selected = input.rows.filter(r =>
    r.year >= input.currentYear && !archivedYears.has(r.year) &&
    r.expense_kind !== "consumption" &&
    (!r.source_contract_id || !archivedContracts.has(r.source_contract_id)) &&
    (currentNames.has(r.creditor.trim().toLocaleLowerCase("pt-BR")) ||
      (r.source_contract_id != null && input.rows.some(a =>
        a.year === input.currentYear && a.source_contract_id === r.source_contract_id))));
  const rowById = new Map(selected.map(r => [r.id, r]));
  const paidByCell = new Map<string, { paid: number; settled: boolean; explicitUnconfirmed: boolean }>();
  for (const p of input.payments) {
    if (!p.source_annual_id || !p.source_period || !p.paid_date ||
        !rowById.has(p.source_annual_id)) continue;
    const key = `${p.source_annual_id}:${p.source_period}`;
    const previous = paidByCell.get(key);
    paidByCell.set(key, {
      paid: Math.max(previous?.paid ?? 0, cents(p.paid_cents)),
      settled: Boolean(previous?.settled || p.is_settled === true),
      explicitUnconfirmed: Boolean(previous?.explicitUnconfirmed || p.is_settled === false),
    });
  }
  const groups = new Map<string, { expected: number; paid: number; covered: number; unconfirmed: boolean; yearly: Map<number, {expected:number;paid:number;covered:number}> }>();
  const seen = new Set<string>();
  for (const cell of input.cells) {
    const row = rowById.get(cell.annual_expense_id);
    if (!row || cell.month < 1 || cell.month > 12) continue;
    const key = `${row.id}:${row.year}-${String(cell.month).padStart(2,"0")}`;
    if (seen.has(key)) throw new Error(`Competência anual duplicada: ${key}`);
    seen.add(key);
    const groupId = row.source_contract_id
      ? `contract:${row.source_contract_id}`
      : `creditor:${row.creditor.trim().toLocaleLowerCase("pt-BR")}`;
    const group = groups.get(groupId) ?? { expected: 0, paid: 0, covered: 0, unconfirmed: false, yearly: new Map() };
    const expected = cents(cell.expected_cents);
    const payment = paidByCell.get(key);
    const paid = Math.min(expected, payment?.paid ?? 0);
    const complete = payment?.settled === true || (payment?.explicitUnconfirmed !== true && paid >= expected);
    const covered = complete ? expected : paid;
    group.expected += expected;
    group.paid += paid;
    group.covered += covered;
    if (payment?.explicitUnconfirmed === true && !payment.settled) group.unconfirmed = true;
    const year = group.yearly.get(row.year) ?? {expected:0,paid:0,covered:0};
    year.expected += expected;
    year.paid += paid;
    year.covered += covered;
    group.yearly.set(row.year, year);
    groups.set(groupId, group);
  }
  const yearly = new Map<number, {expected:number;paid:number;open:number}>();
  let expected = 0, paid = 0, covered = 0, active = 0;
  for (const group of groups.values()) {
    if (group.expected <= 0 || (group.covered >= group.expected && !group.unconfirmed)) continue;
    active++;
    expected += group.expected;
    paid += group.paid;
    covered += group.covered;
    for (const [year, item] of group.yearly) {
      const prev = yearly.get(year) ?? {expected:0,paid:0,open:0};
      prev.expected += item.expected;
      prev.paid += item.paid;
      prev.open += Math.max(0,item.expected-item.covered);
      yearly.set(year,prev);
    }
  }
  const open = Math.max(0,expected-covered);
  return {
    expected, paid, open, active,
    pct: expected > 0 ? (covered >= expected ? 100 : Math.floor(100*covered/expected)) : 0,
    yearly: [...yearly.entries()].sort((a,b)=>a[0]-b[0])
      .map(([year,v])=>({year,...v})),
  };
}
