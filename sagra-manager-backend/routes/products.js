import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';

const router = express.Router();

// GET /api/products - Carica tutti i prodotti (inclusa la visibilità)
router.get("/", async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM products ORDER BY category, name");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore caricamento prodotti" });
    }
});

// PATCH /api/products/bulk-visibility - Modifica visibilità multipla (Solo Admin)
router.patch("/bulk-visibility", authenticate, authorizeAdmin, async (req, res) => {
    const { ids, visible } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || visible === undefined) {
        return res.status(400).json({ error: "Dati non validi per l'aggiornamento di massa." });
    }

    try {
        const { rows } = await pool.query(
            "UPDATE products SET visible = $1 WHERE id = ANY($2) RETURNING *",
            [visible, ids]
        );
        res.json({ message: `Aggiornati ${rows.length} prodotti`, updatedCount: rows.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore aggiornamento massivo prodotti" });
    }
});

// POST /api/products - Aggiunge un prodotto (Solo Admin)
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
    const { name, price, category, color, visible } = req.body;

    if (!name?.trim() || price === undefined || price === null || !category?.trim()) {
        return res.status(400).json({ error: "Nome, Prezzo e Categoria sono obbligatori." });
    }

    if (name.trim().length > 40) {
        return res.status(400).json({ error: "Il nome del prodotto è troppo lungo (max 40 caratteri)." });
    }

    if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: "Il prezzo deve essere un numero valido (min. 0)." });
    }

    try {
        const isVisible = visible !== false; // default true
        const { rows } = await pool.query(
            "INSERT INTO products (name, price, category, color, visible) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name.trim(), price, category.trim(), color || '#3b82f6', isVisible]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore salvataggio prodotto" });
    }
});

// PUT /api/products/:id - Modifica un prodotto (Solo Admin)
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, price, category, color, visible } = req.body;

    // 🔍 LOG DI DEBUG BACKEND
    console.log(`[BACKEND PUT] ID: ${id} | Name: ${name} | Visible Ricevuto (Tipo: ${typeof visible}):`, visible);

    if (!name?.trim() || price === undefined || price === null || !category?.trim()) {
        return res.status(400).json({ error: "Campi obbligatori mancanti per la modifica." });
    }

    try {
        const { rows } = await pool.query(
            "UPDATE products SET name=$1, price=$2, category=$3, color=$4, visible=$5 WHERE id=$6 RETURNING *",
            [name.trim(), price, category.trim(), color, visible, id]
        );

        if (rows.length === 0) return res.status(404).json({ error: "Prodotto non trovato" });

        // 🔍 LOG DEL RECORD SALVATO
        console.log("[BACKEND RETURNING] Record aggiornato nel DB:", rows[0]);

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore aggiornamento prodotto" });
    }
});

// DELETE /api/products/:id - Elimina un prodotto (Solo Admin)
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Prodotto non trovato" });
        res.json({ message: "Prodotto eliminato" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore eliminazione prodotto" });
    }
});

export default router;