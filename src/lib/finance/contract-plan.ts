import { z } from 'zod';
import type { RevenueEntry } from './revenue';
export const CONTRACT_STATUSES = ['Atrasado','Concluído','Em andamento','Pausado','Perdoado','Ajuizado','Renegociado'] as const;
export function installmentPlan(total:number, down:number, mode:'count'|'value', amount:number, remainderAt:'first'|'last'|null) {
  const balance=total-down;
  if (!Number.isSafeInteger(balance)||down<0||balance<1||!Number.isSafeInteger(amount)||amount<1) throw new Error('Informe valores válidos; a entrada deve ser menor que o total.');
  const count=mode==='count'?amount:Math.max(1,Math.floor(balance/amount));
  if(count>600||count>balance)throw new Error('Informe de 1 a 600 parcelas com valor mínimo de R$ 0,01.');
  const base=mode==='count'?Math.floor(balance/count):Math.min(balance,amount);
  const remainder=balance-base*count;
  const plan=Array<number>(count).fill(base);
  if(remainder && remainderAt) { const i=remainderAt==='first'?0:count-1; plan[i]=(plan[i]??0)+remainder; }
  return {balance,count,base,remainder,plan,needsChoice:remainder>0&&!remainderAt};
}
export function amountDue(e:RevenueEntry) { const a=e.adjustment; return a&&typeof a==='object'&&!Array.isArray(a)&&typeof a['agreed']==='number'?a['agreed']:e.expected_cents; }
export function fullyPaid(e:RevenueEntry) { return !!e.received_date&&(e.received_cents??0)>=amountDue(e); }
export function contractStatus(status:string, entries:RevenueEntry[], today:string) {
  if(entries.length&&entries.every(fullyPaid))return 'Concluído';
  if(status==='Em andamento'&&entries.some(e=>!fullyPaid(e)&&e.due_date<today))return 'Atrasado';
  return status;
}
export function installmentNote(e:RevenueEntry) {
  if(!e.received_date)return e.note||'';
  const charge=Math.max(0,amountDue(e)-e.expected_cents);
  return `${e.received_date>e.due_date?'Pago com atraso':e.received_date<e.due_date?'Pago antecipadamente':'Pago em dia'}${charge?` · Correção cobrada: ${(charge/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`:''}${e.note?` · ${e.note}`:''}`;
}
export const contactSchema=z.object({address:z.string().trim().max(300),postal_code:z.string().max(9).refine(v=>!v||/^\d{5}-?\d{3}$/.test(v),'CEP inválido'),city:z.string().trim().max(100),state:z.string().max(2).refine(v=>!v||/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(v),'Estado inválido'),phone:z.string().max(25),email:z.string().max(254).refine(v=>!v||z.string().email().safeParse(v).success,'E-mail inválido'),note:z.string().max(2000)});