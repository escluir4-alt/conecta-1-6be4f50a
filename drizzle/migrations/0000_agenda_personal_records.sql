CREATE TABLE public.agenda_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 kind text NOT NULL CHECK (kind IN ('birthday','work','appointment','event','tasks','shopping')),
 title text NOT NULL, start_date date NOT NULL, time text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '', recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly','yearly','12x36')),
 favorite boolean NOT NULL DEFAULT false, reminder boolean NOT NULL DEFAULT true,
 items jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_records TO authenticated;
GRANT ALL ON public.agenda_records TO service_role;
ALTER TABLE public.agenda_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY agenda_records_own ON public.agenda_records FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX agenda_records_owner ON public.agenda_records(user_id);
CREATE TABLE public.agenda_checks (
 record_id uuid NOT NULL REFERENCES public.agenda_records(id) ON DELETE CASCADE,
 user_id uuid NOT NULL, occurrence_date date NOT NULL, item_key text NOT NULL,
 done boolean NOT NULL DEFAULT false, PRIMARY KEY(record_id, occurrence_date, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_checks TO authenticated;
GRANT ALL ON public.agenda_checks TO service_role;
ALTER TABLE public.agenda_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY agenda_checks_own ON public.agenda_checks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.agenda_records r WHERE r.id = record_id AND r.user_id = auth.uid()));