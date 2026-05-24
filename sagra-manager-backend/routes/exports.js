import express from 'express';
import { pool } from '../db.js'; // Assicurati che le parentesi graffe siano presenti

const router = express.Router();

// ATTENZIONE: Qui NON deve esserci scritto /api/exports/session... 
// Solo /session/:id/csv perché il prefisso viene già deciso in server.js
router.get('/session/:id/csv', async (req, res) => {
    const sessionId = req.params.id;
    console.log(`📡 Richiesta esportazione ricevuta per la sessione: ${sessionId}`);

    try {
        const sessionRes = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
        const session = sessionRes.rows[0];

        if (!session) {
            return res.status(404).json({ error: "Sessione non trovata" });
        }
        if (!session.end_time) {
            return res.status(400).json({ error: "Impossibile esportare una sessione ancora aperta" });
        }

        const ordersQuery = `
          SELECT id, created_at, items, total 
          FROM orders 
          WHERE status = 'completed'
            AND created_at >= $1 
            AND created_at <= $2
          ORDER BY created_at ASC;
        `;

        const result = await pool.query(ordersQuery, [session.start_time, session.end_time]);

        const headers = ["ID Ordine", "Data/Ora Creazione", "Prodotto", "Categoria", "Quantita", "Prezzo Unitario", "Prezzo Totale Riga", "Note Prodotto", "Totale Intero Ordine"];
        const csvRows = [headers.join(",")];

        result.rows.forEach(order => {
            let items = [];
            try {
                items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
            } catch (e) {
                items = [];
            }

            if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                    const quantity = Number(item.quantity || 0);
                    const price = Number(item.price || 0);

                    csvRows.push([
                        order.id,
                        new Date(order.created_at).toLocaleString('it-IT'),
                        `"${(item.name || '').replace(/"/g, '""')}"`,
                        `"${(item.category || 'Generico').replace(/"/g, '""')}"`,
                        quantity,
                        price.toFixed(2),
                        (quantity * price).toFixed(2),
                        `"${(item.note || '').replace(/"/g, '""')}"`,
                        Number(order.total || 0).toFixed(2)
                    ].join(","));
                });
            }
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=report_sessione_${sessionId}.csv`);
        return res.status(200).send(csvRows.join("\n"));

    } catch (err) {
        console.error("❌ Errore esportazione CSV:", err);
        return res.status(500).json({ error: "Errore interno durante la generazione del CSV" });
    }
});

export default router;