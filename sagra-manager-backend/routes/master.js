import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authenticateMaster } from '../middleware/authenticateMaster.js';
import logger from '../logger.js';

const router = express.Router();

const setMasterCookie = (res, token) => res.cookie('master_token', token, {
  httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 1000 * 60 * 60 * 4,
});

router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password richiesta' });
  if (!process.env.MASTER_PASSWORD_HASH || !process.env.MASTER_JWT_SECRET) {
    return res.status(500).json({ error: 'Pannello master non configurato' });
  }
  const valid = await bcrypt.compare(password, process.env.MASTER_PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: 'Password errata' });
  const token = jwt.sign({ master: true }, process.env.MASTER_JWT_SECRET, { expiresIn: '4h' });
  setMasterCookie(res, token);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.cookie('master_token', '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', expires: new Date(0) });
  res.json({ ok: true });
});

router.get('/tenants', authenticateMaster, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, COUNT(u.id) AS user_count
       FROM tenants t LEFT JOIN users u ON u.tenant_id = t.id
       GROUP BY t.id ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'Errore GET /api/master/tenants');
    res.status(500).json({ error: 'Errore caricamento tenant' });
  }
});

router.post('/tenants', authenticateMaster, async (req, res) => {
  const { slug, name, plan, expiresInDays, adminUsername } = req.body;
  if (!slug?.trim() || !name?.trim() || !adminUsername?.trim())
    return res.status(400).json({ error: 'slug, name e adminUsername sono richiesti' });
  if (!/^[a-z0-9-]+$/.test(slug))
    return res.status(400).json({ error: 'slug: solo lettere minuscole, numeri e trattini' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const { rows: tenantRows } = await client.query(
      `INSERT INTO tenants (slug, name, plan, expires_at) VALUES ($1, $2, $3, $4) RETURNING *`,
      [slug.trim(), name.trim(), plan || 'trial', expiresAt]
    );
    const tenant = tenantRows[0];
    await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', String(tenant.id)]);
    const { rows: userRows } = await client.query(
      `INSERT INTO users (username, role, tenant_id) VALUES ($1, 'admin', $2) RETURNING id, username, role`,
      [adminUsername.trim(), tenant.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ tenant, admin: userRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Slug o username già esistente' });
    logger.error({ err }, 'Errore creazione tenant');
    res.status(500).json({ error: 'Errore creazione tenant' });
  } finally {
    client.release();
  }
});

export default router;