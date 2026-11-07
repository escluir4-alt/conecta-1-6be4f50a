-- Corrige PostgreSQL: audit_log.actor e UUID; auth.uid()::text nao pode ser inserido.
-- Conserva historico, autorizacao e todos os dados financeiros.
CREATE OR REPLACE FUNCTION public.audit_append(
  p_action text, p_entity_type text, p_entity_id text,
  p_before jsonb, p_after jsonb, p_details jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log
    (user_id, actor, action, entity_type, entity_id, before_json, after_json, details_json)
  VALUES
    (auth.uid(), auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after, p_details);
END;
$function$;
