-- Classificação explícita das obrigações: consumo não é dívida contratada.
-- Conserva todos os registros e pagamentos existentes; migração sem recálculo destrutivo.
ALTER TABLE public.annual_expenses
  ADD COLUMN IF NOT EXISTS expense_kind text NOT NULL DEFAULT 'debt',
  ADD COLUMN IF NOT EXISTS consumption_value_type text NOT NULL DEFAULT 'fixed';

ALTER TABLE public.finance_bills
  ADD COLUMN IF NOT EXISTS expense_kind text NOT NULL DEFAULT 'debt';

COMMENT ON COLUMN public.annual_expenses.expense_kind IS
  'debt = obrigação do painel anual; consumption = consumo apurado/pago em indicadores próprios';
COMMENT ON COLUMN public.annual_expenses.consumption_value_type IS
  'fixed ou variable; classificação para gestão de cobrança mensal';
COMMENT ON COLUMN public.finance_bills.expense_kind IS
  'debt ou consumption; lançamentos avulsos podem ser explicitamente classificados';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'annual_expenses_kind_chk') THEN
    ALTER TABLE public.annual_expenses ADD CONSTRAINT annual_expenses_kind_chk
      CHECK (expense_kind IN ('debt', 'consumption'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'annual_expenses_value_type_chk') THEN
    ALTER TABLE public.annual_expenses ADD CONSTRAINT annual_expenses_value_type_chk
      CHECK (consumption_value_type IN ('fixed', 'variable'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_bills_kind_chk') THEN
    ALTER TABLE public.finance_bills ADD CONSTRAINT finance_bills_kind_chk
      CHECK (expense_kind IN ('debt', 'consumption'));
  END IF;
END $$;
