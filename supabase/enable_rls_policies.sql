-- Server-only access: application sessions are verified by Express, not Supabase Auth.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
-- Run after the existing schema. No business data is deleted.
BEGIN;
DO $$
DECLARE table_name text; policy_record record;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','roles','permissions','role_permissions','categories','students','transactions','student_fees','payments'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', policy_record.policyname, table_name);
      END LOOP;
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
