import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';

const router = express.Router();

// GET /api/products - Carica tutti i prodotti
router.get("/", async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM products ORDER BY category, name");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore caricamento prodotti" });
    }
});

// POST /api/products - Aggiunge un prodotto (Solo Admin)
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
    const { name, price, category, color } = req.body;

    // 🛡️ VALIDAZIONE RIGIDA
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
        const { rows } = await pool.query(
            "INSERT INTO products (name, price, category, color) VALUES ($1, $2, $3, $4) RETURNING *",
            [name.trim(), price, category.trim(), color || '#3b82f6']
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
    const { name, price, category, color } = req.body;

    // 🛡️ VALIDAZIONE RIGIDA
    if (!name?.trim() || price === undefined || price === null || !category?.trim()) {
        return res.status(400).json({ error: "Campi obbligatori mancanti per la modifica." });
    }

    if (name.trim().length > 40) {
        return res.status(400).json({ error: "Il nome del prodotto è troppo lungo (max 40 caratteri)." });
    }

    if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: "Prezzo non valido." });
    }

    try {
        const { rows } = await pool.query(
            "UPDATE products SET name=$1, price=$2, category=$3, color=$4 WHERE id=$5 RETURNING *",
            [name.trim(), price, category.trim(), color, id]
        );

        if (rows.length === 0) return res.status(404).json({ error: "Prodotto non trovato" });

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