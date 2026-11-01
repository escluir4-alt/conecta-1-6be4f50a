CREATE TABLE public.invoice_recipients (
 user_id uuid PRIMARY KEY,
 key text NOT NULL CHECK (length(key) BETWEEN 1 AND 77),
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
 state text NOT NULL CHECK (state ~ '^[A-Z]{2}$'),
 city text NOT NULL CHECK (length(city) BETWEEN 1 AND 200),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_recipients TO authenticated;
GRANT ALL ON public.invoice_recipients TO service_role;
ALTER TABLE public.invoice_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_recipients_own ON public.invoice_recipients FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());