import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { REVENUE_CATEGORIES, lateCharges } from './revenue';
import { contactSchema, installmentPlan } from './contract-plan';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Data inválida');
const money = z.number().int().min(1).max(999999999999);
export const getRevenue = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), fullYear: z.boolean().optional() }).parse(v)).handler(async ({ data, context }) => {
  const { error: syncError } = await context.supabase.rpc('revenue_sync', { p_month: `${data.month}-01` });
  if (syncError) throw new Error(syncError.message);
  // A grade anual precisa também dos lançamentos de dezembro, mesmo antes desse mês.
  // O RPC é idempotente e preserva recebimentos já registrados.
  const yearEnd = `${data.month.slice(0, 4)}-12-01`;
  if (data.fullYear && data.month.slice(5) !== '12') {
    const { error: yearSyncError } = await context.supabase.rpc('revenue_sync', { p_month: yearEnd });
    if (yearSyncError) throw new Error(yearSyncError.message);
  }
  const [entries, contracts, events, files, sources] = await Promise.all([
    context.supabase.from('revenue_entries').select('*').order('due_date'),
    context.supabase.from('revenue_contracts').select('*').order('created_at', { ascending: false }),
    context.supabase.from('revenue_events').select('*').order('created_at', { ascending: false }),
    context.supabase.from('revenue_files').select('*'),
    context.supabase.from('revenue_sources').select('*').order('first_due'),
  ]);
  for (const r of [entries, contracts, events, files, sources]) if (r.error) throw new Error(r.error.message);
  // Reaplica regras permanentes aos lançamentos que o sincronizador gerar futuramente.
  for (const source of sources.data ?? []) {
    const rules = adjustmentRules(source.details);
    if (!rules.length) continue;
    for (const entry of (entries.data ?? []).filter(e => e.source_id === source.id && !e.received_date && !e.contract_id)) {
      const expected = expectedForMonth(source, entry.due_date);
      if (entry.expected_cents === expected) continue;
      const { error: adjusted } = await context.supabase.from('revenue_entries')
        .update({ expected_cents: expected }).eq('id', entry.id).eq('user_id', context.userId).is('received_date', null);
      if (adjusted) throw new Error(adjusted.message);
      entry.expected_cents = expected;
    }
  }
  return { entries: entries.data ?? [], contracts: contracts.data ?? [], events: events.data ?? [], files: files.data ?? [], sources: sources.data ?? [] };
});
export const editRevenue = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(200), category: z.enum(REVENUE_CATEGORIES), expected_cents: money, first_due: date, recurring: z.boolean(), details: z.record(z.string().max(1000)) }).parse(v)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc('revenue_edit_source', { p_id: data.id, p_data: data });
  if (error) throw new Error(error.message);
  return { ok: true };
});
export const createRevenue = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ title: z.string().trim().min(1).max(200), category: z.enum(REVENUE_CATEGORIES), expected_cents: money, first_due: date, recurring: z.boolean(), details: z.record(z.string().max(1000)) }).parse(v)).handler(async ({ data, context }) => {
  if (data.category === 'Crediário') throw new Error('Cadastre um contrato de venda parcelada.');
  if (data.category === 'Benefício' && (!data.details['source']?.trim() || !data.details['benefit']?.trim())) throw new Error('Informe fonte e número do benefício.');
  if (data.category === 'Empréstimo Devolvido' && (!data.details['source']?.trim() || !data.details['original']?.trim())) throw new Error('Informe de quem e a data original do empréstimo.');
  const { data: source, error } = await context.supabase.from('revenue_sources').insert({ ...data, user_id: context.userId }).select('id').single();
  if (error) throw new Error(error.message);
  if (!source) throw new Error('Não foi possível cadastrar a receita.');
  const { error: syncError } = await context.supabase.rpc('revenue_sync', { p_month: data.first_due });
  if (syncError) throw new Error(syncError.message);
  const { data: entry, error: entryError } = await context.supabase.from('revenue_entries').select('id').eq('source_id',source.id).eq('due_date',data.first_due).single();
  if (entryError || !entry) throw new Error('Receita cadastrada; não foi possível carregar o lançamento.');
  return { id: entry.id };
});
export const createRevenueContract = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => contactSchema.extend({ title:z.string().trim().min(1).max(200),buyer:z.string().trim().min(1).max(200),cpf:z.string().max(20),rg:z.string().max(30),total_cents:money,down_payment_cents:z.number().int().min(0),mode:z.enum(['count','value']),amount:money,remainderAt:z.enum(['first','last']).nullable(),first_due:date,interest_percent:z.number().min(0).max(100),fine_percent:z.number().min(0).max(100),correction_index:z.string().min(1).max(100) }).parse(v)).handler(async ({data,context})=>{
  const p=installmentPlan(data.total_cents,data.down_payment_cents,data.mode,data.amount,data.remainderAt);
  if(p.needsChoice)throw new Error('Escolha a primeira ou última parcela para o remanescente.');
  const {data:id,error}=await context.supabase.rpc('revenue_create_contract',{p_data:{...data,count:p.count,plan:p.plan}});
  if(error)throw new Error(error.message);return {id};
});
export const receiveRevenue = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ id: z.string().uuid(), date, cents: money.min(0), note: z.string().max(2000), reason: z.string().max(1000) }).parse(v)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc('revenue_receive', { p_id: data.id, p_date: data.date, p_cents: data.cents, p_note: data.note, p_reason: data.reason });
  if (error) throw new Error(error.message);
  return { ok: true };
});
export const adjustRevenue = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ id: z.string().uuid(), adjustment: z.object({ date, original: money, days: z.number().int().min(0), interestCents: z.number().int().min(0), fineCents: z.number().int().min(0), correctionCents: z.number().int(), total: money, agreed: money, note: z.string().max(2000), rate:z.number().min(-99).max(1000).optional() }) }).parse(v)).handler(async ({ data, context }) => {
  const {data:entry}=await context.supabase.from('revenue_entries').select('*').eq('id',data.id).single();
  if(!entry?.contract_id||entry.received_date)throw new Error('Parcela indisponível para atualização.');
  const {data:contract}=await context.supabase.from('revenue_contracts').select('*').eq('id',entry.contract_id).single();
  if(!contract)throw new Error('Contrato não encontrado.');
  const a=data.adjustment;
  const rate=contract.correction_index==='Sem correção'?0:a.rate??(a.correctionCents/entry.expected_cents*100);
  const expected=lateCharges(entry.expected_cents,entry.due_date,a.date,contract.interest_percent,contract.fine_percent,rate);
  if(a.original!==entry.expected_cents||a.days!==expected.days||a.interestCents!==expected.interestCents||a.fineCents!==expected.fineCents||a.correctionCents!==expected.correctionCents||a.total!==expected.total)throw new Error('O cálculo da parcela mudou. Recalcule antes de confirmar.');
  const { error } = await context.supabase.rpc('revenue_adjust', { p_id: data.id, p_adjustment: data.adjustment });
  if (error) throw new Error(error.message);
  return { ok: true };
});
export const uploadRevenueFile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ entryId: z.string().uuid().nullable(), contractId: z.string().uuid().nullable(), name: z.string().min(1).max(200), mime: z.enum(['application/pdf','image/png','image/jpeg','image/webp']), base64: z.string().max(1666668) }).refine(v => Boolean(v.entryId) !== Boolean(v.contractId)).parse(v)).handler(async ({ data, context }) => {
  const table = data.entryId ? 'revenue_entries' : 'revenue_contracts';
  const id = data.entryId ?? data.contractId;
  if (!id) throw new Error('Destino inválido');
  const { data: owner } = await context.supabase.from(table).select('id').eq('id', id).single();
  if (!owner) throw new Error('Registro não encontrado');
  const bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0));
  const prefix = data.mime === 'application/pdf' ? [37,80,68,70] : data.mime === 'image/png' ? [137,80,78,71,13,10,26,10] : data.mime === 'image/jpeg' ? [255,216,255] : [82,73,70,70];
  if (!bytes.length || bytes.length > 1250000 || !prefix.every((v,i) => bytes[i] === v) || (data.mime === 'image/webp' && String.fromCharCode(...bytes.slice(8,12)) !== 'WEBP')) throw new Error('Arquivo inválido ou maior que 1.250.000 bytes.');
  const path = `${context.userId}/receitas/${id}/${crypto.randomUUID()}`;
  const { error } = await context.supabase.storage.from('comprovantes').upload(path, bytes, { contentType: data.mime });
  if (error) throw new Error(error.message);
  const { error: fileError } = await context.supabase.from('revenue_files').insert({ user_id: context.userId, entry_id: data.entryId, contract_id: data.contractId, name: data.name, path });
  if (fileError) { await context.supabase.storage.from('comprovantes').remove([path]); throw new Error(fileError.message); }
  return { ok: true };
});
export const openRevenueFile = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).inputValidator((v:unknown) => z.object({ id:z.string().uuid() }).parse(v)).handler(async ({ data,context }) => {
  const { data:file } = await context.supabase.from('revenue_files').select('path').eq('id',data.id).single();
  if (!file) throw new Error('Comprovante não encontrado');
  const { data:link,error } = await context.supabase.storage.from('comprovantes').createSignedUrl(file.path,300);
  if (error || !link) throw new Error('Não foi possível abrir o arquivo');
  return { url:link.signedUrl };
});

