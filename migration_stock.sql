-- Aggiunge gestione stock ai prodotti
BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stock_enabled BOOLEAN NOT NULL DEFAULT false;

-- stock = NULL significa "illimitato"
-- stock_enabled = false significa che non si usa la gestione stock per quel prodotto

COMMIT;
