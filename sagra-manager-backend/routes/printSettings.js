// routes/printSettings.js
import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorizeAdmin } from '../middleware/authenticate.js';

const router = express.Router();

// ─── COPY TYPES ───────────────────────────────────────────────

// GET /api/print-settings/copy-types — tutti gli utenti autenticati
router.get('/copy-types', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM copy_types ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Errore GET /copy-types:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/print-settings/copy-types — solo admin
router.post('/copy-types', authenticate, authorizeAdmin, async (req, res) => {
  const { name, label } = req.body;
  if (!name?.trim() || !label?.trim())
    return res.status(400).json({ error: 'name e label sono obbligatori' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO copy_types (name, label) VALUES ($1, $2) RETURNING *',
      [name.trim(), label.trim()]
    );
    // Crea subito una riga print_settings di default per il nuovo tipo
    await pool.query(
      'INSERT INTO print_settings (copy_type_id, printer_type, enabled) VALUES ($1, $2, false)',
      [rows[0].id, 'network']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ error: 'Nome già esistente' });
    console.error('Errore POST /copy-types:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/print-settings/copy-types/:id — solo admin
router.put('/copy-types/:id', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, label } = req.body;
  if (!name?.trim() || !label?.trim())
    return res.status(400).json({ error: 'name e label sono obbligatori' });

  try {
    const { rows } = await pool.query(
      'UPDATE copy_types SET name=$1, label=$2 WHERE id=$3 RETURNING *',
      [name.trim(), label.trim(), id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tipo copia non trovato' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ error: 'Nome già esistente' });
    console.error('Errore PUT /copy-types/:id:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/print-settings/copy-types/:id — solo admin
router.delete('/copy-types/:id', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM copy_types WHERE id=$1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Tipo copia non trovato' });
    res.json({ message: 'Tipo copia eliminato' });
  } catch (err) {
    console.error('Errore DELETE /copy-types/:id:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ─── PRINT SETTINGS ───────────────────────────────────────────

// GET /api/print-settings — tutti gli utenti autenticati
// Ritorna la configurazione completa (join con copy_types)
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ps.id, ps.copy_type_id, ct.name AS copy_type_name, ct.label AS copy_type_label,
             ps.printer_type, ps.printer_address, ps.enabled
      FROM print_settings ps
      JOIN copy_types ct ON ct.id = ps.copy_type_id
      ORDER BY ct.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('Errore GET /print-settings:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/print-settings/:id — solo admin
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { printer_type, printer_address, enabled } = req.body;

  if (!printer_type || !['network', 'usb'].includes(printer_type))
    return res.status(400).json({ error: 'printer_type deve essere "network" o "usb"' });

  try {
    const { rows } = await pool.query(
      `UPDATE print_settings
       SET printer_type=$1, printer_address=$2, enabled=$3
       WHERE id=$4 RETURNING *`,
      [printer_type, printer_address?.trim() || null, enabled, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Impostazione non trovata' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore PUT /print-settings/:id:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

export default router;
