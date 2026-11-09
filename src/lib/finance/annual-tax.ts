/** IPTU, IPVA e tributos semelhantes: lançamentos pontuais por exercício, não consumo recorrente. */
export type TaxMonth = { month: number; expected_cents: number };

export function annualTaxSchedule(input: {
  totalCents: number;
  firstMonth: number;
  installments: number;
}): TaxMonth[] {
  const { totalCents, firstMonth, installments } = input;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error("Informe o valor anual do tributo em reais.");
  }
  if (!Number.isInteger(firstMonth) || firstMonth < 1 || firstMonth > 12) {
    throw new Error("O mês inicial do tributo deve estar entre janeiro e dezembro.");
  }
  if (!Number.isInteger(installments) || installments < 1 || installments > 12 ||
      firstMonth + installments - 1 > 12) {
    throw new Error("O parcelamento precisa terminar no exercício selecionado.");
  }
  const base = Math.floor(totalCents / installments);
  const remainder = totalCents % installments;
  return Array.from({ length: installments }, (_, i) => ({
    month: firstMonth + i,
    expected_cents: base + (i < remainder ? 1 : 0),
  }));
}

/** Sem valores inventados para anos posteriores; cada exercício precisa de lançamento próprio. */
export function annualTaxNeedsReview(priorYear: number, currentYear: number) {
  return currentYear > priorYear;
}
