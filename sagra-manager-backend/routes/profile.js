// routes/profile.js
import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

/* === LOGIN E UPDATE PROFILE === */

// PATCH /api/profile/username
router.patch('/username', authenticate, async (req, res) => {
  const userId = req.user.id;
  const { newUsername } = req.body;

  if (!newUsername) return res.status(400).json({ error: 'Nome utente mancante' });

  try {
    await pool.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userId]);
    res.json({ success: true, username: newUsername });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

/* === IMPOSTAZIONI STAMPA PER UTENTE === */

// GET impostazioni stampa per utente
router.get('/print-settings', authenticate, async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT copy_type, enabled, printer_name
       FROM user_print_settings
       WHERE user_id = $1`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST impostazioni stampa per un tipo copia
router.post('/print-settings', authenticate, async (req, res) => {
  const userId = req.user.id;
  const { copy_type, enabled, printer_name } = req.body;

  if (!copy_type) return res.status(400).json({ error: 'Tipo copia mancante' });

  try {
    const existing = await pool.query(
      `SELECT id FROM user_print_settings WHERE user_id = $1 AND copy_type = $2`,
      [userId, copy_type]
    );

    if (existing.rows.length > 0) {
      const { rows } = await pool.query(
        `UPDATE user_print_settings
         SET enabled = $1, printer_name = $2
         WHERE user_id = $3 AND copy_type = $4
         RETURNING *`,
        [enabled, printer_name, userId, copy_type]
      );
      return res.json(rows[0]);
    } else {
      const { rows } = await pool.query(
        `INSERT INTO user_print_settings (user_id, copy_type, enabled, printer_name)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, copy_type, enabled, printer_name]
      );
      return res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET lista tipi copia disponibili
router.get('/copy-types', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT copy_type FROM user_print_settings ORDER BY copy_type`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
