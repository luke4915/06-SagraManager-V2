import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EposXmlPrinter } from "./eposXmlPrinter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(__dirname, "..", "tmp");
let tmpDirEnsured = false; // evita di rifare la syscall mkdirSync ad ogni singola stampa

const LINE_WIDTH = 42;
const DIVIDER = "=".repeat(LINE_WIDTH);
const DIVIDER_THIN = "-".repeat(LINE_WIDTH);
const HEADER_LOGO_WIDTH = 512;

const ASSOCIAZIONE_NOME = "ASSOCIAZIONE MARIA SS DI TROCCHIO APS";
const ASSOCIAZIONE_CF = "C.F. 90051130608";

function loadLogoBuffer(logoPath) {
  if (!logoPath || !fs.existsSync(logoPath)) return null;
  return fs.readFileSync(logoPath);
}

function wrapText(text, width) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  words.forEach((word) => {
    if ((current + word).length > width) {
      if (current) lines.push(current.trimEnd());
      current = word + " ";
    } else {
      current += word + " ";
    }
  });
  if (current.trim()) lines.push(current.trimEnd());
  return lines.length ? lines : [text.slice(0, width)];
}

// Distribuisce colonne su tutta la larghezza LINE_WIDTH partendo da sinistra,
// con almeno 1 spazio di gap garantito tra colonne (mai testo "attaccato").
function justifyRow(cols, width = LINE_WIDTH) {
  const n = cols.length;
  const gap = 1;
  const fixedSpace = gap * (n - 1);
  const otherWidths = cols.slice(1).map((c) => c.length);
  const firstWidth = Math.max(1, width - fixedSpace - otherWidths.reduce((a, b) => a + b, 0));

  const parts = [cols[0].slice(0, firstWidth).padEnd(firstWidth)];
  cols.slice(1).forEach((c) => parts.push(c));
  return parts.join(" ".repeat(gap));
}

function rowLR(left, right, width = LINE_WIDTH) {
  return justifyRow([left, right], width);
}

// Riga a 3 colonne (Prodotto, Qtà, Contributo), larghezze right/center fisse
// così i numeri restano allineati tra le righe di un ordine.
function rowThreeColumns(left, center, right, width = LINE_WIDTH) {
  const rightWidth = 8;
  const centerWidth = 4;
  const leftWidth = width - rightWidth - centerWidth - 2; // -2 = i due gap da 1 spazio

  const l = left.slice(0, leftWidth).padEnd(leftWidth);
  const c = center.padStart(centerWidth);
  const r = right.padStart(rightWidth);
  return `${l} ${c} ${r}`;
}

function encodeOrderId(orderId, timestamp) {
  let code = orderId.toString(36).toUpperCase().padStart(6, "0");
  if (timestamp) {
    const d = new Date(timestamp);
    code += String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + String(d.getSeconds()).padStart(2, "0");
  }
  return `ORD${code}`;
}

function filterItems(items, destination) {
  if (destination === "all") return items;
  return items.filter((item) => (item.print_destination || "both") === "both" || (item.print_destination === destination));
}

async function renderHeader(printer, { title, orderId, timestamp, logoPath, showLogo, subtitle = "", pickupStatus = null, showTimestamp = false }) {
  if (showLogo && logoPath) {
    const logoBuf = loadLogoBuffer(logoPath);
    if (logoBuf) {
      try {
        printer.align("CT");
        await printer.image(logoBuf, { align: "center", width: HEADER_LOGO_WIDTH });
        printer.feed(1);
      } catch (err) {
        console.error("Errore stampa logo:", err.message);
      }
    }
  }

  printer.align("CT").style("B").text(ASSOCIAZIONE_NOME);
  printer.align("CT").style("NORMAL").text(ASSOCIAZIONE_CF);
  printer.align("CT").text(DIVIDER_THIN);

  printer.align("CT").style("B").text(title).style("NORMAL");
  if (subtitle)
    printer.align("CT").text(DIVIDER_THIN);
  printer.align("CT").style("B").text(subtitle).style("NORMAL");
  printer.align("CT").text(DIVIDER_THIN);

  printPickupBanner(printer, pickupStatus);

  // Ordine progressivo: sempre visibile. Data/ora: solo se showTimestamp è true.
  if (showTimestamp) {
    const ts = new Date(timestamp);
    printer.align("LT").text(rowLR(`Ordine: #${orderId}`, ts.toLocaleTimeString("it-IT")));
    printer.align("LT").text(`Data: ${ts.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`);
  } else {
    printer.align("LT").text(`Ordine: #${orderId}`);
  }
  printer.align("CT").text(DIVIDER_THIN);
}

