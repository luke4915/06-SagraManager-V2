import express from 'express';
import axios from 'axios';
import { compileToEposXml, compileToEscPosCommands } from '../services/receiptCompiler.js';

const router = express.Router();

router.post('/print-job', async (req, res) => {
    try {
        const { tenantId, printType, orderData, printerIp, driverType } = req.body;

        // 1. Recupera lo schema JSON associato dal database Postgres
        const templateQuery = await db.query(
            `SELECT schema_json, paper_width FROM receipt_templates WHERE tenant_id = $1 AND type = $2`,
            [tenantId, printType]
        );

        if (templateQuery.rows.length === 0) {
            return res.status(404).json({ error: "Template scontrino non trovato per questo tenant." });
        }

        const { schema_json, paper_width } = templateQuery.rows[0];

        // 2. Compila in base al driver della stampante
        if (driverType === 'epson_epos') {
            const xmlPayload = compileToEposXml(schema_json, orderData, paper_width);

            // Invio diretto alla stampante Epson via LAN (Porta 80 / ePOS-Print)
            await axios.post(`http://${printerIp}/cgi-bin/epos/service.cgi`, xmlPayload, {
                headers: { 'Content-Type': 'text/xml; charset=utf-8' },
                timeout: 5000
            });

        } else if (driverType === 'generic_escpos') {
            const binaryPayload = compileToEscPosCommands(schema_json, orderData, paper_width);

            // Invio socket TCP grezzo alla porta 9100 della stampante di rete
            const net = await import('net');
            const client = new net.Socket();
            client.connect(9100, printerIp, () => {
                client.write(binaryPayload);
                client.end();
            });
        }

        return res.json({ success: true, message: "Stampa inviata con successo." });
    } catch (err) {
        console.error("Errore Stampa:", err);
        return res.status(500).json({ error: "Impossibile completare la stampa." });
    }
});

export default router;