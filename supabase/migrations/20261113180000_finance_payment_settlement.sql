-- Registro de pagamento: quitação explícita, desconto/acréscimo e auditoria.
-- Aplicar somente após backup verificável. Não altera valores previstos nem pagamentos.
-- Retrocompatibilidade: pagamentos históricos iguais/superiores ao devido são
-- identificados como quitados; descontos antigos requerem confirmação manual.
DO $migration$
BEGIN
  IF to_regclass('public.finance_bills') IS NULL OR to_regclass('public.installment_entries') IS NULL THEN
    RAISE EXCEPTION 'Tabelas de pagamentos ausentes. Migração cancelada.';
  END IF;
  IF to_regprocedure('public.audit_append(text,text,text,jsonb,jsonb,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Auditoria indisponível. Migração cancelada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'finance_bills' AND column_name = 'is_settled'
  ) THEN
    ALTER TABLE public.finance_bills ADD COLUMN is_settled boolean NOT NULL DEFAULT false;
    UPDATE public.finance_bills
      SET is_settled = true
      WHERE paid_date IS NOT NULL AND paid_cents >= expected_cents;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'installment_entries' AND column_name = 'is_settled'
  ) THEN
    ALTER TABLE public.installment_entries ADD COLUMN is_settled boolean NOT NULL DEFAULT false;
    UPDATE public.installment_entries
      SET is_settled = true
      WHERE paid_date IS NOT NULL AND paid_cents >= expected_cents;
  END IF;
END
$migration$;

COMMENT ON COLUMN public.finance_bills.is_settled IS
  'Quitação expressamente confirmada. Valores pagos inferiores podem representar desconto; sem confirmação, saldo em aberto.';
COMMENT ON COLUMN public.installment_entries.is_settled IS
  'Quitação expressamente confirmada da parcela; independente do valor pago.';

/**
 * Uma transação atômica para pagamento ou correção de contas e parcelas.
 * Mantém o valor efetivamente pago e o valor previsto separados, e registra
 * a confirmação de quitação. A autorização é sempre restrita a auth.uid().
 */
CREATE OR REPLACE FUNCTION public.record_expense_payment(
  p_bill_id text,
  p_contract_id text,
  p_number integer,
  p_paid_date date,
  p_paid_cents bigint,
  p_note text,
  p_is_settled boolean,
  p_revision boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_entity_id text;
  v_entity_type text;
  v_action text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  IF p_paid_date IS NULL OR p_paid_cents IS NULL OR p_paid_cents <= 0
    OR p_is_settled IS NULL OR p_revision IS NULL
    OR length(coalesce(p_note,'')) > 1000 THEN
    RAISE EXCEPTION 'Dados do pagamento inválidos';
  END IF;
  IF (p_bill_id IS NULL) = (p_contract_id IS NULL)
     OR (p_bill_id IS NOT NULL AND p_number IS NOT NULL)
     OR (p_contract_id IS NOT NULL AND (p_number IS NULL OR p_number < 1)) THEN
    RAISE EXCEPTION 'Origem de pagamento inválida';
  END IF;

  IF p_bill_id IS NOT NULL THEN
    SELECT to_jsonb(b) INTO v_before FROM public.finance_bills b
      WHERE b.user_id = auth.uid() AND b.id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
    IF p_revision AND v_before->>'paid_date' IS NULL THEN
      RAISE EXCEPTION 'Nenhum pagamento anterior para corrigir';
    END IF;
    IF NOT p_revision AND v_before->>'paid_date' IS NOT NULL THEN
      RAISE EXCEPTION 'Pagamento já registrado. Use a correção.';
    END IF;
    UPDATE public.finance_bills
      SET paid_date = p_paid_date, paid_cents = p_paid_cents,
          paid_note = coalesce(p_note,''), is_settled = p_is_settled
      WHERE user_id = auth.uid() AND id = p_bill_id;
    SELECT to_jsonb(b) INTO v_after FROM public.finance_bills b
      WHERE b.user_id = auth.uid() AND b.id = p_bill_id;
    v_entity_id := p_bill_id;
    v_entity_type := 'finance_bills';
    v_action := CASE WHEN p_revision THEN 'revise_bill' ELSE 'pay_bill' END;
  ELSE
    SELECT to_jsonb(e) INTO v_before FROM public.installment_entries e
      WHERE e.user_id = auth.uid() AND e.contract_id = p_contract_id
        AND e.number = p_number FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada'; END IF;
    IF p_revision AND v_before->>'paid_date' IS NULL THEN
      RAISE EXCEPTION 'Nenhum pagamento anterior para corrigir';
    END IF;
    IF NOT p_revision AND v_before->>'paid_date' IS NOT NULL THEN
      RAISE EXCEPTION 'Pagamento já registrado. Use a correção.';
    END IF;
    UPDATE public.installment_entries
      SET paid_date = p_paid_date, paid_cents = p_paid_cents,
          note = coalesce(p_note,''), is_settled = p_is_settled
      WHERE user_id = auth.uid() AND contract_id = p_contract_id AND number = p_number;
    SELECT to_jsonb(e) INTO v_after FROM public.installment_entries e
      WHERE e.user_id = auth.uid() AND e.contract_id = p_contract_id AND e.number = p_number;
    v_entity_id := p_contract_id || ':' || p_number::text;
    v_entity_type := 'installment_entries';
    v_action := CASE WHEN p_revision THEN 'revise_installment' ELSE 'pay_installment' END;
  END IF;

  PERFORM public.audit_append(
    v_action, v_entity_type, v_entity_id, v_before, v_after,
    jsonb_build_object(
      'settled', p_is_settled,
      'discount_cents', CASE WHEN p_is_settled THEN greatest(0, ((v_after->>'expected_cents')::bigint - p_paid_cents)) ELSE 0 END,
      'surcharge_cents', CASE WHEN p_is_settled THEN greatest(0, p_paid_cents - (v_after->>'expected_cents')::bigint) ELSE 0 END
    )
  );
END
$function$;

REVOKE ALL ON FUNCTION public.record_expense_payment(text,text,integer,date,bigint,text,boolean,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_expense_payment(text,text,integer,date,bigint,text,boolean,boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_expense_payment(text,text,integer,date,bigint,text,boolean,boolean) TO authenticated;
