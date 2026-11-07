-- Histórico de extratos retornados pelo Open Finance (sem substituir a fonte bancária).
CREATE TABLE IF NOT EXISTS public.finance_card_month_snapshots (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  period text NOT NULL CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  transactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  available_limit_cents bigint,
  total_limit_cents bigint,
  used_limit_cents bigint,
  closing_date date,
  due_date date,
  invoice_cents bigint,
  provider_invoice_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, account_id, period)
);
ALTER TABLE public.finance_card_month_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_card_month_snapshots FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_card_month_snapshots TO authenticated;
DROP POLICY IF EXISTS finance_card_month_snapshots_owner ON public.finance_card_month_snapshots;
CREATE POLICY finance_card_month_snapshots_owner ON public.finance_card_month_snapshots
 FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()))
 WITH CHECK (user_id = (SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS finance_card_snapshots_by_period ON public.finance_card_month_snapshots (user_id, period);
