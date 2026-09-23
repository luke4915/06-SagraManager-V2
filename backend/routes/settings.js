import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';
import { tenantScope, withTenantClient } from '../middleware/tenantScope.js';
import { resolveTenantFromHost } from '../middleware/resolveTenantFromHost.js';
import logger from '../logger.js';

const router = express.Router();

// GET /api/settings — pubblico per welcome_message
// ⚠️ TODO multi-tenant: stesso stop-gap di /kds e /products/menu — vedi orders.js
router.get('/', resolveTenantFromHost, async (req, res) => {
    try {
        const settings = await withTenantClient(req.tenantId, async (db) => {
            const { rows } = await db.query('SELECT key, value FROM settings');
            return Object.fromEntries(rows.map(r => [r.key, r.value]));
        });
        res.json(settings);
    } catch (err) {
        logger.error({ err }, 'Errore GET /api/settings');
        res.status(500).json({ error: 'Errore caricamento impostazioni' });
    }
});

// PUT /api/settings/:key — solo admin
router.put('/:key', authenticate, authorizeAdmin, tenantScope, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        await req.db.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (tenant_id, key) DO UPDATE SET value = $2',
            [key, value]
        );
        res.json({ key, value });
    } catch (err) {
        logger.error({ err }, 'Errore PUT /api/settings/:key');
        res.status(500).json({ error: 'Errore salvataggio impostazione' });
    }
});

export default router;
