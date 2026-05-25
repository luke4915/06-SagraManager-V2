import express from "express";
import fs from "fs";
import { pool } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";
import { printESCPosNetwork } from "../utils/receiptTemplates.js";

const router = express.Router();

function safeParseJSON(value, fallback = []) {
    try { return Array.isArray(value) ? value : JSON.parse(value || "[]"); }
    catch { return fallback; }
}

// Statuses da cui NON si può tornare indietro
const TERMINAL_STATUSES = ['canceled', 'completed'];

// Helper: esegue tutte le stampe per un ordine
async function printOrder(userId, orderData, sessionName) {
    const { rows: settings = [] } = await pool.query(
        `SELECT copy_type, printer_name FROM user_print_settings WHERE user_id = $1 AND enabled = true`,
        [userId]
    );
    const logoPath = "./assets/logo_SagraManager_ESC_POS.png";
    fs.mkdirSync("./tmp", { recursive: true });

    const results = await Promise.allSettled(
        settings.map(s => printESCPosNetwork(s, orderData, sessionName, logoPath))
    );

    results.forEach((r, i) => {
        if (r.status === 'rejected')
            console.error(`Errore stampa [${settings[i].copy_type}]:`, r.reason);
    });

    return results;
}

export default function (broadcast) {

    // GET /api/orders
    // ?session=active  → solo ordini della sessione attiva
    router.get("/", async (req, res) => {
        try {
            let query, params = [];
            if (req.query.session === 'active') {
                const { rows: sessions } = await pool.query(
                    "SELECT start_time, end_time FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1"
                );
                if (sessions.length) {
                    const { start_time, end_time } = sessions[0];
                    query = `SELECT * FROM orders WHERE created_at >= $1 ${end_time ? 'AND created_at <= $2' : ''} ORDER BY created_at DESC`;
                    params = end_time ? [start_time, end_time] : [start_time];
                } else {
                    return res.json([]);
                }
            } else {
                query = "SELECT * FROM orders ORDER BY created_at DESC";
            }
            const { rows = [] } = await pool.query(query, params);
            res.json(rows.map(o => ({
                ...o,
                items: safeParseJSON(o.items).map(i => ({ ...i, note: i.note || "" })),
            })));
        } catch (err) {
            console.error("Errore GET /api/orders:", err);
            res.status(500).json({ error: "Errore nel recupero degli ordini" });
        }
    });

    // POST /api/orders
    router.post("/", authenticate, async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const { items, total, status, created_at, created_by } = req.body;

            const result = await client.query(
                `INSERT INTO orders (items, total, status, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
                [JSON.stringify(items), total, status, created_at, created_by]
            );

            const orderId = result.rows[0]?.id;
            const timestamp = result.rows[0]?.created_at;
            await client.query("COMMIT");

            const { rows: sessionRows = [] } = await pool.query(
                `SELECT name FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1`
            );
            const sessionName = sessionRows[0]?.name || "Serata";
            const orderData = { id: orderId, created_at: timestamp, items, total };

            // Stampa asincrona ma loggata — non blocca la risposta
            printOrder(req.user.id, orderData, sessionName).catch(err =>
                console.error("Errore printOrder:", err)
            );

            if (broadcast) broadcast({ type: "order_created", order: { id: orderId, items, total, status, created_at: timestamp } });

            res.json({ success: true, orderId });
        } catch (err) {
            await client.query("ROLLBACK");
            console.error("Errore POST /api/orders:", err);
            res.status(500).json({ error: "Errore durante l'invio dell'ordine" });
        } finally {
            client.release();
        }
    });

    // PUT /api/orders/:id — FIX: blocca transizioni da stati terminali
    router.put("/:id", authenticate, async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            // Leggi stato attuale
            const { rows: current } = await pool.query("SELECT status FROM orders WHERE id = $1", [id]);
            if (!current.length) return res.status(404).json({ error: "Ordine non trovato" });

            const currentStatus = current[0].status;

            // Blocca se l'ordine è già in uno stato terminale
            if (TERMINAL_STATUSES.includes(currentStatus)) {
                return res.status(409).json({
                    error: `Impossibile modificare un ordine in stato "${currentStatus}"`
                });
            }

            const completedAt = status === 'completed' ? new Date().toISOString() : null;
            const { rows } = await pool.query(
                `UPDATE orders SET status=$1 ${completedAt ? ', completed_at=$3' : ''} WHERE id=$2 RETURNING *`,
                completedAt ? [status, id, completedAt] : [status, id]
            );

            const updated = { ...rows[0], items: safeParseJSON(rows[0].items) };
            if (broadcast) broadcast({ type: "order_updated", order: updated });
            res.json(updated);
        } catch (err) {
            console.error("Errore PUT /api/orders/:id:", err);
            res.status(500).json({ error: "db error" });
        }
    });

    // POST /api/orders/:id/reprint — Ristampa comanda
    router.post("/:id/reprint", authenticate, async (req, res) => {
        try {
            const { id } = req.params;
            const { rows } = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
            if (!rows.length) return res.status(404).json({ error: "Ordine non trovato" });

            const order = rows[0];
            const items = safeParseJSON(order.items);

            const { rows: sessionRows = [] } = await pool.query(
                `SELECT name FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1`
            );
            const sessionName = sessionRows[0]?.name || "Serata";
            const orderData = { id: order.id, created_at: order.created_at, items, total: parseFloat(order.total) };

            const results = await printOrder(req.user.id, orderData, sessionName);
            const failed = results.filter(r => r.status === 'rejected').length;

            res.json({
                success: true,
                printed: results.length - failed,
                failed,
            });
        } catch (err) {
            console.error("Errore reprint:", err);
            res.status(500).json({ error: "Errore durante la ristampa" });
        }
    });

    return router;
}