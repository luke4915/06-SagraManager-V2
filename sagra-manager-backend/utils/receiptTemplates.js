import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import escpos from "escpos";
import escposNetwork from "escpos-network";
import bwipjs from "bwip-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(__dirname, '..', 'tmp');

const LINE_WIDTH = 42;
const DIVIDER = '='.repeat(LINE_WIDTH);
const DIVIDER_THIN = '-'.repeat(LINE_WIDTH);

// ===== Logo =====
function printLogo(printer, logoPath) {
  return new Promise((resolve) => {
    if (!logoPath || !fs.existsSync(logoPath)) return resolve();
    escpos.Image.load(logoPath, (image) => {
      try {
        if (!(image instanceof escpos.Image)) throw new Error("Logo non valido");
        printer.align("CT").image(image, "s8");
        printer.feed(1);
      } catch (err) {
        console.error("Errore logo:", err.message);
      }
      resolve();
    });
  });
}

// ===== Barcode =====
async function printBarcodeImage(printer, code) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const tmpPath = path.join(TMP_DIR, `barcode_${code}.png`);
  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128', text: code, scale: 3, height: 10,
      includetext: true, textxalign: 'center', textyoffset: 4
    });
    fs.writeFileSync(tmpPath, pngBuffer);
    await new Promise((resolve) => {
      escpos.Image.load(tmpPath, (image) => {
        printer.align('CT').image(image, 's8');
        resolve();
      });
    });
  } catch (err) {
    console.error("Errore barcode:", err.message);
    printer.align('CT').text(code);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) { }
  }
}

