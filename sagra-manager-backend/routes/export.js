const express = require('express');
const router = express.Router();
// Sostituisci con il percorso corretto del tuo pool di connessione Postgres
const pool = require('../db');

router.get('/session/:id/csv', async (req, res) => {
    const sessionId = req.params.id;

    try {
        // 1. Verifica che la sessione esista e sia conclusa
        const sessionRes = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
        const session = sessionRes.rows[0];

        if (!session) {
            return res.status(404).json({ error: "Sessione non trovata" });
        }
        if (!session.end_time) {
            return res.status(400).json({ error: "Impossibile esportare dati di una sessione ancora aperta" });
        }

        // 2. Query nativa con CROSS JOIN LATERAL per esplodere l'array JSONB di items
        const ordersQuery = `
      SELECT 
        o.id AS ordine_id,
        o.created_at AS data_ora,
        i.name AS prodotto,
        COALESCE(i.category, 'Generico') AS categoria,
        i.quantity AS quantita,
        i.price AS prezzo_unitario,
        (i.quantity * i.price) AS totale_riga,
        COALESCE(i.note, '') AS note,
        o.total AS totale_ordine
      FROM orders o
      CROSS JOIN LATERAL jsonb_to_recordset(o.items) AS i(name text, category text, quantity int, price numeric, note text)
      WHERE o.status = 'completed'
        AND o.created_at >= $1 
        AND o.created_at <= $2
      ORDER BY o.created_at ASC, o.id ASC;
    `;

        const result = await pool.query(ordersQuery, [session.start_time, session.end_time]);

        // 3. Strutturazione del file CSV con intestazioni pulite per Excel
        const headers = ["ID Ordine", "Data e Ora", "Prodotto", "Categoria", "Quantita", "Prezzo Unitario", "Totale Riga", "Note Prodotto", "Totale Ordine"];
        const csvRows = [headers.join(",")];

        result.rows.forEach(row => {
            csvRows.push([
                row.ordine_id,
                new Date(row.data_ora).toLocaleString('it-IT'),
                `"${row.prodotto.replace(/"/g, '""')}"`, // Escape delle virgolette interne
                `"${row.categoria.replace(/"/g, '""')}"`,
                row.quantita,
                Number(row.prezzo_unitario).toFixed(2),
                Number(row.totale_riga).toFixed(2),
                `"${row.note.replace(/"/g, '""')}"`,
                Number(row.totale_ordine).toFixed(2)
            ].join(","));
        });

        // 4. Invio del flusso di testo con Header MIME corretti per il download immediato
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=sessione_${sessionId}.csv`);

        return res.status(200).send(csvRows.join("\n"));

    } catch (err) {
        console.error("❌ Errore esportazione nativa CSV:", err);
        return res.status(500).json({ error: "Errore interno durante la generazione del report CSV" });
    }
});

module.exports = router;