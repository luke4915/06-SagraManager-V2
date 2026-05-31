import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';
import logger from '../logger.js';

const router = express.Router();

const signToken = (user) => jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);

const setCookie = (res, token) => res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 8,
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username richiesto' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    if (!rows.length) return res.status(401).json({ error: 'Utente non trovato' });
    const user = rows[0];
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

// REFRESH TOKEN — silent, nessun re-login richiesto
router.post('/refresh', authenticate, (req, res) => {
  try {
    // Emette un token fresco se la sessione è ancora valida
    const newToken = signToken(req.user);
    setCookie(res, newToken);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Errore token refresh')
    res.status(500).json({ error: 'Errore refresh token' });
  }
});

// CHANGE PASSWORD
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Nuova password richiesta' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password troppo corta (min 6 caratteri)' });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
    if (!rows.length) return res.status(404).json({ message: 'Utente non trovato' });

    const currentHash = rows[0].password_hash;
    if (currentHash) {
      if (!oldPassword) return res.status(400).json({ message: 'Vecchia password richiesta' });
      if (!await bcrypt.compare(oldPassword, currentHash))
        return res.status(401).json({ message: 'Password attuale errata' });
    }
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(newPassword, 10), userId]);
    res.json({ message: 'Password aggiornata con successo' });
  } catch (err) {
    logger.error({ err }, 'Errore cambio password');
    res.status(500).json({ message: 'Errore server' });
  }
});

// CREATE USER (admin only)
router.post('/admin/createUser', authenticate, authorizeAdmin, async (req, res) => {
  const { username, role } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username richiesto' });
  const VALID_ROLES = ['admin', 'cassa', 'cucina'];
  if (role && !VALID_ROLES.includes(role))
    return res.status(400).json({ error: `Ruolo non valido. Valori accettati: ${VALID_ROLES.join(', ')}` });
  try {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Username già esistente' });
    const { rows } = await pool.query(
      'INSERT INTO users (username, role) VALUES ($1, $2) RETURNING id, username, role',
      [username.trim(), role || 'cassa']
    );
    res.status(201).json({ message: 'Utente creato con successo', user: rows[0] });
  } catch (err) {
    logger.error({ err }, 'Errore createUser');
    res.status(500).json({ error: 'Errore server' });
  }
});

// ME
router.get('/me', authenticate, (req, res) => res.json(req.user));

// LOGOUT
router.post('/logout', (req, res) => {
  res.cookie('token', '', { httpOnly: true, path: '/', expires: new Date(0) });
  res.json({ message: 'Bye' });
});

export default router;
