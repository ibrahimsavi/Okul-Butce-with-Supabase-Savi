-- Unsafe legacy entry point intentionally disabled.
DO $$ BEGIN RAISE EXCEPTION 'RLS must remain enabled. Run harden_access.sql instead.'; END $$;
