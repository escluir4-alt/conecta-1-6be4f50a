export type CardDebtCandidate = { key: string; open: number };
export type CardDebtLink = { liability_key: string; card_id: string };
export type CardDebtBalance = { id: string; usedCents: number };

/**
 * Conciliação de passivos explicitamente vinculados ao saldo usado do cartão.
 * O mesmo consumo é contabilizado uma única vez, sem alterar lançamentos originais.
 * Todos os valores são centavos; o desconto nunca supera o saldo utilizado do cartão.
 */
export function calculateCardDebtOverlap(
  candidates: CardDebtCandidate[],
  links: CardDebtLink[],
  cards: CardDebtBalance[],
) {
  const outstanding = new Map(candidates.map(c => [c.key, Math.max(0, Math.round(c.open))]));
  const byCard = new Map<string, number>();
  const linked = new Set<string>();
  for (const link of links) {
    if (linked.has(link.liability_key)) continue;
    linked.add(link.liability_key);
    const amount = outstanding.get(link.liability_key) ?? 0;
    if (amount <= 0) continue;
    byCard.set(link.card_id, (byCard.get(link.card_id) ?? 0) + amount);
  }
  const details = cards.map(card => ({
    id: card.id,
    used: Math.max(0, Math.round(card.usedCents)),
    overlap: Math.min(Math.max(0, Math.round(card.usedCents)), byCard.get(card.id) ?? 0),
  }));
  return {
    overlap: details.reduce((sum, card) => sum + card.overlap, 0),
    details,
    unmatchedLinked: links.filter(link => !cards.some(card => card.id === link.card_id)).length,
  };
}
