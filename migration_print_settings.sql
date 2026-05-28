-- ============================================
-- MIGRAZIONE: print settings globali
-- Da: user_print_settings (per-utente)
-- A:  print_settings (globale, admin-only)
-- ============================================

BEGIN;

-- 1. Aggiungi colonna label a copy_types (nome visualizzato UI)
--    name rimane lo slug interno usato dal backend
ALTER TABLE public.copy_types
  ADD COLUMN IF NOT EXISTS label VARCHAR(100);

-- Imposta label = name per le righe esistenti
UPDATE public.copy_types SET label = name WHERE label IS NULL;

-- Rendi label NOT NULL ora che è popolata
ALTER TABLE public.copy_types
  ALTER COLUMN label SET NOT NULL;

-- 2. Crea la nuova tabella print_settings (configurazione globale)
CREATE TABLE IF NOT EXISTS public.print_settings (
  id               SERIAL PRIMARY KEY,
  copy_type_id     INTEGER NOT NULL REFERENCES public.copy_types(id) ON DELETE CASCADE,
  printer_type     VARCHAR(10) NOT NULL DEFAULT 'network' CHECK (printer_type IN ('network', 'usb')),
  printer_address  VARCHAR(255),
  enabled          BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(copy_type_id)
);

-- 3. Inserisci una riga di default per ogni copy_type esistente
INSERT INTO public.print_settings (copy_type_id, printer_type, enabled)
  SELECT id, 'network', false FROM public.copy_types
  ON CONFLICT (copy_type_id) DO NOTHING;

-- 4. Elimina la vecchia tabella user_print_settings
DROP TABLE IF EXISTS public.user_print_settings CASCADE;

COMMIT;
