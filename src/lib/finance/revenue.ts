import type { Database } from '@/integrations/supabase/types';
export type RevenueEntry = Database['public']['Tables']['revenue_entries']['Row'];
export type RevenueContract = Database['public']['Tables']['revenue_contracts']['Row'];
export const REVENUE_CATEGORIES = ['Salário', 'Benefício', 'Crediário', 'Empréstimo Devolvido', 'Renda Extra', 'Doação', 'Outros Rendimentos'] as const;
export function todayBR() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()); }
export function revenueStatus(entry: Pick<RevenueEntry, 'due_date' | 'received_date'>, today: string) {
  if (entry.received_date) return 'Recebido';
  if (entry.due_date < today) return 'Atrasada';
  if (entry.due_date > today) return 'Futuro';
  return 'A Receber';
}
export function revenueSummary(entries: Pick<RevenueEntry, 'expected_cents' | 'received_cents' | 'received_date' | 'due_date'>[], today: string) {
  return entries.reduce((s, e) => ({ expected: s.expected + e.expected_cents, received: s.received + (e.received_cents ?? 0), pending: s.pending + (e.received_date ? 0 : e.expected_cents), overdue: s.overdue + (!e.received_date && e.due_date < today ? e.expected_cents : 0) }), { expected: 0, received: 0, pending: 0, overdue: 0 });
}
export function lateCharges(original: number, due: string, date: string, interest: number, fine: number, correction: number) {
  const days = Math.max(0, Math.round((Date.parse(date) - Date.parse(due)) / 86400000));
  const interestCents = Math.round(original * interest / 100 * days / 30);
  const fineCents = days ? Math.round(original * fine / 100) : 0;
  const correctionCents = days ? Math.round(original * correction / 100) : 0;
  return { days, interestCents, fineCents, correctionCents, total: original + interestCents + fineCents + correctionCents };
}
export function reminderDays(due: string, today: string) { const days = Math.round((Date.parse(due) - Date.parse(today)) / 86400000); return [7, 3, 1].includes(days) ? days : null; }