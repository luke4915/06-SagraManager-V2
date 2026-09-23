BEGIN;
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['users', 'products', 'orders', 'sessions', 'copy_types', 'print_settings'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT NULLIF(current_setting(''app.tenant_id'', true), '''')::int',
      tbl
    );
  END LOOP;
END $$;
COMMIT;