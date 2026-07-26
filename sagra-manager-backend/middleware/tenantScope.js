import { pool } from '../db.js';
import logger from '../logger.js';

// Va usato SEMPRE dopo `authenticate` (serve req.user.tenantId).
// Acquisisce una connessione dedicata dal pool (non condivisa con altre
// richieste finché non viene rilasciata) e vi imposta app.tenant_id a
// livello di sessione: le policy RLS su ogni tabella la useranno per
// filtrare automaticamente le righe di quel tenant.
//
// Ogni route deve usare `req.db.query(...)` al posto di `pool.query(...)`.
// Non usare mai `pool.query` direttamente su tabelle tenant-scoped: quella
// query girerebbe su una connessione qualsiasi del pool, senza garanzia che
// app.tenant_id sia impostato correttamente (o addirittura con un tenant_id
// "sporco" lasciato da una richiesta precedente).
export async function tenantScope(req, res, next) {
  if (!req.user?.tenantId) {
    return res.status(403).json({ error: 'Tenant mancante nel token' });
  }

  const client = await pool.connect();
  try {
    await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', String(req.user.tenantId)]);
  } catch (err) {
    client.release();
    logger.error({ err }, 'Errore impostazione tenant scope');
    return res.status(500).json({ error: 'Errore interno' });
  }

  req.db = client;
  let released = false;

  const releaseClient = async () => {
    if (released) return;
    released = true;
    try {
      await client.query('RESET app.tenant_id');
    } catch {
    } finally {
      client.release();
    }
  };

  res.on('finish', releaseClient);
  res.on('close', releaseClient);

  next();
}

// Per lavori asincroni "fire-and-forget" che sopravvivono alla risposta HTTP
// (es. stampa in background dopo aver già risposto al client): non si può
// usare req.db, perché a quel punto è già stato rilasciato al pool. Questa
// funzione acquisisce/scopa/rilascia una connessione dedicata autonomamente.
export async function withTenantClient(tenantId, fn) {
  const client = await pool.connect();
  try {
    await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', String(tenantId)]);
    return await fn(client);
  } finally {
    try { await client.query('RESET app.tenant_id'); } catch { /* connessione probabilmente già chiusa */ }
    client.release();
  }
}