begin;
create table if not exists public.axion_provider (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null references auth.users(id) on delete cascade,
  secret_id uuid not null,
  model text not null check (model ~ '^[a-zA-Z0-9._:-]{1,120}$'),
  max_request_cents integer not null check (max_request_cents between 1 and 3000),
  web boolean not null default false
);
alter table public.axion_provider enable row level security;
revoke all on public.axion_provider from public, anon, authenticated, service_role;

create or replace function public.axion_provider_status()
returns table(model text, max_request_cents integer, web boolean)
language sql stable security definer set search_path = '' as $$
  select p.model, p.max_request_cents, p.web from public.axion_provider p
  where p.user_id = (select auth.uid()) and public.axion_is_owner();
$$;
revoke all on function public.axion_provider_status() from public, anon;
grant execute on function public.axion_provider_status() to authenticated;

create or replace function public.axion_save_provider(
  p_owner uuid, p_key text, p_model text, p_cents integer, p_web boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare old_provider public.axion_provider%rowtype;
declare sid uuid;
begin
  perform 1 from public.axion_owner where user_id = p_owner for update;
  if not found then raise exception 'Titular Axion inválido' using errcode = '42501'; end if;
  select * into old_provider from public.axion_provider where singleton;
  if old_provider.secret_id is not null and old_provider.user_id <> p_owner then
    raise exception 'Provedor pertence a outro titular' using errcode = '42501';
  end if;
  if p_key is not null and (char_length(p_key) < 20 or char_length(p_key) > 512 or p_key !~ '^sk-[A-Za-z0-9_-]+$') then
    raise exception 'Chave inválida' using errcode = '22023';
  end if;
  sid := old_provider.secret_id;
  if sid is null then
    if p_key is null then raise exception 'Chave necessária' using errcode = '22023'; end if;
    sid := vault.create_secret(p_key, null::text, 'Axion IA — OpenAI', null::uuid);
  elsif p_key is not null then
    perform vault.update_secret(sid, p_key, null::text, 'Axion IA — OpenAI', null::uuid);
  end if;
  insert into public.axion_provider (singleton,user_id,secret_id,model,max_request_cents,web)
  values (true,p_owner,sid,p_model,p_cents,p_web)
  on conflict (singleton) do update set model=excluded.model,max_request_cents=excluded.max_request_cents,web=excluded.web;
end;
$$;
revoke all on function public.axion_save_provider(uuid,text,text,integer,boolean) from public, anon, authenticated;
grant execute on function public.axion_save_provider(uuid,text,text,integer,boolean) to service_role;

create or replace function public.axion_read_provider(p_owner uuid)
returns table(api_key text, model text, max_request_cents integer, web boolean)
language sql stable security definer set search_path = '' as $$
  select s.decrypted_secret,p.model,p.max_request_cents,p.web
  from public.axion_provider p
  join public.axion_owner o on o.user_id=p.user_id
  join vault.decrypted_secrets s on s.id=p.secret_id
  where p.user_id=p_owner;
$$;
revoke all on function public.axion_read_provider(uuid) from public, anon, authenticated;
grant execute on function public.axion_read_provider(uuid) to service_role;
create table if not exists public.axion_transfer (
  singleton boolean primary key default true check (singleton),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
alter table public.axion_transfer enable row level security;
revoke all on public.axion_transfer from public, anon, authenticated, service_role;

create or replace function public.axion_transfer_pending() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.axion_transfer t join public.axion_owner o on o.user_id=t.from_user
    where t.to_user=(select auth.uid()) and t.expires_at > now()
  );
$$;

create or replace function public.axion_request_transfer(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
declare target uuid;
begin
  perform 1 from public.axion_owner where user_id=actor for update;
  if not found then raise exception 'Titular Axion inválido' using errcode = '42501'; end if;
  select min(id::text)::uuid into target from auth.users
    where lower(email)=lower(btrim(p_email)) and email_confirmed_at is not null
    having count(*) = 1;
  if target is null or target=actor then raise exception 'Conta de destino inválida' using errcode = '22023'; end if;
  insert into public.axion_transfer(singleton,from_user,to_user,expires_at)
  values(true,actor,target,now() + interval '15 minutes')
  on conflict(singleton) do update set from_user=excluded.from_user,to_user=excluded.to_user,expires_at=excluded.expires_at;
end;
$$;

create or replace function public.axion_cancel_transfer() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.axion_owner where user_id=auth.uid() for update;
  if not found then raise exception 'Titular Axion inválido' using errcode = '42501'; end if;
  delete from public.axion_transfer where from_user=auth.uid();
end;
$$;

create or replace function public.axion_accept_transfer() returns void
language plpgsql security definer set search_path = '' as $$
declare previous uuid;
declare next_owner uuid := auth.uid();
declare old_secret uuid;
begin
  select user_id into previous from public.axion_owner where singleton for update;
  if previous is null or not exists (
    select 1 from public.axion_transfer t join auth.users u on u.id=t.to_user
    where t.from_user=previous and t.to_user=next_owner and t.expires_at > now() and u.email_confirmed_at is not null
  ) then raise exception 'Transferência não disponível' using errcode = '42501'; end if;
  delete from public.axion_provider where user_id=previous returning secret_id into old_secret;
  if old_secret is not null then delete from vault.secrets where id=old_secret; end if;
  update public.axion_owner set user_id=next_owner where singleton;
  delete from public.axion_transfer where singleton;
end;
$$;

revoke all on function public.axion_transfer_pending(), public.axion_request_transfer(text), public.axion_cancel_transfer(), public.axion_accept_transfer() from public, anon;
grant execute on function public.axion_transfer_pending(), public.axion_request_transfer(text), public.axion_cancel_transfer(), public.axion_accept_transfer() to authenticated;
commit;
