import { pool } from '../db.js';
import logger from '../logger.js';

const slugCache = new Map();

function extractSlug(hostname) {
  const parts = hostname.split('.');
  if (parts.length < 3) return null;
  const slug = parts[0];
  return slug === 'www' ? null : slug;
}

export async function resolveTenantFromHost(req, res, next) {
  const slug = extractSlug(req.hostname);
  if (!slug) {
    return res.status(404).json({ error: 'Tenant non specificato nel dominio' });
  }

  try {
    let tenantId = slugCache.get(slug);
    if (tenantId === undefined) {
      const { rows } = await pool.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
      tenantId = rows[0]?.id ?? null;
      slugCache.set(slug, tenantId);
    }
    if (tenantId === null) {
      return res.status(404).json({ error: 'Tenant non trovato' });
    }
    req.tenantId = tenantId;
    next();
  } catch (err) {
    logger.error({ err }, 'Errore risoluzione tenant da sottodominio');
    res.status(500).json({ error: 'Errore interno' });
  }
}