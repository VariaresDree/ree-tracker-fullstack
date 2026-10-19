-- Row-level security on every table, as the older tables already have it.
--
-- Supabase exposes the public schema through its REST API to the anon and
-- authenticated roles. The app never uses that API (the backend connects as
-- the tables' owner, which RLS doesn't restrict), and those roles hold no
-- grants on these tables today, so nothing is exposed. RLS with no policies
-- keeps it that way if a grant is ever added by mistake: the API would see
-- no rows. Tables added since the baseline were created without it.
--
-- Idempotent: ENABLE on a table that has it already is a no-op.
DO $$
DECLARE t record;
BEGIN
    FOR t IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema()
          AND c.relkind = 'r'
          AND c.relname <> '_prisma_migrations'
          AND NOT c.relrowsecurity
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.relname);
    END LOOP;
END $$;
