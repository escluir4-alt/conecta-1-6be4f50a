begin;
create table if not exists public.axion_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null references auth.users(id) on delete cascade
);
alter table public.axion_owner enable row level security;
revoke all on public.axion_owner from public, anon, authenticated;

create or replace function public.axion_is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.axion_owner where user_id = (select auth.uid()));
$$;
revoke all on function public.axion_is_owner() from public, anon;
grant execute on function public.axion_is_owner() to authenticated;

create table if not exists public.axion_conversations (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  archived boolean not null default false,
  revision integer not null default 0 check (revision >= 0),
  branches jsonb not null check (jsonb_typeof(branches) = 'array' and octet_length(branches::text) <= 1000000),
  updated_at timestamptz not null default now()
);
create index if not exists axion_conversations_user_updated on public.axion_conversations(user_id, updated_at desc);
alter table public.axion_conversations enable row level security;
revoke all on public.axion_conversations from public, anon, authenticated;
grant select, insert, update, delete on public.axion_conversations to authenticated;
drop policy if exists axion_owner_conversations on public.axion_conversations;
create policy axion_owner_conversations on public.axion_conversations for all to authenticated
using (user_id = (select auth.uid()) and (select public.axion_is_owner()))
with check (user_id = (select auth.uid()) and (select public.axion_is_owner()));

create table if not exists public.axion_monthly_reservations (
  month date primary key,
  reserved_cents integer not null check (reserved_cents between 1 and 3000)
);
alter table public.axion_monthly_reservations enable row level security;
revoke all on public.axion_monthly_reservations from public, anon, authenticated;
create or replace function public.axion_reserve(p_cents integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  if not public.axion_is_owner() or p_cents is null or p_cents not between 1 and 3000 then
    raise exception 'Reserva Axion inválida' using errcode = '42501';
  end if;
  insert into public.axion_monthly_reservations as budget(month,reserved_cents)
  values (pg_catalog.date_trunc('month', pg_catalog.timezone('America/Sao_Paulo', now()))::date,p_cents)
  on conflict(month) do update set reserved_cents = budget.reserved_cents + excluded.reserved_cents
    where budget.reserved_cents + excluded.reserved_cents <= 3000
  returning reserved_cents into total;
  return total;
end;
$$;
revoke all on function public.axion_reserve(integer) from public, anon;
grant execute on function public.axion_reserve(integer) to authenticated;
create table if not exists public.axion_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  tone text not null check (tone in ('direto','detalhado')),
  deep boolean not null default false,
  memory text not null default '' check (char_length(memory) <= 2000)
);
alter table public.axion_preferences enable row level security;
revoke all on public.axion_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.axion_preferences to authenticated;
drop policy if exists axion_owner_preferences on public.axion_preferences;
create policy axion_owner_preferences on public.axion_preferences for all to authenticated
using (user_id = (select auth.uid()) and (select public.axion_is_owner()))
with check (user_id = (select auth.uid()) and (select public.axion_is_owner()));
commit;