// ===== Helpers =====
function wrapText(text, width) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  words.forEach(word => {
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

function rowLR(left, right, width = LINE_WIDTH) {
  const gap = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(gap) + right;
}

function encodeOrderId(orderId, timestamp = null) {
  let code = orderId.toString(36).toUpperCase().padStart(6, '0');
  if (timestamp) {
    const d = new Date(timestamp);
    code += String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + String(d.getSeconds()).padStart(2, '0');
  }
  return `ORD${code}`;
}

function filterItems(items, destination) {
  if (destination === 'all') return items;
  return items.filter(item => {
    const d = item.print_destination || 'both';
    return d === 'both' || d === destination;
  });
}

// ===== Header =====
async function renderHeader(printer, { eventName, title, orderId, timestamp, logoPath }) {
  printer.encode('UTF-8');
  if (logoPath) await printLogo(printer, logoPath);

  printer.align("CT").style("B").size(1, 1).text(eventName.toUpperCase());
  printer.size(0, 0).style("NORMAL");
  printer.feed(1);

  printer.align("CT").text(DIVIDER);
  printer.align("CT").style("B").text(title).style("NORMAL");
  printer.align("CT").text(DIVIDER);
  printer.feed(1);

  const ts = new Date(timestamp);
  printer.align("LT").text(rowLR(`Ordine: #${orderId}`, ts.toLocaleTimeString('it-IT')));
  printer.align("LT").text(`Data: ${ts.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`);
  printer.text(DIVIDER_THIN);
}

// ===== Items =====
function renderItems(printer, items, showPrices = false) {
  if (showPrices) {
    printer.align("LT").text('ARTICOLO             QT   PREZZO    TOT');
    printer.text(DIVIDER_THIN);
    items.forEach(item => {
      const qty = String(item.quantity).padStart(2);
      const price = parseFloat(item.price).toFixed(2).padStart(7);
      const tot = (parseFloat(item.price) * item.quantity).toFixed(2).padStart(6);
      const lines = wrapText(item.name.toUpperCase(), 20);
      lines.forEach((line, i) => {
        if (i === 0) printer.align("LT").text(line.padEnd(20) + `  ${qty}${price} ${tot}`);
        else printer.align("LT").text('  ' + line);
      });
      if (item.note) printer.align("LT").text(`  >> ${item.note}`);
    });
  } else {
    printer.align("LT").text('ARTICOLO                          QT');
    printer.text(DIVIDER_THIN);
    items.forEach(item => {
      const qty = String(item.quantity).padStart(2);
      const lines = wrapText(item.name.toUpperCase(), 32);
      lines.forEach((line, i) => {
        if (i === 0) printer.align("LT").style("B").text(line.padEnd(33) + `  ${qty}`).style("NORMAL");
        else printer.align("LT").text('  ' + line);
      });
      if (item.note) printer.align("LT").text(`  >> ${item.note}`);
    });
  }
  printer.text(DIVIDER_THIN);
}

// ===== Footer =====
async function renderFooter(printer, { total, barcode, showTotal = false }) {
  if (showTotal && total !== null && total !== undefined) {
    printer.feed(1);
    printer.align("RT").style("B").size(1, 1).text(`TOTALE: EUR ${parseFloat(total).toFixed(2)}`);
    printer.size(0, 0).style("NORMAL");
    printer.feed(1);
  }

  printer.text(DIVIDER);

  if (barcode) {
    printer.feed(1);
    printer.align("CT").text("Mostra questo codice al ritiro:");
    printer.feed(1);
    await printBarcodeImage(printer, barcode);
    printer.feed(1);
  }

  printer.align("CT").text(DIVIDER);
  printer.align("CT").style("B").text("Grazie per il tuo acquisto!").style("NORMAL");
  printer.align("CT").text("Sagra Manager - by Luke");
  printer.feed(4);
  printer.cut();
}

// ===== Templates =====
export async function renderCustomerEscpos(printer, orderData, eventName, logoPath) {
  const ts = new Date(orderData.created_at);
  await renderHeader(printer, { eventName, title: '*** SCONTRINO CLIENTE ***', orderId: orderData.id, timestamp: ts, logoPath });
  renderItems(printer, orderData.items, true);
  await renderFooter(printer, { total: orderData.total, barcode: encodeOrderId(orderData.id, ts), showTotal: true });
}

export async function renderKitchenEscpos(printer, orderData, eventName, logoPath) {
  const items = filterItems(orderData.items, 'kitchen');
  if (!items.length) return;
  const ts = new Date(orderData.created_at || Date.now());
  await renderHeader(printer, { eventName, title: '=== COMANDA CUCINA ===', orderId: orderData.id, timestamp: ts, logoPath: null });
  renderItems(printer, items, false);
  await renderFooter(printer, { showTotal: false });
}

export async function renderGastronomyEscpos(printer, orderData, eventName, logoPath) {
  const items = filterItems(orderData.items, 'kitchen');
  if (!items.length) return;
  const ts = new Date(orderData.created_at || Date.now());
  await renderHeader(printer, { eventName, title: '*** RITIRO GASTRONOMIA ***', orderId: orderData.id, timestamp: ts, logoPath: null });
  renderItems(printer, items, false);
  await renderFooter(printer, { barcode: encodeOrderId(orderData.id, ts), showTotal: false });
}

export async function renderBarEscpos(printer, orderData, eventName, logoPath) {
  const items = filterItems(orderData.items, 'bar');
  if (!items.length) return;
  const ts = new Date(orderData.created_at || Date.now());
  await renderHeader(printer, { eventName, title: '*** RITIRO BAR ***', orderId: orderData.id, timestamp: ts, logoPath: null });
  renderItems(printer, items, false);
  await renderFooter(printer, { barcode: encodeOrderId(orderData.id, ts), showTotal: false });
}

// ===== Map =====
export const templatesEscpos = {
  "Cliente": renderCustomerEscpos,
  "Cucina": renderKitchenEscpos,
  "Ritiro Gastronomia": renderGastronomyEscpos,
  "Ritiro Bar": renderBarEscpos,
};

// ===== printESCPosNetwork =====
// Stampante fisica Epson: printer_name = "192.168.1.x:9100"
// Emulatore locale:       printer_name = "127.0.0.1:631"
export async function printESCPosNetwork(setting, orderData, eventName, logoPath, hostDefault = "127.0.0.1", portDefault = 631) {
  let templateFunc, device;

  if (typeof setting === "function") {
    templateFunc = setting;
  } else if (setting && typeof setting === "object") {
    templateFunc = templatesEscpos[setting.copy_type];
    if (!templateFunc) {
      console.warn(`Nessun template per: "${setting.copy_type}"`);
      return;
    }
  } else return;

  fs.mkdirSync(TMP_DIR, { recursive: true });

  // USB
  if (setting?.printer_type === 'usb') {
    const usbDevices = escpos.USB.findPrinter();
    if (!usbDevices.length) throw new Error('Nessuna stampante USB trovata');
    // Se è specificato un nome, cerca quella; altrimenti prende la prima
    const usbDevice = usbDevices.find(d => d.deviceDescriptor?.iProduct === setting.printer_address) || usbDevices[0];
    device = new escpos.USB(usbDevice);
  } else {
    // Network: legge printer_address (formato IP:porta) oppure usa default
    let host = hostDefault, port = portDefault;
    const addr = setting?.printer_address || '';
    if (addr) {
      const m = addr.match(/^(.+?):(\d{2,5})$/);
      if (m) { host = m[1]; port = parseInt(m[2], 10); }
      else if (/^\d{1,3}(\.\d{1,3}){3}$/.test(addr)) host = addr;
    }
    device = new escposNetwork(host, port);
  }

  const printer = new escpos.Printer(device);

  return new Promise((resolve, reject) => {
    device.open(async (err) => {
      if (err) return reject(err);
      try {
        await templateFunc(printer, orderData, eventName, logoPath);
        printer.close(() => resolve());
      } catch (e) {
        try { printer.close(() => reject(e)); } catch (_) { reject(e); }
      }
    });
  });
}