function renderItems(printer, items, layoutType = "standard") {
  if (layoutType === "customer") {
    printer.align("LT").text(rowThreeColumns("OMAGGIO", "QTA", "CONTRIB."));
    printer.align("CT").text(DIVIDER_THIN);

    const maxTextWidth = LINE_WIDTH - 8 - 4 - 2; // costante, invariante per ogni item: calcolata una sola volta
    items.forEach((item) => {
      const qty = String(item.quantity).trim();
      const priceUnit = parseFloat(item.price || 0);
      const rowTotal = `€ ${(priceUnit * item.quantity).toFixed(2)}`;

      const lines = wrapText(item.name.toUpperCase(), maxTextWidth);

      lines.forEach((line, i) => {
        if (i === 0) {
          printer.align("LT").text(rowThreeColumns(line, qty, rowTotal));
        } else {
          printer.align("LT").text(line);
        }
      });
      if (item.note) printer.align("LT").text(`  >> ${item.note}`);
    });
  } else {
    const headerText = layoutType === "association" ? "DESCRIZIONE" : "OMAGGIO";
    printer.align("LT").text(rowLR(headerText, "QTA"));
    printer.align("CT").text(DIVIDER_THIN);

    const maxTextWidth = LINE_WIDTH - 4; // costante, invariante per ogni item: calcolata una sola volta
    const isAssociation = layoutType === "association"; // valutato una sola volta invece che per ogni item
    items.forEach((item) => {
      const qty = String(item.quantity).trim();
      const lines = wrapText(item.name.toUpperCase(), maxTextWidth);
      lines.forEach((line, i) => {
        if (i === 0) {
          if (isAssociation) {
            printer.align("LT").text(rowLR(line, qty));
          } else {
            printer.align("LT").style("B").text(rowLR(line, qty)).style("NORMAL");
          }
        } else {
          printer.align("LT").text("  " + line);
        }
      });
      if (item.note) printer.align("LT").text(`  >> ${item.note}`);
    });
  }
  printer.align("CT").text(DIVIDER_THIN);
}

// Banda nera con testo bianco, font_a, size 2x2 — per lo stato di ritiro,
// mostrato a colpo d'occhio subito sotto il titolo. Max ~21 caratteri a
// size 2 su 42 colonne (oltre va a capo in modo brutto).
function printPickupBanner(printer, status) {
  if (status !== "valid") return; // invalid (o qualsiasi altro valore) non stampa nulla

  const text = "VALIDO PER IL RITIRO";
  printer.align("CT").font("font_a").reverse(true);
  printer.size(2, 2).text(text);
  printer.style("NORMAL").reverse(false).size(1, 1).font("font_a");
  printer.align("CT").text(DIVIDER_THIN);
}

async function renderFooter(printer, { total, QRcode, showTotal = false, showQR = false }) {
  if (showTotal && total !== null && total !== undefined) {
    printer.align("CT").style("B").text("TOTALE CONTRIBUTO VOLONTARIO").style("NORMAL");
    printer.align("RT").style("B").size(2, 2).text(`€ ${parseFloat(total).toFixed(2)}`).size(1, 1).style("NORMAL");
    printer.align("CT").text(DIVIDER_THIN);

    printer.align("CT").text("Raccolta fondi occasionale ai");
    printer.align("CT").text("sensi dell'art.7 D.Lgs.117/17");
    printer.align("CT").text("L'omaggio gastronomico è offerto");
    printer.align("CT").text("come mero ringraziamento.");
    printer.align("CT").text(DIVIDER_THIN);
  }

  if (QRcode) {
    if (showQR) {
      printer.align("CT").text("Mostra questo QR Code al ritiro:");
      printer.feed(1);
      printer.align("CT");
      // Utilizzo del metodo nativo per la generazione del QR Code via hardware Epson ePOS XML
      printer.qrcode(QRcode, { model: "model2", level: "level_l", width: 3 });
      printer.feed(1);
    } else {
      printer.align("CT").text(`ID RITIRO: ${QRcode}`);
    }
  }

  printer.align("CT").text(DIVIDER);
  printer.align("CT").text("Powered by StandManager");
  printer.feed(2);
  printer.cut();
}

