import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

const COPY_TYPES = ['Cliente', 'Cucina', 'Ritiro Bar', 'Ritiro Gastronomia'];

router.patch('/username', authenticate, async (req, res) => {
  const { newUsername } = req.body;
  if (!newUsername?.trim()) return res.status(400).json({ error: 'Nome utente mancante' });
  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE username=$1 AND id!=$2', [newUsername.trim(), req.user.id]
    );
    if (existing.length) return res.status(409).json({ error: 'Username già in uso' });
    await pool.query('UPDATE users SET username=$1 WHERE id=$2', [newUsername.trim(), req.user.id]);
    res.json({ success: true, username: newUsername.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

router.get('/copy-types', authenticate, (_req, res) => {
  res.json(COPY_TYPES.map(name => ({ copy_type: name })));
});

export default router;
