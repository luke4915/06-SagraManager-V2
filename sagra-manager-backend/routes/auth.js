import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'Username richiesto' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Utente non trovato' });
    const user = rows[0];
    const needsPassword = !user.password_hash?.trim();
    if (!needsPassword && !await bcrypt.compare(password || '', user.password_hash))
      return res.status(401).json({ error: 'Password errata' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 8,
    });
    res.json({ id: user.id, username: user.username, role: user.role, needsPassword, theme: user.theme || 'dark' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Nuova password richiesta' });

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
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

router.post('/admin/createUser', authenticate, authorizeAdmin, async (req, res) => {
  const { username, role } = req.body;
  if (!username) return res.status(400).json({ error: 'Username richiesto' });
  try {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length) return res.status(400).json({ error: 'Username già esistente' });
    const { rows } = await pool.query(
      'INSERT INTO users (username, role) VALUES ($1, $2) RETURNING id, username, role',
      [username, role || 'user']
    );
    res.status(201).json({ message: 'Utente creato con successo', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.get('/me', authenticate, (req, res) => res.json(req.user));

router.post('/logout', (req, res) => {
  res.cookie('token', '', { httpOnly: true, path: '/', expires: new Date(0) });
  res.json({ message: 'Bye' });
});

export default router;
