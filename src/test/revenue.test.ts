import { describe, it, expect } from 'vitest';
import { lateCharges, reminderDays, revenueStatus, revenueSummary } from '@/lib/finance/revenue';
describe('Receitas',()=>{
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