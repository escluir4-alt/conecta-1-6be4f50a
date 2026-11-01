import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { CONTRACT_STATUSES } from './contract-plan';
import { lateCharges } from './revenue';
const iso=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Data inválida');
export const setRevenueContractStatus=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid(),status:z.enum(CONTRACT_STATUSES)}).parse(v)).handler(async({data,context})=>{
  const {error}=await context.supabase.from('revenue_contracts').update({status:data.status}).eq('id',data.id).eq('user_id',context.userId);if(error)throw new Error(error.message);return {ok:true};
});
export const editRevenueInstallment=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid(),due:iso,cents:z.number().int().min(1).max(999999999999),note:z.string().max(2000)}).parse(v)).handler(async({data,context})=>{
  const {error}=await context.supabase.rpc('revenue_edit_installment',{p_id:data.id,p_due:data.due,p_cents:data.cents,p_note:data.note});if(error)throw new Error(error.message);return {ok:true};
});
export const quoteRevenueInstallments=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({contractId:z.string().uuid(),ids:z.array(z.string().uuid()).min(1).max(600),date:iso,manualRate:z.number().min(-99).max(1000).nullable()}).parse(v)).handler(async({data,context})=>{
  const {data:c,error}=await context.supabase.from('revenue_contracts').select('*').eq('id',data.contractId).single();if(error||!c)throw new Error('Contrato não encontrado');
  const {data:entries,error:ee}=await context.supabase.from('revenue_entries').select('*').eq('contract_id',c.id).in('id',data.ids).order('number');
  if(ee||!entries||entries.length!==new Set(data.ids).size||entries.some(e=>e.received_date))throw new Error('Selecione apenas parcelas não recebidas.');
  const series=c.correction_index==='IPCA'?433:['IGPM','IGP-M'].includes(c.correction_index)?189:null;
  let observations:{month:string;rate:number}[]=[];let latest='';
  if(series&&entries.some(e=>e.due_date<data.date)){
    const start=entries.map(e=>e.due_date).sort()[0];if(!start)throw new Error('Período inválido');
    if(Number(data.date.slice(0,4))-Number(start.slice(0,4))>10)throw new Error('O período de correção deve ser de até 10 anos.');
    const br=(d:string)=>`${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`;
    const lookback=new Date(`${start.slice(0,7)}-01T00:00:00Z`);lookback.setUTCMonth(lookback.getUTCMonth()-3);
    const params=new URLSearchParams({formato:'json',dataInicial:br(lookback.toISOString().slice(0,10)),dataFinal:br(data.date)});
    let response:Response;try{response=await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados?${params}`,{signal:AbortSignal.timeout(15000)});}catch{throw new Error('Índice oficial indisponível. Tente novamente; nenhum índice foi estimado.');}
    if(!response.ok)throw new Error('Não foi possível consultar o índice oficial.');
    const raw=z.array(z.object({data:z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),valor:z.string()})).parse(await response.json());
    observations=raw.map(r=>({month:`${r.data.slice(6)}-${r.data.slice(3,5)}`,rate:Number(r.valor)}));
    if(observations.some(r=>!Number.isFinite(r.rate)||r.rate<=-100))throw new Error('Índice oficial inválido.');latest=observations.map(o=>o.month).sort().at(-1)??'';
    if(!latest)throw new Error('Não há índice publicado para este período.');
  }
  const rows=entries.map(e=>{
    const applicable=observations.filter(o=>o.month>=e.due_date.slice(0,7)&&o.month<data.date.slice(0,7));
    // Full reference months from due month through the month before payment; no fabricated current-month rate.
    for(let y=Number(e.due_date.slice(0,4)),m=Number(e.due_date.slice(5,7));series&&e.due_date<data.date;){const key=`${y}-${String(m).padStart(2,'0')}`;if(key>=data.date.slice(0,7)||key>latest)break;if(!applicable.some(o=>o.month===key))throw new Error(`Índice ausente em ${key}.`);m++;if(m>12){m=1;y++;}}
    const rate=c.correction_index==='Sem correção'?0:series?(applicable.reduce((f,o)=>f*(1+o.rate/100),1)-1)*100:data.manualRate;
    if(rate===null)throw new Error('Informe a taxa acumulada do índice personalizado.');
    return {entry:e,rate,months:applicable,charges:lateCharges(e.expected_cents,e.due_date,data.date,c.interest_percent,c.fine_percent,rate)};
  });
  return {contract:c,date:data.date,rows,latest,source:series?'Banco Central / SGS':'Taxa informada',convention:'Meses de referência completos, do mês do vencimento ao mês anterior ao pagamento; limitado ao último índice publicado.',total:rows.reduce((s,r)=>s+r.charges.total,0)};
});