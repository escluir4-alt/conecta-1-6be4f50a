ALTER TABLE public.revenue_contracts ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS postal_code text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS down_payment_cents bigint NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Em andamento';
GRANT UPDATE ON public.revenue_contracts TO authenticated;
CREATE POLICY revenue_contracts_update_own ON public.revenue_contracts FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.revenue_create_contract(p_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; total bigint; downpay bigint; n int; first_date date; plan jsonb; i int; part bigint; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
total:=(p_data->>'total_cents')::bigint; downpay:=coalesce((p_data->>'down_payment_cents')::bigint,0); n:=(p_data->>'count')::int; first_date:=(p_data->>'first_due')::date; plan:=p_data->'plan';
IF total<1 OR downpay<0 OR downpay>=total OR n<1 OR n>600 OR total-downpay<n OR length(trim(p_data->>'buyer')) NOT BETWEEN 1 AND 200 OR length(trim(p_data->>'title')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Contrato inválido'; END IF;
IF plan IS NOT NULL AND (jsonb_array_length(plan)<>n OR (SELECT sum(value::bigint) FROM jsonb_array_elements_text(plan))<>total-downpay OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(plan) WHERE value::bigint<1)) THEN RAISE EXCEPTION 'Parcelamento inválido'; END IF;
INSERT INTO public.revenue_contracts(user_id,title,buyer,cpf,rg,total_cents,count,first_due,interest_percent,fine_percent,correction_index,address,postal_code,city,state,phone,email,down_payment_cents,note)
VALUES(auth.uid(),p_data->>'title',p_data->>'buyer',coalesce(p_data->>'cpf',''),coalesce(p_data->>'rg',''),total,n,first_date,(p_data->>'interest_percent')::numeric,(p_data->>'fine_percent')::numeric,p_data->>'correction_index',coalesce(p_data->>'address',''),coalesce(p_data->>'postal_code',''),coalesce(p_data->>'city',''),coalesce(p_data->>'state',''),coalesce(p_data->>'phone',''),coalesce(p_data->>'email',''),downpay,coalesce(p_data->>'note','')) RETURNING id INTO cid;
FOR i IN 0..n-1 LOOP
part:=CASE WHEN plan IS NOT NULL THEN (plan->>i)::bigint ELSE (total-downpay)/n+CASE WHEN i<(total-downpay)%n THEN 1 ELSE 0 END END;
INSERT INTO public.revenue_entries(user_id,contract_id,number,title,category,expected_cents,due_date) VALUES(auth.uid(),cid,i+1,p_data->>'title','Crediário',part,(date_trunc('month',first_date)+(i||' months')::interval)::date+least(extract(day FROM first_date)::int,extract(day FROM (date_trunc('month',first_date)+((i+1)||' months')::interval-interval '1 day'))::int)-1);
END LOOP; RETURN cid; END $$;
CREATE OR REPLACE FUNCTION public.revenue_contract_completion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.contract_id IS NOT NULL THEN
UPDATE public.revenue_contracts c SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM public.revenue_entries e WHERE e.contract_id=c.id AND (e.received_date IS NULL OR coalesce(e.received_cents,0)<coalesce((e.adjustment->>'agreed')::bigint,e.expected_cents))) THEN 'Concluído' WHEN c.status='Concluído' THEN 'Em andamento' ELSE c.status END WHERE c.id=NEW.contract_id;
END IF; RETURN NEW; END $$;
CREATE TRIGGER revenue_contract_completion AFTER UPDATE OF received_date,received_cents,adjustment ON public.revenue_entries FOR EACH ROW EXECUTE FUNCTION public.revenue_contract_completion();
CREATE OR REPLACE FUNCTION public.revenue_edit_installment(p_id uuid,p_due date,p_cents bigint,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE oldrow public.revenue_entries; BEGIN
SELECT * INTO oldrow FROM public.revenue_entries WHERE id=p_id AND user_id=auth.uid() AND contract_id IS NOT NULL FOR UPDATE;
IF NOT FOUND OR oldrow.received_date IS NOT NULL THEN RAISE EXCEPTION 'Parcela recebida deve ser corrigida pelo recebimento'; END IF;
IF p_due IS NULL OR p_cents<1 OR p_cents>999999999999 OR length(p_note)>2000 THEN RAISE EXCEPTION 'Parcela inválida'; END IF;
UPDATE public.revenue_entries SET due_date=p_due,expected_cents=p_cents,note=p_note,adjustment=NULL WHERE id=p_id;
INSERT INTO public.revenue_events(user_id,entry_id,kind,before_data,after_data) VALUES(auth.uid(),p_id,'edição',to_jsonb(oldrow),jsonb_build_object('due_date',p_due,'expected_cents',p_cents,'note',p_note)); END $$;
REVOKE ALL ON FUNCTION public.revenue_edit_installment(uuid,date,bigint,text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.revenue_edit_installment(uuid,date,bigint,text) TO authenticated;