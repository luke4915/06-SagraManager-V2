import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';
import { tenantScope, lookupUserForLogin, withTenantClient } from '../middleware/tenantScope.js';
import { resolveTenantFromHost } from '../middleware/resolveTenantFromHost.js';
import logger from '../logger.js';

const router = express.Router();

const signToken = (user) => jwt.sign(
  { id: user.id, username: user.username, role: user.role, theme: user.theme || 'dark', tenantId: user.tenant_id },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);

const setCookie = (res, token) => res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 1000 * 60 * 60 * 8,
});

// LOGIN
router.post('/login', resolveTenantFromHost, async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username richiesto' });
  try {
    const user = await lookupUserForLogin(username.trim());
    if (!user) return res.status(401).json({ error: 'Utente non trovato' });
    if (user.tenant_id !== req.tenantId)
      return res.status(401).json({ error: 'Utente non trovato' });
    const needsPassword = !user.password_hash?.trim();
    if (!needsPassword && !await bcrypt.compare(password || '', user.password_hash))
      return res.status(401).json({ error: 'Password errata' });

    setCookie(res, signToken(user));

    res.json({ id: user.id, username: user.username, role: user.role, needsPassword, theme: user.theme || 'dark' });
  } catch (err) {
    logger.error({ err }, 'Errore server')
    res.status(500).json({ error: 'Errore server' });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch (jwtErr) {
      logger.warn({ jwtErr }, 'Tentativo di refresh con token corrotto o alterato');
      return res.status(401).json({ error: 'Token non valido' });
    }

    const user = await withTenantClient(decoded.tenantId, async (db) => {
      const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      return rows[0] || null;
    });
    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato o disabilitato' });
    }

    const newToken = signToken(user);
    setCookie(res, newToken);

    logger.info(`[AUTH] Sessione prolungata con successo per l'utente: ${user.username}`);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Errore critico durante il token refresh');
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// CHANGE PASSWORD
router.post('/change-password', authenticate, tenantScope, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Nuova password richiesta' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password troppo corta (min 6 caratteri)' });

    const { rows } = await req.db.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
    if (!rows.length) return res.status(404).json({ message: 'Utente non trovato' });

    const currentHash = rows[0].password_hash;
    if (currentHash) {
      if (!oldPassword) return res.status(400).json({ message: 'Vecchia password richiesta' });
      if (!await bcrypt.compare(oldPassword, currentHash))
        return res.status(401).json({ message: 'Password attuale errata' });
    }
    await req.db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(newPassword, 10), userId]);

    res.json({ message: 'Password aggiornata con successo' });
  } catch (err) {
    logger.error({ err }, 'Errore cambio password');
    res.status(500).json({ message: 'Errore server' });
  }
});

// CREATE USER (admin only)
router.post('/admin/createUser', authenticate, authorizeAdmin, tenantScope, async (req, res) => {
  const { username, role } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username richiesto' });
  const VALID_ROLES = ['admin', 'cassa', 'cucina', 'responsabile'];
  if (role && !VALID_ROLES.includes(role))
    return res.status(400).json({ error: `Ruolo non valido. Valori accettati: ${VALID_ROLES.join(', ')}` });
  try {
    const existing = await req.db.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Username già esistente' });
    const { rows } = await req.db.query(
      'INSERT INTO users (username, role, tenant_id) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username.trim(), role || 'cassa', req.user.tenantId]
    );

    res.status(201).json({ message: 'Utente creato con successo', user: rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Username già esistente' });
    logger.error({ err }, 'Errore createUser');
    res.status(500).json({ error: 'Errore server' });
  }
});

// ME
router.get('/me', authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    theme: req.user.theme || 'dark'
  });
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    expires: new Date(0)
  });
  res.json({ message: 'Bye' });
});

export default router;