import { describe, expect, it } from 'vitest';
import { brasiliaHolidays, financialAgendaItems, orderAgendaDays } from '@/lib/finance/agenda';

describe('Agenda de Brasília', () => {
  it('inclui Dia do Evangélico em 30/11', () => {
    expect(brasiliaHolidays(2026)).toContainEqual({ id: 'holiday:2026-11-30 00:00:00:Dia do Evangélico', date: '2026-11-30', title: 'Dia do Evangélico', kind: 'feriado' });
  });
  it('inclui feriados nacionais e o aniversário de Brasília', () => {
    const days = brasiliaHolidays(2026);
    expect(days.find(h => h.date === '2026-04-21')?.title).toBe('Tiradentes · Aniversário de Brasília');
    expect(days.find(h => h.date === '2026-11-20')?.kind).toBe('feriado');
  });
  it('calcula feriados móveis e não confunde ponto facultativo com feriado', () => {
    expect(brasiliaHolidays(2026).some(h => h.date === '2026-04-03')).toBe(true);
    expect(brasiliaHolidays(2026).some(h => h.date === '2026-02-17')).toBe(false);
  });
  it('inclui Corpus Christi como feriado local previsto na lei do DF', () => {
    expect(brasiliaHolidays(2026).find(h => h.date === '2026-06-04')?.title).toBe('Corpus Christi');
  });
  it('ordena presente, futuro e passado: 17, 18…30, 01…16', () => {
    const dates = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    expect(orderAgendaDays(dates, '2026-11-17')).toEqual([...dates.slice(16), ...dates.slice(0, 16)]);
  });
  it('mantém ordem cronológica em meses futuros e passados', () => {
    expect(orderAgendaDays(['2026-12-18', '2026-12-01'], '2026-11-17')).toEqual(['2026-12-01', '2026-12-18']);
    expect(orderAgendaDays(['2026-10-18', '2026-10-01'], '2026-11-17')).toEqual(['2026-10-01', '2026-10-18']);
  });
  it('mostra pagamentos no dia efetivo mesmo com vencimento em outro mês', () => {
    expect(financialAgendaItems('2026-11', [], [], [{ id: 'p1', creditor: 'Conta', paidDate: '2026-11-17', note: 'Pago' }])).toEqual([{ id: 'paid:p1', date: '2026-11-17', title: 'Conta', kind: 'pagamento', detail: 'Pago', done: true }]);
  });
  it('preserva vencimento e recebimento em dias diferentes', () => {
    expect(financialAgendaItems('2026-11', [{ id: 'r1', title: 'Salário', due_date: '2026-11-01', received_date: '2026-11-02' }], [], []).map(i => [i.date, i.kind])).toEqual([['2026-11-01', 'vencimento'], ['2026-11-02', 'recebimento']]);
  });
});