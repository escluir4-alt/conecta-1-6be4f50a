/**
 * Série mensal oficial: somente competências anteriores ao mês de pagamento
 * compõem a atualização contratual. Uma competência ausente NÃO equivale a 0%.
 */
export type MonthlyCorrectionIndex = { month: string; rate: number };

export function correctionReferenceMonths(dueDate: string, paymentDate: string): string[] {
  if (dueDate >= paymentDate) return [];
  const result: string[] = [];
  let year = Number(dueDate.slice(0, 4));
  let month = Number(dueDate.slice(5, 7));
  const paymentMonth = paymentDate.slice(0, 7);
  while (`${year}-${String(month).padStart(2, '0')}` < paymentMonth) {
    result.push(`${year}-${String(month).padStart(2, '0')}`);
    if (result.length > 120) throw new Error('Período de correção superior a dez anos.');
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return result;
}

export function calculateIndexCorrection(dueDate: string, paymentDate: string, observations: MonthlyCorrectionIndex[]) {
  const byMonth = new Map(observations.map(observation => [observation.month, observation.rate]));
  const months: MonthlyCorrectionIndex[] = [];
  const missing: string[] = [];
  for (const month of correctionReferenceMonths(dueDate, paymentDate)) {
    const rate = byMonth.get(month);
    if (rate === undefined) missing.push(month);
    else months.push({ month, rate });
  }
  const rate = (months.reduce((factor, observation) => factor * (1 + observation.rate / 100), 1) - 1) * 100;
  return { rate, months, missing };
}
