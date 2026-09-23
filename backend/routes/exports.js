import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';
import { tenantScope } from '../middleware/tenantScope.js';
import logger from '../logger.js';

const router = express.Router();

const fmt = (n) => Number(n || 0).toFixed(2).replace('.', ',');
const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;

router.get('/session/:id/csv', authenticate, authorizeAdmin, tenantScope, async (req, res) => {

  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) return res.status(400).json({ error: 'ID sessione non valido' });

  try {
    const { rows: sessionRows } = await req.db.query('SELECT * FROM sessions WHERE id=$1', [sessionId]);
    const session = sessionRows[0];
    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

    const endTime = session.end_time || new Date().toISOString();

    const { rows: orders } = await req.db.query(
      `SELECT id, created_at, items, total FROM orders
       WHERE status='completed' AND created_at >= $1 AND created_at <= $2
       ORDER BY created_at ASC`,
      [session.start_time, endTime]
    );

    const headers = ['ID Ordine', 'Data/Ora', 'Prodotto', 'Categoria', 'Quantita', 'Prezzo Unitario', 'Prezzo Riga', 'Note', 'Totale Ordine'];
    const rows = [headers.join(';')];

    for (const order of orders) {
      let items = [];
      try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch { }
      for (const item of items) {
        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        rows.push([
          order.id,
          new Date(order.created_at).toLocaleString('it-IT'),
          esc(item.name),
          esc(item.category || 'Generico'),
          qty,
          fmt(price),
          fmt(qty * price),
          esc(item.note),
          fmt(order.total),
        ].join(';'));
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=report_sessione_${sessionId}.csv`);
    res.status(200).send('\uFEFF' + rows.join('\n'));
  } catch (err) {
    logger.error({ err }, 'Errore CSV')
    res.status(500).json({ error: 'Errore generazione CSV' });
  }
});

export default router;
