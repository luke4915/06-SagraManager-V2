import { pool } from '../db.js';
import logger from '../logger.js';

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

export async function withTenantClient(tenantId, fn) {
  const client = await pool.connect();
  try {
    await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', String(tenantId)]);
    return await fn(client);
  } finally {
    try { await client.query('RESET app.tenant_id'); } catch {}
    client.release();
  }
}

export async function lookupUserForLogin(username) {
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.allow_login_lookup', 'true', false)");
    const { rows } = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] || null;
  } finally {
    try { await client.query("RESET app.allow_login_lookup"); } catch {}
    client.release();
  }
}
