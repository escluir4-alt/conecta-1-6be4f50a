/** Projeções puras, em centavos, sem duplicar ou modificar competências já cadastradas. */
export type ProjectedEntry = { due_date: string; expected_cents: number; paid_cents?: number | null };
export type MonthlyProjection = { year: number; month: number; expected_cents: number };

export function contractProjection(entries: ProjectedEntry[], fromYear: number, maxYear = 2100): MonthlyProjection[] {
  if (!Number.isInteger(fromYear) || !Number.isInteger(maxYear) || maxYear < fromYear) return [];
  const byPeriod = new Map<string, MonthlyProjection>();
  for (const entry of entries) {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(entry.due_date)) continue;
    const year = Number(entry.due_date.slice(0, 4));
    const month = Number(entry.due_date.slice(5, 7));
    if (year < fromYear || year > maxYear) continue;
    const amount = Number(entry.expected_cents);
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Parcela inválida no contrato.");
    const key = `${year}-${month}`;
    const prev = byPeriod.get(key);
    byPeriod.set(key, { year, month, expected_cents: (prev?.expected_cents ?? 0) + amount });
  }
  return [...byPeriod.values()].sort((a,b)=>a.year-b.year || a.month-b.month);
}

export function fixedConsumptionProjection(fromYear: number, throughYear: number, cents: number): MonthlyProjection[] {
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error("Informe um valor mensal fixo válido.");
  if (!Number.isInteger(fromYear) || !Number.isInteger(throughYear) || throughYear < fromYear || throughYear > 2100)
    throw new Error("Horizonte inválido para consumo fixo.");
  return Array.from({ length: (throughYear - fromYear + 1) * 12 }, (_, i) => ({
    year: fromYear + Math.floor(i / 12), month: 1 + i % 12, expected_cents: cents,
  }));
}

/** Somente células inexistentes podem ser geradas; null/zero e histórico são intencionais. */
export function missingProjections(projected: MonthlyProjection[], existing: Array<{ year: number; month: number }>) {
  const taken = new Set(existing.map(cell => `${cell.year}:${cell.month}`));
  return projected.filter(cell => !taken.has(`${cell.year}:${cell.month}`));
}
