import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { PersonalRecord } from './agenda-personal';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v);
const recordSchema = z.object({ id: z.string().uuid().optional(), kind: z.enum(['birthday','work','appointment','event','tasks','shopping']), title: z.string().trim().min(1).max(200), start_date: date, time: z.string().regex(/^(|([01]\d|2[0-3]):[0-5]\d)$/), description: z.string().max(2000), recurrence: z.enum(['none','daily','weekly','monthly','yearly','12x36']), favorite: z.boolean(), reminder: z.boolean(), items: z.array(z.object({ key: z.string().uuid(), description: z.string().trim().min(1).max(300), quantity: z.number().positive().max(100000), cents: z.number().int().min(0).max(999999999999) })).max(100) });
export const getPersonalAgenda = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const [records, checks] = await Promise.all([context.supabase.from('agenda_records').select('*').order('created_at'), context.supabase.from('agenda_checks').select('*')]);
  if (records.error || checks.error) throw new Error('Não foi possível carregar a agenda pessoal.');
  return { records: (records.data ?? []).map(r => ({...r, items: r.items as unknown as PersonalRecord['items'], kind: r.kind as PersonalRecord['kind']})), checks: checks.data ?? [] };
});
export const savePersonalAgenda = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown) => recordSchema.parse(v)).handler(async ({data,context}) => {
  const {id,...fields} = data;
  if (fields.kind === 'birthday') fields.recurrence = 'yearly';
  if (fields.kind === 'work') fields.recurrence = '12x36';
  const result = id ? await context.supabase.from('agenda_records').update(fields).eq('id',id).select('id').single() : await context.supabase.from('agenda_records').insert({...fields,user_id:context.userId}).select('id').single();
  if (result.error || !result.data) throw new Error('Não foi possível salvar o registro.');
  return result.data;
});
export const deletePersonalAgenda = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown) => z.object({id:z.string().uuid()}).parse(v)).handler(async ({data,context}) => {
  const {error} = await context.supabase.from('agenda_records').delete().eq('id',data.id);
  if (error) throw new Error('Não foi possível excluir.');
  return {ok:true};
});
export const checkAgendaItem = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown) => z.object({record_id:z.string().uuid(),occurrence_date:date,item_key:z.string().uuid(),done:z.boolean()}).parse(v)).handler(async ({data,context}) => {
  const {error} = await context.supabase.from('agenda_checks').upsert({...data,user_id:context.userId});
  if (error) throw new Error('Não foi possível confirmar o item.');
  return {ok:true};
});