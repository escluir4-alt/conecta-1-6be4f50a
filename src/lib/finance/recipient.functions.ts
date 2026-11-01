import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { BRAZIL_STATES, savedRecipientSchema } from './pix-recipient';

export const getInvoiceRecipient=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data,error}=await context.supabase.from('invoice_recipients').select('key,name,state,city').eq('user_id',context.userId).maybeSingle();
  if(error)throw new Error('Não foi possível carregar o recebedor.');
  return data?savedRecipientSchema.parse(data):null;
});
export const saveInvoiceRecipient=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>savedRecipientSchema.parse(v)).handler(async({data,context})=>{
  const {error}=await context.supabase.from('invoice_recipients').upsert({...data,user_id:context.userId,updated_at:new Date().toISOString()});
  if(error)throw new Error('Não foi possível salvar o recebedor.');
  return {ok:true};
});
export const getRecipientCities=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({state:z.enum(BRAZIL_STATES)}).parse(v)).handler(async({data})=>{
  if(data.state==='DF')return ['Brasília'];
  try{
    const response=await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${data.state}/municipios?orderBy=nome`,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error();
    return z.array(z.object({nome:z.string()})).parse(await response.json()).map(c=>c.nome);
  }catch{
    const {default:municipalities}=await import('./municipalities.json');
    return municipalities[data.state];
  }
});