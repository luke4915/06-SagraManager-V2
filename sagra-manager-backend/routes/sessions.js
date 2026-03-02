import express from "express";
import { pool } from "../db.js";

const router = express.Router();

export default function (broadcast) {
    // GET /api/sessions
    router.get("/", async (req, res) => {
        try {
            const { rows } = await pool.query("SELECT * FROM sessions ORDER BY start_time DESC");
            res.json(rows);
        } catch (err) { res.status(500).json({ error: "db error" }); }
    });

    // GET /api/sessions/latest
    router.get("/latest", async (req, res) => {
        try {
            const { rows } = await pool.query("SELECT * FROM sessions ORDER BY start_time DESC LIMIT 1");
            res.json(rows[0] || null);
        } catch (err) { res.status(500).json({ error: "db error" }); }
    });

    // POST /api/sessions/start
    router.post("/start", async (req, res) => {
        try {
            const { name } = req.body;
            if (!name?.trim()) return res.status(400).json({ error: "Nome obbligatorio" });

            const { rows } = await pool.query(
                "INSERT INTO sessions (name, start_time) VALUES ($1, NOW()) RETURNING *",
                [name.trim()]
            );
            if (broadcast) broadcast({ type: "session_started", session: rows[0] });
            res.json(rows[0]);
        } catch (err) { res.status(500).json({ error: "db error" }); }
    });

    // POST /api/sessions/end
    router.post("/end", async (req, res) => {
        try {
            const { rows } = await pool.query(
                `UPDATE sessions SET end_time = NOW() 
         WHERE id = (SELECT id FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1)
         RETURNING *`
            );
            if (rows[0] && broadcast) broadcast({ type: "session_ended", session: rows[0] });
            res.json(rows[0] || null);
        } catch (err) { res.status(500).json({ error: "db error" }); }
    });

    return router;
}