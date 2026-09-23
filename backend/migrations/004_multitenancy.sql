-- ============================================
-- MULTI-TENANCY: tabella tenants + RLS
-- ============================================
BEGIN;

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant "legacy" per i dati esistenti (il tuo DB attuale, migrato da Windows).
-- Ogni riga preesistente viene assegnata a questo tenant di default.
INSERT INTO tenants (slug, name, plan)
  VALUES ('default', 'Stand Manager (legacy)', 'internal')
  ON CONFLICT (slug) DO NOTHING;

-- Helper: applica tenant_id + RLS a una tabella già esistente, con backfill
-- verso il tenant "default" per non rompere i dati già presenti.
DO $$
DECLARE
  default_tenant_id INT;
  tbl TEXT;
  tables TEXT[] := ARRAY['users', 'products', 'orders', 'sessions', 'copy_types', 'print_settings'];
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default';

  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id)', tbl);
    EXECUTE format('UPDATE %I SET tenant_id = $1 WHERE tenant_id IS NULL', tbl) USING default_tenant_id;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', tbl);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant ON %I (tenant_id)', tbl, tbl);

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl); -- vale anche per l''owner della tabella
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::int)',
      tbl
    );
  END LOOP;
END $$;

COMMIT;