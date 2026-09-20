-- LOGIN LOOKUP: policy dedicata su users

BEGIN;
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.allow_login_lookup', true) = 'true'
  );
COMMIT;