/**
 * Apresentação da coluna "Total anual" da grade Despesas Anuais.
 *
 * Esta rotina não altera células, compromissos ou pagamentos persistidos.
 * Exercício em andamento: valor ainda devido nas competências não quitadas.
 * Exercício encerrado: pagamentos efetivos das competências quitadas.
 * Credor integralmente quitado: total efetivamente pago, inclusive se o exercício
 * ainda estiver em andamento.
 *
 * As despesas continuam armazenadas pelo valor previsto; as cores são apenas
 * representação do estado das baixas, jamais uma substituição do valor original.
 */
export type AnnualCellPayment = {
  paidCents: number;
  isSettled: boolean | null;
  paidDate: string;
};
export type AnnualMonthDisplay = {
  month: number;
  expectedCents: number | null;
  paidCents: number;
  remainingCents: number;
  status: "empty" | "paid" | "pending";
};
export type AnnualCreditorTotal = {
  months: AnnualMonthDisplay[];
  amountCents: number;
  mode: "remaining" | "paid";
  outstandingCents: number;
  paidCents: number;
  hasPending: boolean;
};

const nonNegativeCents = (value: number | null | undefined) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value ?? 0)) : 0;

export function calculateCreditorAnnualColumn(input: {
  months: Array<{month:number; expectedCents:number|null}>;
  payments: Record<number, AnnualCellPayment | undefined>;
  closed: boolean;
}): AnnualCreditorTotal {
  const seen = new Set<number>();
  const months: AnnualMonthDisplay[] = [];
  let outstandingCents = 0;
  let paidCents = 0;
  let hasPending = false;
  let hasCommitments = false;
  for (const cell of input.months) {
    if (!Number.isInteger(cell.month) || cell.month < 1 || cell.month > 12)
      throw new Error("Mês inválido em Despesas Anuais.");
    if (seen.has(cell.month)) throw new Error("Competência duplicada em Despesas Anuais.");
    seen.add(cell.month);

    const expected = cell.expectedCents == null ? null : nonNegativeCents(cell.expectedCents);
    const payment = input.payments[cell.month];
    if (expected == null || expected === 0) {
      months.push({month:cell.month,expectedCents:expected,paidCents:0,remainingCents:0,status:"empty"});
      continue;
    }
    hasCommitments = true;
    const paid = payment?.paidDate ? nonNegativeCents(payment.paidCents) : 0;
    // Um pagamento integral cobre o valor previsto. Pagamento inferior só quita
    // a competência se houver confirmação explícita de quitação com desconto.
    const isPaid = paid > 0 && (payment?.isSettled === true || paid >= expected);
    const remaining = isPaid ? 0 : Math.max(0, expected - Math.min(expected,paid));
    if (!isPaid) hasPending = true;
    if (isPaid) paidCents += paid;
    outstandingCents += remaining;
    months.push({
      month:cell.month, expectedCents:expected, paidCents:paid,
      remainingCents:remaining, status:isPaid?"paid":"pending",
    });
  }
  const mode = input.closed || (hasCommitments && !hasPending) ? "paid" : "remaining";
  return {
    months, amountCents:mode==="paid"?paidCents:outstandingCents,
    mode, outstandingCents, paidCents, hasPending,
  };
}
