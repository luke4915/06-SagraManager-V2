import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';
import logger from '../logger.js';

const router = express.Router();

// Valori ammessi per print_destination
const VALID_DESTINATIONS = ['bar', 'kitchen', 'both'];

// GET /api/products/menu — pubblico, solo prodotti visibili + nome sessione attiva
router.get('/menu', async (req, res) => {
    try {
        const [{ rows: products }, { rows: sessions }] = await Promise.all([
            pool.query('SELECT id, name, price, category, color FROM products WHERE visible = true ORDER BY category, name'),
            pool.query('SELECT name FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1')
        ]);
        res.json({ sessionName: sessions[0]?.name || null, products });
    } catch (err) {
        logger.error({ err }, 'Errore GET /api/products/menu');
        res.status(500).json({ error: 'Errore caricamento menu' });
    }
});

// GET /api/products
router.get("/", authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM products ORDER BY category, name");
        res.json(rows);
    } catch (err) {
        logger.error({ err }, 'Errore caricamento prodotti')
        res.status(500).json({ error: "Errore caricamento prodotti" });
    }
});

// PATCH /api/products/bulk-visibility
router.patch("/bulk-visibility", authenticate, authorizeAdmin, async (req, res) => {
    const { ids, visible } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || visible === undefined)
        return res.status(400).json({ error: "Dati non validi." });
    try {
        const { rows } = await pool.query(
            "UPDATE products SET visible = $1 WHERE id = ANY($2) RETURNING *",
            [visible, ids]
        );
        res.json({ message: `Aggiornati ${rows.length} prodotti`, updatedCount: rows.length });
    } catch (err) {
        res.status(500).json({ error: "Errore aggiornamento massivo" });
    }
});

// POST /api/products
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
    const { name, price, category, color, visible, print_destination } = req.body;
    if (!name?.trim() || price === undefined || price === null || !category?.trim())
        return res.status(400).json({ error: "Nome, Prezzo e Categoria sono obbligatori." });
    if (name.trim().length > 40)
        return res.status(400).json({ error: "Il nome è troppo lungo (max 40 caratteri)." });
    if (isNaN(price) || price < 0)
        return res.status(400).json({ error: "Prezzo non valido." });

    const dest = VALID_DESTINATIONS.includes(print_destination) ? print_destination : 'both';
    try {
        const { rows } = await pool.query(
            `INSERT INTO products (name, price, category, color, visible, print_destination)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name.trim(), price, category.trim(), color || '#3b82f6', visible !== false, dest]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        logger.error({ err }, 'Errore salvataggio prodotto')
        res.status(500).json({ error: "Errore salvataggio prodotto" });
    }
});

// PUT /api/products/:id
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, price, category, color, visible, print_destination } = req.body;
    if (!name?.trim() || price === undefined || price === null || !category?.trim())
        return res.status(400).json({ error: "Campi obbligatori mancanti." });

    const dest = VALID_DESTINATIONS.includes(print_destination) ? print_destination : 'both';
    try {
        const { rows } = await pool.query(
            `UPDATE products SET name=$1, price=$2, category=$3, color=$4, visible=$5, print_destination=$6
             WHERE id=$7 RETURNING *`,
            [name.trim(), price, category.trim(), color, visible, dest, id]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Prodotto non trovato" });
        res.json(rows[0]);
    } catch (err) {
        logger.error({ err }, 'Errore aggiornamento prodotto')
        res.status(500).json({ error: "Errore aggiornamento prodotto" });
    }
});

// DELETE /api/products/:id
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Prodotto non trovato" });
        res.json({ message: "Prodotto eliminato" });
    } catch (err) {
        res.status(500).json({ error: "Errore eliminazione prodotto" });
        logger.error({ err }, 'Errore eliminazione prodotto')
    }
});

export default router;
