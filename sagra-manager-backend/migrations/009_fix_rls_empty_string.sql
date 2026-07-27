BEGIN;
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['products', 'orders', 'sessions', 'copy_types', 'print_settings', 'settings'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::int)',
      tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int
    OR current_setting('app.allow_login_lookup', true) = 'true'
  );
COMMIT;
