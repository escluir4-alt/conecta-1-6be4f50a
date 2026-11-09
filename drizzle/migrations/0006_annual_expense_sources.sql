-- Complementa a migração de classificação de consumo 20261109010000.
-- Vínculos de origem por exercício sem alterar valores, parcelas ou histórico.
ALTER TABLE public.annual_expenses
  ADD COLUMN IF NOT EXISTS expense_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_contract_id text,
  ADD COLUMN IF NOT EXISTS source_template_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'annual_expenses_source_chk') THEN
    ALTER TABLE public.annual_expenses ADD CONSTRAINT annual_expenses_source_chk
      CHECK (expense_source IN ('manual', 'contract', 'card', 'consumption'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS annual_expenses_source_contract_year_unique
  ON public.annual_expenses (user_id, year, source_contract_id)
  WHERE source_contract_id IS NOT NULL;
COMMENT ON COLUMN public.annual_expenses.source_contract_id IS
  'Vínculo explícito com installment_contracts.id, de propriedade do mesmo usuário.';
COMMENT ON COLUMN public.annual_expenses.expense_source IS
  'manual / contract / card / consumption. Cartões usam finance_account_profiles.annual_expense_id.';

-- Protege contra duplicação de uma mesma despesa fixa ao longo dos anos.
CREATE UNIQUE INDEX IF NOT EXISTS annual_expenses_source_template_year_unique
  ON public.annual_expenses (user_id, year, source_template_id)
  WHERE source_template_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
