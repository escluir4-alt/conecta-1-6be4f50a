import { addDays, addMonths, addYears, differenceInCalendarDays, format, parseISO } from 'date-fns';

export const AGENDA_KINDS = { birthday: 'Aniversário', work: 'Trabalho', appointment: 'Compromisso', event: 'Evento', tasks: 'Lista de atividades', shopping: 'Lista de compras' } as const;
export type PersonalKind = keyof typeof AGENDA_KINDS;
export type ListItem = { key: string; description: string; quantity: number; cents: number };
export type PersonalRecord = { id: string; kind: PersonalKind; title: string; start_date: string; time: string; description: string; recurrence: string; favorite: boolean; reminder: boolean; items: ListItem[] };
export type PersonalOccurrence = { id: string; date: string; title: string; kind: 'personal'; record: PersonalRecord; reminderDays?: number };
export function reminderOffsets(favorite: boolean, reminder: boolean) { return reminder ? favorite ? [15, 7, 3, 1, 0] : [0] : []; }
export function occursOn(record: PersonalRecord, day: string): boolean {
  if (day < record.start_date) return false;
  const start = parseISO(record.start_date), target = parseISO(day);
  const diff = differenceInCalendarDays(target, start);
  if (record.recurrence === 'daily') return true;
  if (record.recurrence === '12x36') return diff % 2 === 0;
  if (record.recurrence === 'weekly') return diff % 7 === 0;
  if (record.recurrence === 'monthly') return format(addMonths(start, (target.getFullYear() - start.getFullYear()) * 12 + target.getMonth() - start.getMonth()), 'yyyy-MM-dd') === day;
  if (record.recurrence === 'yearly') return format(addYears(start, target.getFullYear() - start.getFullYear()), 'yyyy-MM-dd') === day;
  return record.start_date === day;
}
export function personalOccurrences(month: string, records: PersonalRecord[]): PersonalOccurrence[] {
  const result: PersonalOccurrence[] = [];
  for (let day = parseISO(`${month}-01`); format(day, 'yyyy-MM') === month; day = addDays(day, 1)) {
    const date = format(day, 'yyyy-MM-dd');
    for (const record of records) {
      if (occursOn(record, date)) result.push({ id: `${record.id}:${date}`, date, title: record.title, kind: 'personal', record });
      for (const offset of reminderOffsets(record.favorite, record.reminder).filter(n => n > 0)) {
        if (occursOn(record, format(addDays(day, offset), 'yyyy-MM-dd'))) result.push({ id: `${record.id}:${date}:reminder:${offset}`, date, title: record.title, kind: 'personal', record, reminderDays: offset });
      }
    }
  }
  return result;
}