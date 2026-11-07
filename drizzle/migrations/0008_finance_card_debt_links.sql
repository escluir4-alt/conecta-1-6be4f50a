-- Vínculos confirmados pelo titular entre obrigações e saldos de cartões.
-- Não altera registros históricos nem realiza conciliação presumida por texto/valor.
begin;
create table if not exists public.finance_card_debt_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  liability_key text not null check (char_length(liability_key) between 3 and 160),
  card_id text not null check (char_length(card_id) between 1 and 160),
  updated_at timestamptz not null default now(),
  primary key (user_id, liability_key)
);
create index if not exists finance_card_debt_links_by_card on public.finance_card_debt_links (user_id, card_id);
alter table public.finance_card_debt_links enable row level security;
revoke all on public.finance_card_debt_links from anon;
grant select, insert, update, delete on public.finance_card_debt_links to authenticated;
drop policy if exists "finance_card_debt_links_own_records" on public.finance_card_debt_links;
create policy "finance_card_debt_links_own_records"
on public.finance_card_debt_links for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
commit;
