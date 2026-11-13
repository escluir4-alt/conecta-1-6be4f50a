-- Axion: suporte ao campo Quita nas contas e parcelas.
-- Migração aditiva e idempotente: não remove, recalcula ou sobrescreve pagamentos históricos.
-- IMPORTANTE: executar somente depois de confirmar backup recuperável do banco.
BEGIN;

ALTER TABLE public.finance_bills
  ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT false;

ALTER TABLE public.installment_entries
  ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.finance_bills.is_settled IS
  'Quitação explicitamente confirmada pelo titular (Quita). Falso não significa ausência de pagamento parcial.';
COMMENT ON COLUMN public.installment_entries.is_settled IS
  'Quitação explicitamente confirmada pelo titular (Quita). Não inferir descontos sem confirmação.';

-- Uma operação de pagamento/revisão deve ser atômica, auditada e restrita ao titular.
-- SECURITY INVOKER conserva as políticas RLS existentes para finance_bills/installment_entries.
CREATE OR REPLACE FUNCTION public.record_expense_payment(
  p_bill_id text,
  p_contract_id text,
  p_number integer,
  p_paid_date date,
  p_paid_cents bigint,
  p_note text,
  p_is_settled boolean,
  p_revision boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $axion$
DECLARE
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para registrar pagamentos.';
  END IF;
  IF (p_bill_id IS NULL) = (p_contract_id IS NULL) THEN
    RAISE EXCEPTION 'Informe exatamente uma conta ou uma parcela.';
  END IF;
  IF p_bill_id IS NOT NULL AND p_number IS NOT NULL THEN
    RAISE EXCEPTION 'Número de parcela não se aplica ao pagamento desta conta.';
  END IF;
  IF p_contract_id IS NOT NULL AND (p_number IS NULL OR p_number < 1) THEN
    RAISE EXCEPTION 'Parcela inválida.';
  END IF;
  IF p_paid_date IS NULL OR p_paid_cents IS NULL OR p_paid_cents <= 0 THEN
    RAISE EXCEPTION 'Informe data e valor pago válido.';
  END IF;
  IF p_is_settled IS NULL OR p_revision IS NULL THEN
    RAISE EXCEPTION 'Informe explicitamente se a obrigação foi quitada e se é revisão.';
  END IF;
  IF length(coalesce(p_note, '')) > 1000 THEN
    RAISE EXCEPTION 'Observação muito longa.';
  END IF;

  IF p_bill_id IS NOT NULL THEN
    SELECT to_jsonb(b) INTO v_before
      FROM public.finance_bills AS b
      WHERE b.user_id = v_actor AND b.id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada para este usuário.'; END IF;
    IF p_revision AND v_before->>'paid_date' IS NULL THEN
      RAISE EXCEPTION 'Não é possível revisar uma conta sem pagamento anterior.';
    END IF;
    IF NOT p_revision AND v_before->>'paid_date' IS NOT NULL THEN
      RAISE EXCEPTION 'Esta conta já tem pagamento. Utilize a revisão.';
    END IF;

    UPDATE public.finance_bills AS b
      SET paid_date = p_paid_date,
          paid_cents = p_paid_cents,
          paid_note = coalesce(p_note, ''),
          is_settled = p_is_settled
      WHERE b.user_id = v_actor AND b.id = p_bill_id
      RETURNING to_jsonb(b) INTO v_after;

    PERFORM public.audit_append(
      CASE WHEN p_revision THEN 'revise_bill' ELSE 'pay_bill' END,
      'finance_bills', p_bill_id, v_before, v_after,
      jsonb_build_object('is_settled', p_is_settled, 'revision', p_revision)
    );
  ELSE
    SELECT to_jsonb(i) INTO v_before
      FROM public.installment_entries AS i
      WHERE i.user_id = v_actor AND i.contract_id = p_contract_id AND i.number = p_number FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada para este usuário.'; END IF;
    IF p_revision AND v_before->>'paid_date' IS NULL THEN
      RAISE EXCEPTION 'Não é possível revisar uma parcela sem pagamento anterior.';
    END IF;
    IF NOT p_revision AND v_before->>'paid_date' IS NOT NULL THEN
      RAISE EXCEPTION 'Esta parcela já tem pagamento. Utilize a revisão.';
    END IF;

    UPDATE public.installment_entries AS i
      SET paid_date = p_paid_date,
          paid_cents = p_paid_cents,
          note = coalesce(p_note, ''),
          is_settled = p_is_settled,
          updated_at = now()
      WHERE i.user_id = v_actor AND i.contract_id = p_contract_id AND i.number = p_number
      RETURNING to_jsonb(i) INTO v_after;

    PERFORM public.audit_append(
      CASE WHEN p_revision THEN 'revise_installment' ELSE 'pay_installment' END,
      'installment_entries', p_contract_id || ':' || p_number,
      v_before, v_after,
      jsonb_build_object('is_settled', p_is_settled, 'revision', p_revision)
    );
  END IF;
END;
$axion$;

REVOKE ALL ON FUNCTION public.record_expense_payment(
  text, text, integer, date, bigint, text, boolean, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_expense_payment(
  text, text, integer, date, bigint, text, boolean, boolean
) TO authenticated;

-- PostgREST deve reconhecer as colunas e a nova RPC após a migração.
NOTIFY pgrst, 'reload schema';
COMMIT;
