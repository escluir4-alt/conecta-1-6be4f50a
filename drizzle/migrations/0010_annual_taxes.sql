-- Tributos anuais (IPTU, IPVA e outros) no mesmo cadastro de Despesas Anuais.
-- Aplicar após 20261109010000 e 20261109020000; não altera valores nem pagamentos existentes.
ALTER TABLE public.annual_expenses
  ADD COLUMN IF NOT EXISTS annual_tax_kind text;

-- Amplia a classificação existente, sem recriar a tabela ou excluir dados.
ALTER TABLE public.annual_expenses
  DROP CONSTRAINT IF EXISTS annual_expenses_source_chk;
ALTER TABLE public.annual_expenses
  ADD CONSTRAINT annual_expenses_source_chk
  CHECK (expense_source IN ('manual', 'contract', 'card', 'consumption', 'annual_tax'));

ALTER TABLE public.annual_expenses
  DROP CONSTRAINT IF EXISTS annual_expenses_tax_kind_chk;
ALTER TABLE public.annual_expenses
  ADD CONSTRAINT annual_expenses_tax_kind_chk
  CHECK (
    (expense_source <> 'annual_tax' AND annual_tax_kind IS NULL)
    OR (expense_source = 'annual_tax' AND annual_tax_kind IN ('iptu', 'ipva', 'other'))
  );

COMMENT ON COLUMN public.annual_expenses.annual_tax_kind IS
  'Tipo de tributo anual: iptu, ipva ou other. Obrigação do exercício, nunca consumo.';

NOTIFY pgrst, 'reload schema';
