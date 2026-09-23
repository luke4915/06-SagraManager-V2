-- Rende order_type sempre valorizzato e vincolato ai soli valori ammessi
-- dalla nuova logica di sconti/omaggi (sale | gift | discount).

-- 1. Backfill di sicurezza: nessun record dovrebbe averlo nullo, ma preveniamo
UPDATE orders SET order_type = 'sale' WHERE order_type IS NULL OR order_type = '';

-- 2. Default esplicito + NOT NULL
ALTER TABLE orders ALTER COLUMN order_type SET DEFAULT 'sale';
ALTER TABLE orders ALTER COLUMN order_type SET NOT NULL;

-- 3. CHECK constraint sui valori ammessi (idempotente: Postgres non supporta
--    "ADD CONSTRAINT IF NOT EXISTS", quindi controlliamo prima manualmente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_type_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
      CHECK (order_type IN ('sale', 'gift', 'discount'));
  END IF;
END $$;