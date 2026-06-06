import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';
import logger from '../logger.js';

const router = express.Router();

// GET /api/settings — pubblico per welcome_message
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT key, value FROM settings');
        const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
        res.json(settings);
    } catch (err) {
        logger.error({ err }, 'Errore GET /api/settings');
        res.status(500).json({ error: 'Errore caricamento impostazioni' });
    }
});

// PUT /api/settings/:key — solo admin
router.put('/:key', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, value]
        );
        res.json({ key, value });
    } catch (err) {
        logger.error({ err }, 'Errore PUT /api/settings/:key');
        res.status(500).json({ error: 'Errore salvataggio impostazione' });
    }
});

export default router;