CREATE OR REPLACE FUNCTION public.revenue_edit_source(p_id uuid, p_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE old_source public.revenue_sources; new_source public.revenue_sources; horizon date; first_date date; cents bigint; category_name text;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
SELECT * INTO old_source FROM public.revenue_sources WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Fonte de renda não encontrada'; END IF;
PERFORM id FROM public.revenue_entries WHERE source_id=p_id AND user_id=auth.uid() FOR UPDATE;
first_date := (p_data->>'first_due')::date; cents := (p_data->>'expected_cents')::bigint; category_name := p_data->>'category';
IF first_date IS NULL OR cents IS NULL OR cents < 1 OR cents > 999999999999 OR coalesce(length(trim(p_data->>'title')),0) NOT BETWEEN 1 AND 200 OR category_name IS NULL OR category_name NOT IN ('Salário','Benefício','Empréstimo Devolvido','Renda Extra','Doação','Outros Rendimentos') OR jsonb_typeof(p_data->'details') IS DISTINCT FROM 'object' OR jsonb_typeof(p_data->'recurring') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Cadastro de receita inválido'; END IF;
IF category_name='Benefício' AND (coalesce(trim(p_data->'details'->>'source'),'')='' OR coalesce(trim(p_data->'details'->>'benefit'),'')='') THEN RAISE EXCEPTION 'Informe fonte e número do benefício'; END IF;
IF category_name='Empréstimo Devolvido' AND (coalesce(trim(p_data->'details'->>'source'),'')='' OR coalesce(trim(p_data->'details'->>'original'),'')='') THEN RAISE EXCEPTION 'Informe de quem e a data original do empréstimo'; END IF;
SELECT greatest(coalesce(max(due_date),first_date),first_date,(now() AT TIME ZONE 'America/Sao_Paulo')::date) INTO horizon FROM public.revenue_entries WHERE source_id=p_id AND user_id=auth.uid();
UPDATE public.revenue_sources SET title=trim(p_data->>'title'), category=category_name, expected_cents=cents, first_due=first_date, recurring=(p_data->>'recurring')::boolean, details=p_data->'details' WHERE id=p_id AND user_id=auth.uid() RETURNING * INTO new_source;
DELETE FROM public.revenue_entries WHERE source_id=p_id AND user_id=auth.uid() AND received_date IS NULL;
PERFORM public.revenue_sync(horizon);
DELETE FROM public.revenue_entries e WHERE e.source_id=p_id AND e.user_id=auth.uid() AND e.received_date IS NULL AND EXISTS (SELECT 1 FROM public.revenue_entries paid WHERE paid.source_id=p_id AND paid.user_id=auth.uid() AND paid.received_date IS NOT NULL AND date_trunc('month',paid.due_date)=date_trunc('month',e.due_date));
PERFORM public.audit_append('editar receita','revenue_source',p_id::text,to_jsonb(old_source),to_jsonb(new_source),NULL);
END $function$;
REVOKE ALL ON FUNCTION public.revenue_edit_source(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revenue_edit_source(uuid,jsonb) TO authenticated, service_role;