export function marketIntent(question: string) {
  if (/\bselic\b/i.test(question)) return { kind: "selic" } as const;
  const tickers = [...new Set(question.toUpperCase().match(/\b[A-Z]{4}[0-9]{1,2}\b/g) ?? [])];
  return tickers.length ? { kind: "stocks", tickers: tickers.slice(0, 5) } as const : null;
}

export const TRIP_CITIES = [
  { name: "Brasília (DF)", lat: -15.7939, lon: -47.8828 },
  { name: "Goiânia (GO)", lat: -16.6869, lon: -49.2648 },
  { name: "Anápolis (GO)", lat: -16.3281, lon: -48.953 },
  { name: "Caldas Novas (GO)", lat: -17.7444, lon: -48.6279 },
  { name: "Pirenópolis (GO)", lat: -15.8525, lon: -48.9596 },
  { name: "Uberlândia (MG)", lat: -18.9146, lon: -48.2754 },
  { name: "Belo Horizonte (MG)", lat: -19.9167, lon: -43.9345 },
  { name: "São Paulo (SP)", lat: -23.5505, lon: -46.6333 },
  { name: "Rio de Janeiro (RJ)", lat: -22.9068, lon: -43.1729 },
] as const;

export function decimalInput(value: string) {
  const t = value.trim();
  if (!/^\d+(?:[,.]\d+)?$/.test(t)) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function tripCost(km: number, kmPerLiter: number, fuelPrice: number, tollCents: number | null) {
  if (![km, kmPerLiter, fuelPrice].every(Number.isFinite) || km <= 0 || kmPerLiter <= 0 || fuelPrice <= 0) return null;
  if (tollCents !== null && (!Number.isSafeInteger(tollCents) || tollCents < 0)) return null;
  const liters = km / kmPerLiter;
  const fuelCents = Math.round(liters * fuelPrice * 100);
  const totalCents = tollCents === null ? null : fuelCents + tollCents;
  if (!Number.isSafeInteger(fuelCents) || (totalCents !== null && !Number.isSafeInteger(totalCents))) return null;
  return { liters, fuelCents, totalCents };
}

export function cheapestTrip(rows: { totalCents: number | null }[]) {
  if (rows.length < 2 || rows.some(r => r.totalCents === null)) return null;
  const cheapest = Math.min(...rows.map(r => r.totalCents!));
  const winners = rows.flatMap((r, i) => r.totalCents === cheapest ? [i] : []);
  return winners.length === 1 ? winners[0]! : null;
}
