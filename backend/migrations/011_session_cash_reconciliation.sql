-- Implementazione quadratura di cassa a fine sessione

BEGIN;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS declared_cash NUMERIC(10,2);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expected_cash NUMERIC(10,2);
COMMIT;