export async function renderCustomerEscpos(printer, orderData, logoPath, showLogo = false, showTimestamp = false) {
  const ts = new Date(orderData.created_at);
  await renderHeader(printer, { title: "DOCUMENTO NON FISCALE", subtitle: "COPIA BENEFICIARIO", orderId: orderData.id, timestamp: ts, logoPath, showLogo, pickupStatus: "invalid", showTimestamp });
  renderItems(printer, orderData.items, "customer");
  await renderFooter(printer, { total: orderData.total, QRcode: encodeOrderId(orderData.id, ts), showTotal: true, showQR: false });
}

export async function renderAssociationEscpos(printer, orderData, logoPath, showLogo = false, showTimestamp = false) {
  const ts = new Date(orderData.created_at);
  await renderHeader(printer, { title: "DOCUMENTO NON FISCALE", subtitle: "COPIA INTERNA ASSOCIAZIONE", orderId: orderData.id, timestamp: ts, logoPath, showLogo, showTimestamp });
  renderItems(printer, orderData.items, "association");
  await renderFooter(printer, { total: orderData.total, QRcode: encodeOrderId(orderData.id, ts), showTotal: true, showQR: false });
}

export async function renderKitchenEscpos(printer, orderData, logoPath, showLogo = false, showTimestamp = false) {
  const items = filterItems(orderData.items, "kitchen");
  if (!items.length) return;
  const ts = new Date(orderData.created_at || Date.now());
  await renderHeader(printer, { title: "=== COPIA CUCINA ===", orderId: orderData.id, timestamp: ts, logoPath, showLogo, showTimestamp });
  renderItems(printer, items, "kitchen");
  await renderFooter(printer, {});
}

export async function renderGastronomyEscpos(printer, orderData, logoPath, showLogo = false, showTimestamp = false) {
  const items = filterItems(orderData.items, "kitchen");
  if (!items.length) return;
  const ts = new Date(orderData.created_at || Date.now());
  await renderHeader(printer, { title: "*** COPIA OMAGGIO GASTRONOMICO ***", orderId: orderData.id, timestamp: ts, logoPath, showLogo, pickupStatus: "valid", showTimestamp });
  renderItems(printer, items, "gastronomy");
  await renderFooter(printer, { QRcode: encodeOrderId(orderData.id, ts), showQR: false });
}

export async function renderBarEscpos(printer, orderData, logoPath, showLogo = true, showTimestamp = false) {
  const items = filterItems(orderData.items, "bar");
  if (!items.length) return;
  const ts = new Date(orderData.created_at || Date.now());
  await renderHeader(printer, { title: "*** COPIA OMAGGIO BAR ***", orderId: orderData.id, timestamp: ts, logoPath, showLogo, pickupStatus: "valid", showTimestamp });
  renderItems(printer, items, "bar");
  await renderFooter(printer, { QRcode: encodeOrderId(orderData.id, ts), showQR: false });
}

export const templatesEscpos = {
  Cliente: renderCustomerEscpos,
  Associazione: renderAssociationEscpos,
  Cucina: renderKitchenEscpos,
  "Ritiro Gastronomia": renderGastronomyEscpos,
  "Ritiro Bar": renderBarEscpos,
};

export async function printESCPosNetwork(setting, orderData, eventName, logoPath, hostDefault = "127.0.0.1", portDefault = 443) {
  let templateFunc;
  if (typeof setting === "function") {
    templateFunc = setting;
  } else if (setting && typeof setting === "object") {
    templateFunc = templatesEscpos[setting.copy_type];
    if (!templateFunc) return console.warn(`Nessun template per: "${setting.copy_type}"`);
  } else return;

  if (!tmpDirEnsured) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    tmpDirEnsured = true;
  }

  let host = hostDefault, port = portDefault;
  const addr = setting?.printer_address || "";
  if (addr) {
    const [h, p] = addr.split(":");
    host = h;
    if (p) port = parseInt(p, 10);
  }

  const devid = setting?.printer_devid || "local_printer";
  const showLogo = setting?.show_logo !== undefined ? setting.show_logo : true;
  const showTimestamp = setting?.show_timestamp !== undefined ? setting.show_timestamp : false;

  const printer = new EposXmlPrinter();
  console.time("render");
  await templateFunc(printer, orderData, logoPath, showLogo, showTimestamp);
  console.timeEnd("render");
  if (!printer.elements.length) return;

  console.time("send");
  await printer.send(host, { devid, port });
  console.timeEnd("send")
  console.log(`[STAMPA] Completata su: ${host}:${port} (devid=${devid})`);
}