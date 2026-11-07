-- Ajustes manuais dos limites dos cartões; não altera dados originais do Open Finance.
-- Os valores persistem por usuário e conta, e somente o titular autenticado acessa seus ajustes.
CREATE TABLE IF NOT EXISTS public.finance_card_limit_overrides (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  limit_cents bigint NOT NULL CHECK (limit_cents >= 0),
  used_cents bigint NOT NULL CHECK (used_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, account_id)
);
ALTER TABLE public.finance_card_limit_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_card_limit_overrides_owner ON public.finance_card_limit_overrides;
CREATE POLICY finance_card_limit_overrides_owner ON public.finance_card_limit_overrides
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.finance_card_limit_overrides FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_card_limit_overrides TO authenticated;
