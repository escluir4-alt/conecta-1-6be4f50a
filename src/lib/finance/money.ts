// Moeda sempre em centavos inteiros; nunca calcular dinheiro com ponto flutuante.

export function formatBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

// "1.359,76" -> 135976. Aceita também "1359,76" e "1359.76". Rejeita mais de 2 casas.
export function parseBRL(input: string): number | null {
  const s = input.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const m = s.match(/^(\d{1,3}(?:\.\d{3})*|\d+)([,.](\d{1,2}))?$/);
  if (!m) return null;
  const reais = parseInt((m[1] ?? "0").replace(/\./g, ""), 10);
  const cents = m[3] ? parseInt(m[3].padEnd(2, "0"), 10) : 0;
  return reais * 100 + cents;
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// Competência "AAAA-MM" a partir de uma data ISO.
export function monthOfDueDate(iso: string): string {
  return iso.slice(0, 7);
}

// Dia de vencimento limitado ao último dia do mês (dia 31 em fevereiro vira 28/29).
export function clampDueDate(year: number, month: number, day: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const d = Math.min(day, last);
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function paymentDifference(expected: number, paid: number): number {
  return paid - expected;
}

// Texto automático quando não há observação manual: em dia / antecipado / atraso + desconto/acréscimo.
export function autoNote(dueDate: string, paidDate: string, expectedCents: number, paidCents: number): string {
  const parts: string[] = [];
  if (paidDate < dueDate) parts.push("Pago com antecedência");
  else if (paidDate > dueDate) parts.push("Pago em atraso");
  else parts.push("Pago em dia");
  const diff = paidCents - expectedCents;
  if (diff < 0) parts.push(`com desconto de ${formatBRL(-diff)}`);
  else if (diff > 0) parts.push(`com acréscimo de ${formatBRL(diff)}`);
  return parts.join(" ");
}

export function displayNote(bill: {
  due_date: string;
  paid_date: string | null;
  expected_cents: number;
  paid_cents: number | null;
  note?: string | null;
  paid_note?: string | null;
}): string {
  const manual = bill.note ?? bill.paid_note;
  if (manual && manual.trim()) return manual;
  if (!bill.paid_date || bill.paid_cents === null) return "—";
  return autoNote(bill.due_date, bill.paid_date, bill.expected_cents, bill.paid_cents);
}

export function diffLabel(expected: number, paid: number | null): string {
  if (paid === null) return "—";
  const diff = paid - expected;
  if (diff === 0) return "—";
  const pct = expected > 0 ? (diff / expected) * 100 : 0;
  const sign = diff > 0 ? "+" : "−";
  return `${sign}${Math.abs(pct).toFixed(2).replace(".", ",")}% (${sign}${formatBRL(Math.abs(diff))})`;
}
