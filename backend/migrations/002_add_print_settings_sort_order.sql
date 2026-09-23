-- Colonna per l'ordine di stampa delle copie (già applicata manualmente, idem sopra)
ALTER TABLE print_settings ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;