import Holidays from 'date-holidays';

export type AgendaItem = {
  id: string;
  date: string;
  title: string;
  kind: 'feriado' | 'vencimento' | 'pagamento' | 'recebimento';
  detail?: string | undefined;
  done?: boolean;
};

// Only legally public holidays are painted red; optional days are not holidays.
export function brasiliaHolidays(year: number): AgendaItem[] {
  const calendar = new Holidays('BR', 'DF', { languages: 'pt' });
  return calendar.getHolidays(year).filter(h => h.type === 'public').map(h => ({
    id: `holiday:${h.date}:${h.name}`,
    date: h.date.slice(0, 10),
    title: h.date.slice(5, 10) === '04-21' ? 'Tiradentes · Aniversário de Brasília' : h.name,
    kind: 'feriado',
  }));
}

export function orderAgendaDays(dates: string[], today: string): string[] {
  return [...new Set(dates)].sort((a, b) => {
    const aPast = a < today;
    const bPast = b < today;
    return Number(aPast) - Number(bPast) || a.localeCompare(b);
  });
}

type RevenueEntry = { id: string; due_date: string; title: string; received_date: string | null; note?: string | null };
type ExpenseBill = { id: string; due_date: string; creditor: string; paid_date: string | null; description?: string | null };
type Payment = { id: string; paidDate: string; creditor: string; note?: string | null };

export function financialAgendaItems(month: string, revenues: RevenueEntry[], bills: ExpenseBill[], payments: Payment[]): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const r of revenues) {
    items.push({ id: `due:r:${r.id}`, date: r.due_date, title: r.title, kind: 'vencimento', detail: 'Receita a receber', done: Boolean(r.received_date) });
    if (r.received_date) items.push({ id: `received:${r.id}`, date: r.received_date, title: r.title, kind: 'recebimento', detail: r.note ?? undefined, done: true });
  }
  for (const b of bills) items.push({ id: `due:b:${b.id}`, date: b.due_date, title: b.creditor, kind: 'vencimento', detail: b.description ?? 'Despesa a pagar', done: Boolean(b.paid_date) });
  for (const p of payments) items.push({ id: `paid:${p.id}`, date: p.paidDate, title: p.creditor, kind: 'pagamento', detail: p.note ?? undefined, done: true });
  return items.filter(i => i.date.startsWith(month));
}