-- Perfis locais de apresentação e vínculo explícito com despesas anuais.
-- Os dados bancários originais permanecem imutáveis.
create table if not exists public.finance_account_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null check (length(account_id) between 1 and 200),
  display_name text check (length(display_name) <= 100),
  card_brand text check (card_brand in ('VISA','MASTERCARD','ELO','AMEX','HIPERCARD','OTHER')),
  annual_expense_id uuid references public.annual_expenses(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, account_id)
);
create unique index if not exists finance_account_profiles_annual_unique
  on public.finance_account_profiles (user_id, annual_expense_id)
  where annual_expense_id is not null;
alter table public.finance_account_profiles enable row level security;
revoke all on public.finance_account_profiles from anon;
grant select, insert, update, delete on public.finance_account_profiles to authenticated;
drop policy if exists finance_account_profiles_owner on public.finance_account_profiles;
create policy finance_account_profiles_owner on public.finance_account_profiles for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Histórico de faturas efetivamente fechadas; idempotência por cartão/competência.
create table if not exists public.finance_card_closed_invoices (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  period text not null check (period ~ '^\\d{4}-(0[1-9]|1[0-2])$'),
  closed_at date not null,
  due_date date not null,
  amount_cents bigint not null check (amount_cents >= 0),
  origin text not null check (origin in ('manual','provider')),
  provider_reference text,
  annual_expense_id uuid references public.annual_expenses(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, account_id, period)
);
alter table public.finance_card_closed_invoices enable row level security;
revoke all on public.finance_card_closed_invoices from anon;
grant select, insert, update, delete on public.finance_card_closed_invoices to authenticated;
drop policy if exists finance_card_closed_invoices_owner on public.finance_card_closed_invoices;
create policy finance_card_closed_invoices_owner on public.finance_card_closed_invoices for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
