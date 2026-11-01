import { describe,it,expect } from 'vitest';
import { installmentPlan,contractStatus,fullyPaid,installmentNote } from '@/lib/finance/contract-plan';
import type { RevenueEntry } from '@/lib/finance/revenue';
describe('Parcelamento de contratos',()=>{
  it('desconta sinal de 200 de total 1000',()=>expect(installmentPlan(100000,20000,'count',12,'last').balance).toBe(80000));
  it.each([12,24])('parcela apenas saldo em %i vezes',count=>{const p=installmentPlan(100000,20000,'count',count,'last');expect(p.plan).toHaveLength(count);expect(p.plan.reduce((s,v)=>s+v,0)).toBe(80000);});
  it('valor da parcela determina quantidade e pergunta sobre remanescente',()=>{const p=installmentPlan(100000,20000,'value',7000,null);expect(p.count).toBe(11);expect(p.remainder).toBe(3000);expect(p.needsChoice).toBe(true);});
  it.each(['first','last'] as const)('adiciona remanescente na %s',position=>{const p=installmentPlan(100000,20000,'value',7000,position);expect(p.plan[position==='first'?0:10]).toBe(10000);expect(p.plan.reduce((s,v)=>s+v,0)).toBe(80000);});
  it('não conclui contrato com pagamento parcial',()=>{const e={expected_cents:10000,received_cents:9000,received_date:'2026-11-01',due_date:'2026-11-01',adjustment:null} as RevenueEntry;expect(fullyPaid(e)).toBe(false);expect(contractStatus('Em andamento',[e],'2026-11-01')).toBe('Em andamento');expect(contractStatus('Pausado',[{...e,received_cents:10000}],'2026-11-01')).toBe('Concluído');});
  it.each(['Atrasado','Pausado','Perdoado','Ajuizado','Renegociado'])('preserva status manual %s',status=>expect(contractStatus(status,[{due_date:'2026-11-20',received_date:null,expected_cents:10000,received_cents:null,adjustment:null} as RevenueEntry],'2026-11-01')).toBe(status));
  it('exige pagamento integral do valor atualizado para concluir',()=>{const e:RevenueEntry={id:'test',user_id:'test',category:'Crediário',contract_id:'test',source_id:null,number:1,title:'Teste',note:'',due_date:'2026-10-01',expected_cents:10000,received_date:'2026-11-01',received_cents:10000,adjustment:{agreed:10500}};expect(fullyPaid(e)).toBe(false);expect(fullyPaid({...e,received_cents:10500})).toBe(true);});
  it('observação de parcela em dia não recebida fica em branco',()=>expect(installmentNote({received_date:null,note:''} as RevenueEntry)).toBe(''));
});