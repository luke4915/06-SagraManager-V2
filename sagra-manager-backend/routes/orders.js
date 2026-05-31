import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { printESCPosNetwork } from '../utils/receiptTemplates.js';

const router = express.Router();
const TMP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tmp');
fs.mkdirSync(TMP_DIR, { recursive: true }); // una volta sola all'avvio

function safeParseJSON(value, fallback = []) {
  try { return Array.isArray(value) ? value : JSON.parse(value || '[]'); }
  catch { return fallback; }
}

const TERMINAL_STATUSES = ['canceled', 'completed'];

async function printOrder(orderData, sessionName) {
  const { rows: settings } = await pool.query(
    `SELECT ps.printer_type, ps.printer_address, ct.name AS copy_type
     FROM print_settings ps
     JOIN copy_types ct ON ct.id = ps.copy_type_id
     WHERE ps.enabled = true`
  );
  if (!settings.length) return;

  // Recupera print_destination di tutti i prodotti in una query sola
  const productIds = [...new Set(orderData.items.map(i => i.id).filter(Boolean))];
  const destMap = {};
  if (productIds.length) {
    const { rows: products } = await pool.query(
      'SELECT id, print_destination FROM products WHERE id = ANY($1)',
      [productIds]
    );
    products.forEach(p => { destMap[p.id] = p.print_destination || 'both'; });
  }

  const logoPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'logo_SagraManager_ESC_POS.png');

  // Stampa sequenziale per evitare conflitti TCP sulla stessa porta
  for (const s of settings) {
    try {
      const enrichedOrder = {
        ...orderData,
        items: orderData.items.map(i => ({ ...i, print_destination: destMap[i.id] || 'both' })),
      };
      await printESCPosNetwork(s, enrichedOrder, sessionName, logoPath);
    } catch (err) {
      console.error(`Errore stampa [${s.copy_type}]:`, err.message);
    }
  }
}

export default function (broadcast) {

  router.get('/', authenticate, async (req, res) => {
    try {
      let query = 'SELECT * FROM orders ORDER BY created_at DESC';
      let params = [];
      if (req.query.session === 'active') {
        const { rows: sessions } = await pool.query(
          'SELECT start_time, end_time FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
        );
        if (!sessions.length) return res.json([]);
        const { start_time, end_time } = sessions[0];
        query = `SELECT * FROM orders WHERE created_at >= $1 ${end_time ? 'AND created_at <= $2' : ''} ORDER BY created_at DESC`;
        params = end_time ? [start_time, end_time] : [start_time];
      }
      const { rows } = await pool.query(query, params);
      res.json(rows.map(o => ({ ...o, items: safeParseJSON(o.items).map(i => ({ ...i, note: i.note || '' })) })));
    } catch (err) {
      console.error('Errore GET /api/orders:', err);
      res.status(500).json({ error: 'Errore nel recupero degli ordini' });
    }
  });

  router.post('/', authenticate, async (req, res) => {
    const { items, status } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Ordine vuoto o malformato' });

    const productIds = [...new Set(items.map(i => i.id).filter(Boolean))];
    const { rows: dbProducts } = await pool.query(
      'SELECT id, price FROM products WHERE id = ANY($1)', [productIds]
    );
    const priceMap = Object.fromEntries(dbProducts.map(p => [p.id, parseFloat(p.price)]));

    for (const item of items) {
      if (!item.id || !priceMap[item.id])
        return res.status(400).json({ error: `Prodotto non valido: ${item.id}` });
      if (!Number.isInteger(item.quantity) || item.quantity < 1)
        return res.status(400).json({ error: `Quantità non valida per prodotto ${item.id}` });
    }

    const verifiedItems = items.map(i => ({
      id: i.id, name: i.name, quantity: i.quantity,
      price: priceMap[i.id], note: i.note || '',
      category: i.category || '', print_destination: i.print_destination || 'both',
    }));
    const verifiedTotal = verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'INSERT INTO orders (items, total, status, created_by) VALUES ($1,$2,$3,$4) RETURNING id, created_at',
        [JSON.stringify(verifiedItems), verifiedTotal, status || 'pending', req.user.id]
      );
      const orderId = rows[0].id;
      const timestamp = rows[0].created_at;
      await client.query('COMMIT');

      const { rows: sessionRows } = await pool.query(
        'SELECT name FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
      );
      const orderData = { id: orderId, created_at: timestamp, items: verifiedItems, total: verifiedTotal };

      if (broadcast) broadcast({ type: 'order_created', order: { id: orderId, items: verifiedItems, total: verifiedTotal, status: status || 'pending', created_at: timestamp } });
      res.json({ success: true, orderId });

      printOrder(orderData, sessionRows[0]?.name || 'Serata').catch(err =>
        console.error('Errore printOrder:', err)
      );
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Errore POST /api/orders:', err);
      res.status(500).json({ error: "Errore durante l'invio dell'ordine" });
    } finally {
      client.release();
    }
  });

  router.put('/:id', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { rows: current } = await pool.query('SELECT status FROM orders WHERE id=$1', [id]);
      if (!current.length) return res.status(404).json({ error: 'Ordine non trovato' });
      if (TERMINAL_STATUSES.includes(current[0].status))
        return res.status(409).json({ error: `Impossibile modificare un ordine in stato "${current[0].status}"` });

      const completedAt = status === 'completed' ? new Date().toISOString() : null;
      const { rows } = await pool.query(
        `UPDATE orders SET status=$1 ${completedAt ? ', completed_at=$3' : ''} WHERE id=$2 RETURNING *`,
        completedAt ? [status, id, completedAt] : [status, id]
      );
      const updated = { ...rows[0], items: safeParseJSON(rows[0].items) };
      if (broadcast) broadcast({ type: 'order_updated', order: updated });
      res.json(updated);
    } catch (err) {
      console.error('Errore PUT /api/orders/:id:', err);
      res.status(500).json({ error: 'Errore aggiornamento ordine' });
    }
  });

  router.post('/:id/reprint', authenticate, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Ordine non trovato' });
      const order = rows[0];
      const { rows: sessionRows } = await pool.query(
        'SELECT name FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
      );
      await printOrder(
        { id: order.id, created_at: order.created_at, items: safeParseJSON(order.items), total: parseFloat(order.total) },
        sessionRows[0]?.name || 'Serata'
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Errore reprint:', err);
      res.status(500).json({ error: 'Errore durante la ristampa' });
    }
  });

  return router;
}
