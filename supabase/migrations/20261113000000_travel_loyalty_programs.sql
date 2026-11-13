-- Table for user-owned travel loyalty program balances.
create extension if not exists pgcrypto;

create table if not exists public.travel_loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_name text not null,
  program_type text not null check (program_type in ('milhas', 'pontos')),
  balance integer not null default 0,
  expiration_date date,
  value_per_point numeric(12,6) not null default 0.01,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_loyalty_programs_user_id_idx
  on public.travel_loyalty_programs (user_id);

create index if not exists travel_loyalty_programs_expiration_idx
  on public.travel_loyalty_programs (expiration_date);

alter table public.travel_loyalty_programs enable row level security;

create policy if not exists "Users can read own loyalty programs"
  on public.travel_loyalty_programs
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own loyalty programs"
  on public.travel_loyalty_programs
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own loyalty programs"
  on public.travel_loyalty_programs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete own loyalty programs"
  on public.travel_loyalty_programs
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_travel_loyalty_programs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists travel_loyalty_programs_updated_at on public.travel_loyalty_programs;
create trigger travel_loyalty_programs_updated_at
before update on public.travel_loyalty_programs
for each row
execute function public.set_travel_loyalty_programs_updated_at();
