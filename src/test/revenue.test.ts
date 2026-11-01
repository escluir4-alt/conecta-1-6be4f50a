import { describe, it, expect } from 'vitest';
import { annualRevenue, receivedRevenue, revenueSourceKey, revenueMonthEntries, revenueSettled, lateCharges, reminderDays, revenueStatus, revenueSummary, type RevenueEntry } from '@/lib/finance/revenue';
const row = (overrides: Partial<RevenueEntry>): RevenueEntry => ({ id: 'entry-1', source_id: 'source-1', contract_id: null, user_id: 'user-1', title: 'Salário', category: 'Salário', number: null, expected_cents: 100000, due_date: '2026-11-05', received_date: null, received_cents: null, note: '', adjustment: null, ...overrides });
describe('Receitas',()=>{
  it('seleciona somente a parcela do contrato no mês de vencimento confirmado',()=>{
    const november=row({id:'nov',source_id:null,contract_id:'contract-1',number:1});
    const december=row({id:'dec',source_id:null,contract_id:'contract-1',number:2,due_date:'2026-12-05'});
    expect(revenueMonthEntries([november,december,row({})],november,'2026-11').map(e=>e.id)).toEqual(['nov']);
  });
  it('recebimento confirmado da parcela entra no histórico exclusivo de receitas',()=>{
    const paid=row({source_id:null,contract_id:'contract-1',received_date:'2026-11-01',received_cents:100000});
    expect(receivedRevenue([paid,row({id:'unpaid'})],'2026','')).toEqual([paid]);
  });
  it('parcela fica quitada somente ao cobrir seu valor acordado',()=>{
    const paid=row({contract_id:'contract-1',received_date:'2026-11-01',received_cents:100000});
    expect(revenueSettled(paid)).toBe(true);
    expect(revenueSettled({...paid,received_cents:99999})).toBe(false);
    expect(revenueSettled({...paid,adjustment:{agreed:110000}})).toBe(false);
  });
  it('inclui parcelas de contratos no exercício do vencimento',()=>{
    const salary = row({});
    const installment=row({id:'contract-entry',source_id:null,contract_id:'contract-1',due_date:'2026-01-10'});
    expect(annualRevenue([salary, installment,row({id:'old',due_date:'2025-11-05'})], '2026')).toEqual([installment,salary]);
  });
  it('ordena parcelas de janeiro a dezembro pela data de vencimento',()=>{
    const january=row({id:'jan',contract_id:'contract-1',due_date:'2027-01-10'});
    const february=row({id:'feb',contract_id:'contract-1',due_date:'2027-02-10'});
    const march=row({id:'mar',contract_id:'contract-1',due_date:'2027-03-10'});
    expect(annualRevenue([march,january,february], '2027').map(e=>e.due_date)).toEqual(['2027-01-10','2027-02-10','2027-03-10']);
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