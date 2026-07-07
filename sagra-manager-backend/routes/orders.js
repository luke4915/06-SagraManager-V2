import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { printESCPosNetwork } from '../utils/receiptTemplates.js';
import logger from '../logger.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();
const TMP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

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

  const productIds = [...new Set(orderData.items.map(i => i.id).filter(Boolean))];
  const destMap = {};
  if (productIds.length) {
    const { rows: products } = await pool.query(
      'SELECT id, print_destination FROM products WHERE id = ANY($1)',
      [productIds]
    );
    products.forEach(p => { destMap[p.id] = p.print_destination || 'both'; });
  }

  const logoPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'logo_5calzoni.png');

  for (const s of settings) {
    try {
      const enrichedOrder = {
        ...orderData,
        items: orderData.items.map(i => ({ ...i, print_destination: destMap[i.id] || 'both' })),
      };

      // Logghiamo l'inizio del processo per monitorare lo stato in Express
      logger.info(`[ROUTER ORDERS] Avvio flusso di stampa per copia: ${s.copy_type} su ${s.printer_address}`);

      // Attendiamo esplicitamente che il socket si apra, scriva e si chiuda prima di passare alla copia successiva
      await printESCPosNetwork(s, enrichedOrder, sessionName, logoPath);

      logger.info(`[ROUTER ORDERS] Flusso di stampa completato per copia: ${s.copy_type}`);
    } catch (err) {
      logger.error({ err }, `Errore stampa [${s.copy_type}]: ${err.message}`);
    }
  }
}

export default function (broadcast) {

  // GET /orders (Modificata solo per iniettare le categorie reali a runtime)
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

      // 🚀 FIX CRITICO: Recuperiamo la mappatura attuale dei prodotti dal DB per associare le categorie
      const { rows: dbProducts } = await pool.query('SELECT id, category FROM products');
      const categoryMap = Object.fromEntries(dbProducts.map(p => [p.id, p.category || 'Altro']));

      // Rispediamo i dati mappandoli in modo che ogni item abbia la sua categoria reale
      const mappedRows = rows.map(o => {
        const parsedItems = safeParseJSON(o.items).map(i => ({
          ...i,
          note: i.note || '',
          // Se l'item non ha la categoria nel JSON, la prendiamo dalla mappa aggiornata tramite l'ID prodotto
          category: i.category || categoryMap[i.id] || 'Altro'
        }));
        return { ...o, items: parsedItems };
      });

      res.json(mappedRows);
    } catch (err) {
      logger.error({ err }, 'Errore GET /api/orders:')
      res.status(500).json({ error: 'Errore nel recupero degli ordini' });
    }
  });

  // POST /orders (Creazione Ordine - TRACCIATO)
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
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: priceMap[i.id],
      note: i.note || '',
      category: i.category,
      print_destination: i.print_destination || 'both',
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

      // 🔴 AGGIUNTA: Tracciamo la creazione dell'ordine nell'Audit Log
      await logAudit(req.user.id, 'CREATE_ORDER', {
        orderId,
        total: verifiedTotal,
        itemCount: verifiedItems.length
      });

      const { rows: sessionRows } = await pool.query(
        'SELECT name FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
      );
      const orderData = { id: orderId, created_at: timestamp, items: verifiedItems, total: verifiedTotal };

      if (broadcast) broadcast({ type: 'order_created', order: { id: orderId, items: verifiedItems, total: verifiedTotal, status: status || 'pending', created_at: timestamp } });
      res.json({ success: true, orderId });

      printOrder(orderData, sessionRows[0]?.name || 'Serata').catch(err =>
        logger.error({ err }, 'Errore printOrder')
      );
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err }, 'Errore POST /api/orders')
      res.status(500).json({ error: "Errore durante l'invio dell'ordine" });
    } finally {
      client.release();
    }
  });

  // PUT /orders/:id (Modifica/Storno Stato - TRACCIATO)
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

      // 🔴 AGGIUNTA: Tracciamo il cambio di stato (utilissimo se l'ordine viene annullato/stornato!)
      await logAudit(req.user.id, 'UPDATE_ORDER_STATUS', {
        orderId: id,
        oldStatus: current[0].status,
        newStatus: status
      });

      if (broadcast) broadcast({ type: 'order_updated', order: updated });
      res.json(updated);
    } catch (err) {
      logger.error({ err }, 'Errore PUT /api/orders/:id:')
      res.status(500).json({ error: 'Errore aggiornamento ordine' });
    }
  });

  // POST /orders/:id/reprint (Ristampa Scontrino - TRACCIATO)
  router.post('/:id/reprint', authenticate, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Ordine non trovato' });
      const order = rows[0];

      // 🔴 AGGIUNTA: Tracciamo chi richiede la ristampa di uno scontrino
      await logAudit(req.user.id, 'REPRINT_ORDER', { orderId: req.params.id });

      const { rows: sessionRows } = await pool.query(
        'SELECT name FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
      );
      await printOrder(
        { id: order.id, created_at: order.created_at, items: safeParseJSON(order.items), total: parseFloat(order.total) },
        sessionRows[0]?.name || 'Serata'
      );
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, 'Errore ristampa')
      res.status(500).json({ error: 'Errore durante la ristampa' });
    }
  });

  // GET /orders/kds — pubblico, solo ordini pending/preparing della sessione attiva
  router.get('/kds', async (req, res) => {
    try {
      const { rows: sessions } = await pool.query(
        'SELECT start_time FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
      );
      if (!sessions.length) return res.json([]);
      const { rows } = await pool.query(
        `SELECT * FROM orders WHERE status IN ('pending','preparing') AND created_at >= $1 ORDER BY created_at DESC`,
        [sessions[0].start_time]
      );
      res.json(rows.map(o => ({ ...o, items: safeParseJSON(o.items).map(i => ({ ...i, note: i.note || '' })) })));
    } catch (err) {
      logger.error({ err }, 'Errore GET /api/orders/kds');
      res.status(500).json({ error: 'Errore recupero ordini KDS' });
    }
  });

  return router;
}