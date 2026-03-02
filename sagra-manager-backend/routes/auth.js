// routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';

const router = express.Router();

// 1️⃣ LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'Username richiesto' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Utente non trovato' });

    const user = rows[0];

    // Controllo se serve impostare la password
    const needsPassword = !user.password_hash || user.password_hash.trim() === '';

    if (!needsPassword) {
      const match = await bcrypt.compare(password || '', user.password_hash);
      if (!match) return res.status(401).json({ error: 'Password errata' });
    }

    // Generazione Token (Includiamo role e username come avevi in server.js)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Salvataggio in Cookie HttpOnly (Fondamentale!)
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // In produzione con HTTPS metti true
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 8 // 8 ore
    });

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      needsPassword: needsPassword,
      theme: user.theme || 'dark'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// 2️⃣ CHANGE PASSWORD (Spostata da server.js)
router.post("/change-password", async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ message: "Dati mancanti" });

    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id=$1", [userId]);
    if (rows.length === 0) return res.status(404).json({ message: "Utente non trovato" });

    const currentHash = rows[0].password_hash;

    if (currentHash) {
      if (!oldPassword) return res.status(400).json({ message: "Vecchia password richiesta" });
      const match = await bcrypt.compare(oldPassword, currentHash);
      if (!match) return res.status(401).json({ message: "Password attuale errata" });
    }

    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [newHash, userId]);

    res.json({ message: "Password aggiornata con successo" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
});

// 3️⃣ CREATE USER ADMIN (Spostata da server.js)
router.post('/admin/createUser', authenticate, authorizeAdmin, async (req, res) => {
  const { username, role } = req.body;
  if (!username) return res.status(400).json({ error: 'Username richiesto' });

  try {
    const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Username già esistente' });

    const result = await pool.query(
      'INSERT INTO users (username, role) VALUES ($1, $2) RETURNING id, username, role',
      [username, role || 'user']
    );

    res.status(201).json({ message: 'Utente creato con successo', user: result.rows[0] });
  } catch (err) {
    console.error('Errore creazione utente admin:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/auth/me - Verifica se l'utente ha un cookie valido
router.get('/me', authenticate, (req, res) => {
  // Se il middleware 'authenticate' passa, i dati dell'utente sono in req.user
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });
});

// POST /api/auth/logout
// routes/auth.js
router.post('/logout', (req, res) => { // 👈 NESSUN middleware qui
  res.cookie('token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0)
  });
  res.send({ message: "Bye" });
});

export default router;