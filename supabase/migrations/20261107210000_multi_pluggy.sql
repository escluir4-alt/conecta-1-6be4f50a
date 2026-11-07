-- Existing Pluggy credentials and Items remain in place; every existing Item stays on primary.
ALTER TABLE public.pluggy_items ADD COLUMN IF NOT EXISTS connection_slot text NOT NULL DEFAULT 'primary'
  CHECK (connection_slot IN ('primary','secondary'));
CREATE INDEX IF NOT EXISTS pluggy_items_slot_user_idx ON public.pluggy_items(user_id,connection_slot);

-- Separate server-only vault for second application. No client access to credentials.
CREATE TABLE IF NOT EXISTS public.pluggy_secondary_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL CHECK (length(client_id) BETWEEN 8 AND 100),
  client_secret text NOT NULL CHECK (length(client_secret) BETWEEN 8 AND 200),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pluggy_secondary_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pluggy_secondary_credentials FROM PUBLIC, anon, authenticated;
-- No RLS policies: only backend service-role operations may read/write these secrets.
COMMENT ON TABLE public.pluggy_secondary_credentials IS
  'Second Pluggy app credentials, server access only; primary credentials retained in pluggy_credentials.';

-- Prevent removing account ownership association when the origin is changed.
CREATE OR REPLACE FUNCTION public.prevent_pluggy_item_slot_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.connection_slot IS DISTINCT FROM OLD.connection_slot THEN
    RAISE EXCEPTION 'Changing Pluggy connection origin is not allowed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pluggy_items_slot_locked ON public.pluggy_items;
CREATE TRIGGER pluggy_items_slot_locked BEFORE UPDATE ON public.pluggy_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_pluggy_item_slot_change();
