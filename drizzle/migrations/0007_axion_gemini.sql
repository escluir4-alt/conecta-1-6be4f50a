begin;
create table if not exists public.axion_gemini (
  user_id uuid primary key references auth.users(id) on delete cascade,
  secret_id uuid not null
);
alter table public.axion_gemini enable row level security;
revoke all on public.axion_gemini from public, anon, authenticated, service_role;

create or replace function public.axion_gemini_configured() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.axion_is_owner() and exists (
    select 1 from public.axion_gemini where user_id = (select auth.uid())
  );
$$;
revoke all on function public.axion_gemini_configured() from public, anon;
grant execute on function public.axion_gemini_configured() to authenticated;

create or replace function public.axion_save_gemini(p_owner uuid, p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  perform 1 from public.axion_owner where user_id=p_owner for update;
  if not found then raise exception 'Titular inválido' using errcode='42501'; end if;
  if p_key is null or p_key !~ '^[A-Za-z0-9_-]{20,200}$' then
    raise exception 'Chave inválida' using errcode='22023';
  end if;
  select secret_id into sid from public.axion_gemini where user_id=p_owner;
  if sid is null then
    sid := vault.create_secret(p_key, null::text, 'Axion — Gemini', null::uuid);
    insert into public.axion_gemini(user_id,secret_id) values(p_owner,sid);
  else
    perform vault.update_secret(sid,p_key,null::text,'Axion — Gemini',null::uuid);
  end if;
end;
$$;
revoke all on function public.axion_save_gemini(uuid,text) from public, anon, authenticated;
grant execute on function public.axion_save_gemini(uuid,text) to service_role;

create or replace function public.axion_read_gemini(p_owner uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.decrypted_secret from public.axion_gemini g
  join public.axion_owner o on o.user_id=g.user_id
  join vault.decrypted_secrets s on s.id=g.secret_id
  where g.user_id=p_owner;
$$;
revoke all on function public.axion_read_gemini(uuid) from public, anon, authenticated;
grant execute on function public.axion_read_gemini(uuid) to service_role;

create or replace function public.axion_clear_previous_gemini() returns trigger
language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  if tg_op='DELETE' then
    delete from public.axion_gemini where user_id=old.user_id returning secret_id into sid;
  elsif new.user_id is distinct from old.user_id then
    delete from public.axion_gemini where user_id=old.user_id returning secret_id into sid;
  end if;
  if sid is not null then delete from vault.secrets where id=sid; end if;
  return null;
end;
$$;
revoke all on function public.axion_clear_previous_gemini() from public, anon, authenticated, service_role;
drop trigger if exists axion_clear_previous_gemini on public.axion_owner;
create trigger axion_clear_previous_gemini after update or delete on public.axion_owner
for each row execute function public.axion_clear_previous_gemini();
commit;
