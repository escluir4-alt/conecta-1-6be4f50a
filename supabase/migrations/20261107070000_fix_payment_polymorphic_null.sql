-- Corrige o erro PostgreSQL 42804 "could not determine polymorphic type because input has type unknown".
-- A chamada to_jsonb(NULL) não permite inferir o tipo; usar NULL::jsonb.
-- Mantém a autorização por auth.uid() e a auditoria, sem alterar dados já gravados.
CREATE OR REPLACE FUNCTION public.pay_bill(
  p_bill_id text, p_paid_date date, p_paid_cents bigint, p_note text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  UPDATE public.finance_bills
     SET paid_cents = p_paid_cents, paid_date = p_paid_date, paid_note = p_note
   WHERE user_id = auth.uid() AND id = p_bill_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'conta não encontrada'; END IF;
  PERFORM public.audit_append(
    'pay_bill', 'finance_bills', p_bill_id, NULL::jsonb,
    jsonb_build_object('paid_cents', p_paid_cents, 'paid_date', p_paid_date, 'paid_note', p_note), '{}'::jsonb
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.pay_installment(
  p_contract_id text, p_number integer, p_paid_date date, p_paid_cents bigint, p_note text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  UPDATE public.installment_entries
     SET paid_cents = p_paid_cents, paid_date = p_paid_date, note = p_note
   WHERE user_id = auth.uid() AND contract_id = p_contract_id AND number = p_number;
  IF NOT FOUND THEN RAISE EXCEPTION 'parcela não encontrada'; END IF;
  PERFORM public.audit_append(
    'pay_installment', 'installment_entries', p_contract_id || ':' || p_number, NULL::jsonb,
    jsonb_build_object('paid_cents', p_paid_cents, 'paid_date', p_paid_date, 'note', p_note), '{}'::jsonb
  );
END;
$function$;
