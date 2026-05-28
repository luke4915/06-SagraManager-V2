import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';

const router = express.Router();

export default function (broadcast) {

  router.get('/', authenticate, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM sessions ORDER BY start_time DESC');
      res.json(rows);
    } catch { res.status(500).json({ error: 'db error' }); }
  });

  router.get('/latest', authenticate, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM sessions ORDER BY start_time DESC LIMIT 1');
      res.json(rows[0] || null);
    } catch { res.status(500).json({ error: 'db error' }); }
  });

  router.post('/start', authenticate, authorizeAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' });

      const { rows: active } = await pool.query('SELECT id FROM sessions WHERE end_time IS NULL LIMIT 1');
      if (active.length) return res.status(400).json({ error: 'Esiste già una sessione attiva' });

      const { rows } = await pool.query(
        'INSERT INTO sessions (name, start_time) VALUES ($1, NOW()) RETURNING *',
        [name.trim()]
      );
      if (broadcast) broadcast({ type: 'session_started', session: rows[0] });
      res.json(rows[0]);
    } catch { res.status(500).json({ error: 'db error' }); }
  });

  router.post('/end', authenticate, authorizeAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE sessions SET end_time = NOW()
         WHERE id = (SELECT id FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1)
         RETURNING *`
      );
      if (rows[0] && broadcast) broadcast({ type: 'session_ended', session: rows[0] });
      res.json(rows[0] || null);
    } catch { res.status(500).json({ error: 'db error' }); }
  });

  return router;
}
