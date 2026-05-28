import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';

const router = express.Router();

const fmt = (n) => Number(n || 0).toFixed(2).replace('.', ',');
const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;

router.get('/session/:id/csv', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { rows: sessionRows } = await pool.query('SELECT * FROM sessions WHERE id=$1', [req.params.id]);
    const session = sessionRows[0];
    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

    const endTime = session.end_time || new Date().toISOString();

    const { rows: orders } = await pool.query(
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
    res.setHeader('Content-Disposition', `attachment; filename=report_sessione_${req.params.id}.csv`);
    res.status(200).send('\uFEFF' + rows.join('\n'));
  } catch (err) {
    console.error('Errore CSV:', err);
    res.status(500).json({ error: 'Errore generazione CSV' });
  }
});

export default router;
