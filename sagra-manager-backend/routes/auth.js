import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';
import { tenantScope, lookupUserForLogin, withTenantClient } from '../middleware/tenantScope.js';
import { resolveTenantFromHost } from '../middleware/resolveTenantFromHost.js';
import logger from '../logger.js';

const router = express.Router();

// 🔴 MODIFICA: Includiamo anche il 'theme' nel token JWT per passarlo al frontend
const signToken = (user) => jwt.sign(
  { id: user.id, username: user.username, role: user.role, theme: user.theme || 'dark', tenantId: user.tenant_id, tenantName: user.tenant_name },
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
    // L'username è unico a livello globale, ma l'accesso deve avvenire dal
    // sottodominio del proprio tenant: altrimenti un utente valido di un
    // altro tenant potrebbe loggarsi qui e vedere/operare sui SUOI dati
    // (correttamente isolati da RLS) ma dall'URL sbagliato — confuso e non voluto.
    if (user.tenant_id !== req.tenantId)
      return res.status(401).json({ error: 'Utente non trovato' }); // stesso messaggio: non riveliamo l'esistenza dell'utente su un altro tenant

    const { rows: tenantRows } = await pool.query('SELECT expires_at, active, name FROM tenants WHERE id = $1', [user.tenant_id]);
    const tenant = tenantRows[0];

    if (!tenant?.active) {
      return res.status(403).json({ error: 'Account disattivato. Contatta l\'assistenza.', code: 'TENANT_INACTIVE' });
    }
    if (tenant.expires_at && new Date(tenant.expires_at) < new Date()) {
      return res.status(402).json({ error: "Licenza scaduta. Contatta l'assistenza per rinnovarla.", code: 'LICENSE_EXPIRED' });
    }

    user.tenant_name = tenant.name;
    const needsPassword = !user.password_hash?.trim();
    if (!needsPassword && !await bcrypt.compare(password || '', user.password_hash))
      return res.status(401).json({ error: 'Password errata' });

    setCookie(res, signToken(user));

    res.json({ id: user.id, username: user.username, role: user.role, needsPassword, theme: user.theme || 'dark', tenantName: user.tenant_name });
    } catch (err) {
    logger.error({ err }, 'Errore server')
    res.status(500).json({ error: 'Errore server' });
  }
});

// REFRESH TOKEN (Best Practice: Resiliente e Indipendente)
router.post('/refresh', async (req, res) => {
  try {
    // 1. Recuperiamo il cookie in modo sicuro
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    let decoded;
    try {
      // 2. Decodifichiamo il token IGNORANDO la scadenza temporale.
      // Questo permette il refresh anche se il frontend arriva in ritardo di qualche minuto.
      decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch (jwtErr) {
      logger.warn({ jwtErr }, 'Tentativo di refresh con token corrotto o alterato');
      return res.status(401).json({ error: 'Token non valido' });
    }

  // 3. Controllo di sicurezza sul DB: l'utente esiste ancora ed è attivo?
    const user = await withTenantClient(decoded.tenantId, async (db) => {
      const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      return rows[0] || null;
    });
    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato o disabilitato' });
    }

    const { rows: tRows } = await pool.query('SELECT name FROM tenants WHERE id = $1', [decoded.tenantId]);
    user.tenant_name = tRows[0]?.name;

    // 4. Generiamo il nuovo token e sovrascriviamo il vecchio cookie
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
    if (err.code === '23505') // unique_violation: username già usato (magari da un altro tenant, non visibile via RLS)
      return res.status(409).json({ error: 'Username già esistente' });
    logger.error({ err }, 'Errore createUser');
    res.status(500).json({ error: 'Errore server' });
  }
});

// ME
// 🔴 MODIFICA: Restituiamo req.user assicurandoci che contenga il flag theme atteso dal frontend
router.get('/me', authenticate, (req, res) => {
  res.json({
  id: req.user.id,
  username: req.user.username,
  role: req.user.role,
  theme: req.user.theme || 'dark',
  tenantName: req.user.tenantName
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