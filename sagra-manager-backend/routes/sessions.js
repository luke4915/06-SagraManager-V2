import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';
import { tenantScope } from '../middleware/tenantScope.js';
import logger from '../logger.js'
// 🔴 NUOVO IMPORT
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();

export default function (broadcast) {

  router.get('/', authenticate, tenantScope, async (req, res) => {
    try {
      const { rows } = await req.db.query('SELECT * FROM sessions ORDER BY start_time DESC');
      res.json(rows);
    }
    catch (err) {
      logger.error({ err }, 'db error');
      res.status(500).json({ error: 'db error' });
    }
  });

  router.get('/latest', authenticate, tenantScope, async (req, res) => {
    try {
      const { rows } = await req.db.query('SELECT * FROM sessions ORDER BY start_time DESC LIMIT 1');
      res.json(rows[0] || null);
    } catch (err) {
      logger.error({ err }, 'db error');
      res.status(500).json({ error: 'db error' });
    }
  });

  // POST /start (Apertura Sessione - TRACCIATO)
  router.post('/start', authenticate, authorizeAdmin, tenantScope, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' });

      const { rows: active } = await req.db.query('SELECT id FROM sessions WHERE end_time IS NULL LIMIT 1');
      if (active.length) return res.status(400).json({ error: 'Esiste già una sessione attiva' });

      const { rows } = await req.db.query(
        'INSERT INTO sessions (name, start_time) VALUES ($1, NOW()) RETURNING *',
        [name.trim()]
      );

      // 🔴 AGGIUNTA: Logghiamo l'apertura della sessione
      await logAudit(req.user.id, 'START_SESSION', {
        sessionId: rows[0].id,
        sessionName: rows[0].name
      });

      // Reset stock a inizio serata — ripristina visibilità prodotti esauriti
      await req.db.query(
        `UPDATE products
         SET stock = NULL, visible = true
         WHERE stock_enabled = true AND stock = 0`
      );

      if (broadcast) broadcast({ type: 'session_started', session: rows[0] });
      res.json(rows[0]);
    } catch (err) {
      logger.error({ err }, 'db error');
      res.status(500).json({ error: 'db error' });
    }
  });

  // POST /end (Chiusura Sessione - TRACCIATO)
  router.post('/end', authenticate, authorizeAdmin, tenantScope, async (req, res) => {
    try {
      const { rows } = await req.db.query(
        `UPDATE sessions SET end_time = NOW()
         WHERE id = (SELECT id FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1)
         RETURNING *`
      );

      if (rows[0]) {
        // 🔴 AGGIUNTA: Logghiamo la chiusura della sessione solo se effettivamente ce n'era una attiva
        await logAudit(req.user.id, 'END_SESSION', {
          sessionId: rows[0].id,
          sessionName: rows[0].name
        });

        if (broadcast) broadcast({ type: 'session_ended', session: rows[0] });
      }

      res.json(rows[0] || null);
    } catch (err) {
      logger.error({ err }, 'db error');
      res.status(500).json({ error: 'db error' });
    }
  });

  return router;
}