-- Aggiunge la colonna per gli ordini da asporto (già applicata manualmente,
-- questo file la documenta e la rende riproducibile su nuove installazioni)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_takeaway BOOLEAN NOT NULL DEFAULT false;