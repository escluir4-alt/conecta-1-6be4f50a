import { describe, it, expect } from 'vitest';
import { annualRevenue, receivedRevenue, revenueSourceKey, lateCharges, reminderDays, revenueStatus, revenueSummary, type RevenueEntry } from '@/lib/finance/revenue';
const row = (overrides: Partial<RevenueEntry>): RevenueEntry => ({ id: 'entry-1', source_id: 'source-1', contract_id: null, user_id: 'user-1', title: 'Salário', category: 'Salário', number: null, expected_cents: 100000, due_date: '2026-11-05', received_date: null, received_cents: null, note: '', adjustment: null, created_at: '2026-11-01', ...overrides });
describe('Receitas',()=>{
  it('separa a grade anual das parcelas de contratos e de outros exercícios',()=>{
    const salary = row({});
    expect(annualRevenue([salary, row({id:'contract-entry',contract_id:'contract-1'}),row({id:'old',due_date:'2025-11-05'})], '2026')).toEqual([salary]);
  });
  it('histórico contém apenas recebimentos confirmados da fonte e ano selecionados',()=>{
    const received = row({received_date:'2026-11-01',received_cents:100000});
    expect(receivedRevenue([received,row({}),row({title:'Doação',received_date:'2026-11-01'}),row({due_date:'2025-11-05',received_date:'2026-11-01'})], '2026', 'Salário')).toEqual([received]);
  });
  it('agrupa lançamentos recorrentes pela fonte, não pelo nome compartilhado',()=>{
    expect(revenueSourceKey(row({id:'november'}))).toBe(revenueSourceKey(row({id:'december',due_date:'2026-12-05'})));
    expect(revenueSourceKey(row({source_id:'another-source'}))).not.toBe(revenueSourceKey(row({})));
  });
  it('preserva previsto e recebido no resumo mensal',()=>{
    expect(revenueSummary([{expected_cents:350000,received_cents:340000,received_date:'2026-11-05',due_date:'2026-11-05'},{expected_cents:185000,received_cents:null,received_date:null,due_date:'2026-11-10'}],'2026-11-15')).toEqual({expected:535000,received:340000,pending:185000,overdue:185000});
  });
  it('não confunde recebimento menor com saldo pendente',()=>{
    expect(revenueSummary([{expected_cents:350000,received_cents:340000,received_date:'2026-11-05',due_date:'2026-11-05'}],'2026-11-15').pending).toBe(0);
  });
  it('classifica receita futura',()=>expect(revenueStatus({received_date:null,due_date:'2026-11-30'},'2026-11-10')).toBe('Futuro'));
  it('classifica atrasada só após vencimento',()=>expect(revenueStatus({received_date:null,due_date:'2026-11-10'},'2026-11-11')).toBe('Atrasada'));
  it('juros de 1% por 18 dias e multa 2% sobre R$ 1850',()=>{
    expect(lateCharges(185000,'2026-11-10','2026-11-28',1,2,0)).toEqual({days:18,interestCents:1110,fineCents:3700,correctionCents:0,total:189810});
  });
  it('discrimina a correção informada sem inventar índice',()=>expect(lateCharges(185000,'2026-11-10','2026-11-28',1,2,0.4567567568).total).toBe(190655));
  it('não cobra encargos antes de vencer',()=>expect(lateCharges(185000,'2026-11-10','2026-11-09',1,2,1).total).toBe(185000));
  it.each([7,3,1])('lembrete %i dias antes',days=>expect(reminderDays(`2026-11-${String(10+days).padStart(2,'0')}`,'2026-11-10')).toBe(days));
  it('não cria lembrete fora de 7,3,1 dias',()=>expect(reminderDays('2026-11-12','2026-11-10')).toBeNull());
});