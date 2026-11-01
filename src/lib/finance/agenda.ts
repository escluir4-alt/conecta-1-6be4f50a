import Holidays from 'date-holidays';

export type AgendaItem = {
  id: string;
  date: string;
  title: string;
  kind: 'feriado' | 'vencimento' | 'pagamento' | 'recebimento';
  detail?: string | undefined;
  done?: boolean;
};

// DF Law 72/1989 includes Corpus Christi; administrative optional leave is separate.
export function brasiliaHolidays(year: number): AgendaItem[] {
  const calendar = new Holidays('BR', 'DF', { languages: 'pt' });
  return calendar.getHolidays(year).filter(h => h.type === 'public' || h.name === 'Corpo de Deus').map(h => ({
    id: `holiday:${h.date}:${h.name}`,
    date: h.date.slice(0, 10),
    title: h.date.slice(5, 10) === '04-21' ? 'Tiradentes · Aniversário de Brasília' : h.name === 'Corpo de Deus' ? 'Corpus Christi' : h.name,
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
type ExpenseBill = { id: string; due_date: string; creditor: string; paid_date: string | null; description?: string | null; source_annual_id?: string | null; source_period?: string | null; contract_id?: string | null; installment_number?: number | null };
type Payment = { id: string; paidDate: string; creditor: string; note?: string | null };

export function financialAgendaItems(month: string, revenues: RevenueEntry[], bills: ExpenseBill[], _payments: Payment[] = []): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const r of revenues) {
    items.push({ id: `revenue:${r.id}`, date: r.received_date ?? r.due_date, title: r.title, kind: 'pagamento', detail: r.note || undefined, done: Boolean(r.received_date) });
  }
  const seen = new Set<string>();
  for (const b of bills) {
    const key = b.source_annual_id ? `annual:${b.source_annual_id}:${b.source_period ?? b.due_date}` : b.contract_id ? `contract:${b.contract_id}:${b.installment_number ?? b.due_date}` : b.id;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ id: `due:b:${b.id}`, date: b.due_date, title: b.creditor, kind: 'vencimento', detail: b.description && !/^Despesa (anual|do mês|mensal)/i.test(b.description) ? b.description : undefined, done: Boolean(b.paid_date) });
  }
  return items.filter(i => i.date.startsWith(month));
}