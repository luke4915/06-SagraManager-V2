import express from "express";
import fs from "fs";
import { pool } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";
import { printESCPosNetwork } from "../utils/receiptTemplates.js";

const router = express.Router();

// Helper locale per il parsing JSON
function safeParseJSON(value, fallback = []) {
    try {
        return Array.isArray(value) ? value : JSON.parse(value || "[]");
    } catch {
        return fallback;
    }
}

// Esportiamo una funzione che riceve "broadcast" dal server.js
export default function (broadcast) {

    // GET /api/orders
    router.get("/", async (req, res) => {
        try {
            const { rows = [] } = await pool.query(
                "SELECT * FROM orders ORDER BY created_at DESC"
            );
            const orders = rows.map(order => ({
                ...order,
                items: safeParseJSON(order.items).map(item => ({
                    ...item,
                    note: item.note || "",
                })),
            }));
            res.json(orders);
        } catch (err) {
            console.error("Errore /api/orders:", err);
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
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
                [JSON.stringify(items), total, status, created_at, created_by]
            );

            const orderId = result.rows[0]?.id;
            const timestamp = result.rows[0]?.created_at;
            await client.query("COMMIT");

            // Logica Stampa
            const { rows: settings = [] } = await pool.query(
                `SELECT copy_type, printer_name FROM user_print_settings WHERE user_id = $1 AND enabled = true`,
                [req.user.id]
            );
            const { rows: sessionRows = [] } = await pool.query(
                `SELECT name FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1`
            );

            fs.mkdirSync("./tmp", { recursive: true });
            const sessionName = sessionRows[0]?.name || "Serata";
            const orderData = { id: orderId, created_at: timestamp, items, total };
            const logoPath = "./assets/logo_SagraManager_ESC_POS.png";

            for (const s of settings) {
                (async () => {
                    try {
                        await printESCPosNetwork(s, orderData, sessionName, logoPath);
                    } catch (err) {
                        console.error("Errore di stampa:", err);
                    }
                })();
            }

            res.json({ success: true, orderId });
        } catch (err) {
            await client.query("ROLLBACK");
            console.error("Errore /api/orders (POST):", err);
            res.status(500).json({ error: "Errore durante l'invio dell'ordine" });
        } finally {
            client.release();
        }
    });

    // PUT /api/orders/:id (Update status)
    router.put("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const { rows } = await pool.query(
                "UPDATE orders SET status=$1 WHERE id=$2 RETURNING *",
                [status, id]
            );
            const updated = rows[0];

            if (broadcast) broadcast({ type: "order_updated", order: updated });
            res.json(updated);
        } catch (err) {
            res.status(500).json({ error: "db error" });
        }
    });

    return router;
}