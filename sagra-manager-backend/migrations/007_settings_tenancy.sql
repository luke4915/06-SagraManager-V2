-- ============================================
-- MULTI-TENANCY: tabella settings (schema drift, non in schema.sql)
-- ============================================
BEGIN;

DO $$
DECLARE
  default_tenant_id INT;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default';

  ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
  UPDATE settings SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  ALTER TABLE settings ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE settings ALTER COLUMN tenant_id SET DEFAULT NULLIF(current_setting('app.tenant_id', true), '')::int;

  -- Il vincolo UNIQUE su "key" da solo impedirebbe a due tenant diversi di
  -- avere entrambi, es., la chiave "welcome_message". Va sostituito con uno
  -- composito. Il nome del vincolo originale può variare: lo cerchiamo.
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'settings'::regclass AND contype = 'u' AND array_length(conkey, 1) = 1
  ) THEN
    EXECUTE (
      SELECT format('ALTER TABLE settings DROP CONSTRAINT %I', conname)
      FROM pg_constraint WHERE conrelid = 'settings'::regclass AND contype = 'u' AND array_length(conkey, 1) = 1
      LIMIT 1
    );
  END IF;
  ALTER TABLE settings ADD CONSTRAINT settings_tenant_key_unique UNIQUE (tenant_id, key);

  CREATE INDEX IF NOT EXISTS idx_settings_tenant ON settings (tenant_id);

  ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE settings FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS tenant_isolation ON settings;
  CREATE POLICY tenant_isolation ON settings
    USING (tenant_id = current_setting('app.tenant_id', true)::int);
END $$;

COMMIT;
