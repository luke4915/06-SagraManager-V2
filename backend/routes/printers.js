import express from "express";
import { execFile } from "child_process";
import { authenticate } from "../middleware/authenticate.js";
import logger from "../logger.js";

const router = express.Router();

/**
 * Recupera la lista delle stampanti installate (solo Windows)
 * tramite PowerShell in modo nativo.
 */
function getPrinters() {
  return new Promise((resolve, reject) => {
    // Script PowerShell compatto e sicuro
    const psScript = `
      $printers = Get-Printer | Select-Object Name, PrinterStatus, Default
      $printers | ConvertTo-Json -Compress
    `;

    execFile(
      "powershell.exe",
      ["-NoProfile", "-Command", psScript],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          logger.error({ error }, 'Errore PowerShell:');
          return reject(new Error("Errore durante l'esecuzione PowerShell"));
        }

        if (stderr && stderr.trim()) {
          logger.warn({ stderr }, 'Avviso PowerShell');
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          const printers = Array.isArray(parsed) ? parsed : [parsed];
          resolve(printers);
        } catch (err) {
          logger.error({ err }, 'Errore nel parsing JSON:')
          reject(new Error("Formato dati non valido da PowerShell"));
        }
      }
    );
  });
}

/**
 * GET /api/printers
 * Ritorna lista di stampanti disponibili su Windows
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const printers = await getPrinters();

    const formatted = printers.map((p) => ({
      name: p.Name || "Sconosciuta",
      status: p.PrinterStatus ?? null,
      isDefault: !!p.Default,
    }));

    res.json(formatted);
  } catch (err) {
    logger.error({ err }, 'Errore recupero stampanti:')
    res.status(500).json({ error: "Impossibile recuperare le stampanti" });
  }
});

export default router;