type SourceAdjustmentRule = { start: string; cents: number; baseCents: number; mode: 'percentage' | 'amount'; value: number; reason: string };
function adjustmentRules(details: unknown): SourceAdjustmentRule[] {
  const value = details && typeof details === 'object' && !Array.isArray(details) ? (details as Record<string, unknown>).axion_reajustes : null;
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is SourceAdjustmentRule => x !== null && typeof x === 'object' &&
    typeof x.start === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(x.start) &&
    Number.isSafeInteger(x.cents) && x.cents > 0).sort((a,b) => a.start.localeCompare(b.start));
}
function expectedForMonth(source: { expected_cents: number; details: unknown }, due: string): number {
  let value = source.expected_cents;
  for (const rule of adjustmentRules(source.details)) if (rule.start <= due.slice(0, 7)) value = rule.cents;
  return value;
}

export const updateRevenueSourceAdjustment = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    sourceId: z.string().uuid(), start: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    mode: z.enum(['percentage', 'amount']), value: z.number().finite().min(-99).max(999999999999),
    baseCents: money, newCents: money, reason: z.string().trim().min(3).max(1000),
  }).parse(v)).handler(async ({ data, context }) => {
    const { data: source, error } = await context.supabase.from('revenue_sources')
      .select('*').eq('id', data.sourceId).eq('user_id', context.userId).single();
    if (error || !source) throw new Error('Fonte pagadora não encontrada.');
    if (!source.recurring) throw new Error('O reajuste automático requer uma fonte recorrente.');
    const rules = adjustmentRules(source.details);
    const base = rules.filter(rule => rule.start < data.start).at(-1)?.cents ?? source.expected_cents;
    if (data.baseCents !== base) throw new Error('O valor de referência mudou. Atualize a página.');
    const computed = data.mode === 'percentage' ? Math.round(base * (1 + data.value / 100)) : data.value;
    if (computed !== data.newCents || computed <= 0) throw new Error('O cálculo do reajuste não corresponde ao valor informado.');
    const newRules = [...rules.filter(rule => rule.start !== data.start), {
      start: data.start, cents: data.newCents, baseCents: base, mode: data.mode, value: data.value, reason: data.reason,
    }].sort((a,b) => a.start.localeCompare(b.start));
    const oldDetails = source.details && typeof source.details === 'object' && !Array.isArray(source.details)
      ? source.details as Record<string, unknown> : {};
    const { error: saved } = await context.supabase.from('revenue_sources')
      .update({ details: { ...oldDetails, axion_reajustes: newRules } }).eq('id', source.id).eq('user_id', context.userId);
    if (saved) throw new Error(saved.message);
    const { data: existing, error: listing } = await context.supabase.from('revenue_entries')
      .select('*').eq('source_id', source.id).eq('user_id', context.userId).gte('due_date', `${data.start}-01`).order('due_date');
    if (listing) throw new Error(listing.message);
    const sourceWithRules = { ...source, details: { ...oldDetails, axion_reajustes: newRules } };
    for (const entry of existing ?? []) {
      if (entry.received_date || entry.contract_id) continue;
      const cents = expectedForMonth(sourceWithRules, entry.due_date);
      if (entry.expected_cents === cents) continue;
      const { error: updateError } = await context.supabase.from('revenue_entries')
        .update({ expected_cents: cents }).eq('id', entry.id).eq('user_id', context.userId).is('received_date', null);
      if (updateError) throw new Error(updateError.message);
      const { error: auditError } = await context.supabase.from('revenue_events').insert({
        user_id: context.userId, entry_id: entry.id, kind: 'correção',
        reason: `Reajuste da fonte ${source.title} a partir de ${data.start}: ${data.reason}`,
        before_data: { expected_cents: entry.expected_cents, due_date: entry.due_date },
        after_data: { expected_cents: cents, due_date: entry.due_date, adjustment: newRules.find(rule => rule.start === data.start) },
      });
      if (auditError) throw new Error('O valor foi modificado, mas a auditoria falhou. Verifique antes de repetir: ' + auditError.message);
    }
    return { ok: true };
  });
