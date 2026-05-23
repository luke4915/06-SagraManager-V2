import fs from "fs";
import escpos from "escpos";
import escposNetwork from "escpos-network";
import bwipjs from "bwip-js";

// ===== Helper: stampa logo =====
function printLogo(printer, logoPath) {
  return new Promise((resolve) => {
    if (logoPath && fs.existsSync(logoPath)) {
      escpos.Image.load(logoPath, (image) => {
        try {
          if (!(image instanceof escpos.Image)) throw new Error("File non convertito correttamente");
          printer.align("CT").image(image, "s8").newLine();
        } catch (err) {
          console.error("Errore logo ESC/POS:", err.message);
        }
        resolve();
      });
    } else resolve();
  });
}

// ===== Helper: barcode come immagine =====
async function printBarcodeImage(printer, code) {
  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128', text: code, scale: 3, height: 10,
      includetext: true, textxalign: 'center', textyoffset: 5
    });
    const tmpPath = `./tmp/barcode_${code}.png`;
    fs.writeFileSync(tmpPath, pngBuffer);
    await new Promise((resolve) => {
      escpos.Image.load(tmpPath, (image) => {
        printer.align('CT').image(image, 's8');
        resolve();
      });
    });
    fs.unlinkSync(tmpPath);
  } catch (err) {
    console.error("Errore barcode:", err);
    printer.align('CT').text(code);
  }
}

// ===== Header =====
async function renderHeader(printer, eventName, title) {
  printer.encode('UTF-8');
  printer.align("CT").style("B").text(eventName.toUpperCase()).style("NORMAL");
  if (title) printer.align("CT").text(title);
  printer.text("----------------------------------------");
}

// ===== Footer =====
async function renderFooter(printer, logoPath = null, orderBarcode = null, timestamp = null, total = null) {
  printer.text("----------------------------------------");
  if (total !== null)
    printer.align("RT").style("B").text(`Totale: € ${total.toFixed(2)}`).style("NORMAL");
  if (orderBarcode) {
    printer.newLine().align("CT").text("CODICE ORDINE:");
    await printBarcodeImage(printer, orderBarcode);
    printer.newLine();
  }
  if (timestamp) printer.align("CT").text(`Emesso: ${timestamp}`);
  printer.align("CT").style("B").text("Grazie per il tuo acquisto!").style("NORMAL");
  printer.align("CT").text("Powered by:");
  if (logoPath) await printLogo(printer, logoPath);
  printer.cut();
}

// ===== Wrapping testo =====
function wrapText(text, width) {
  const lines = [];
  let current = "";
  text.split(" ").forEach(word => {
    if ((current + word).length > width) { lines.push(current.trim()); current = word + " "; }
    else current += word + " ";
  });
  if (current) lines.push(current.trim());
  return lines;
}

function renderItems(printer, items, showPrices = false) {
  printer.text("Articolo               Q.ta  Prezzo  Totale");
  printer.text("----------------------------------------");
  items.forEach(item => {
    const qty = item.quantity.toString().padStart(3, " ");
    const priceStr = showPrices ? item.price.toFixed(2).padStart(6, " ") : "";
    const totalStr = showPrices ? (item.price * item.quantity).toFixed(2).padStart(6, " ") : "";
    const lines = wrapText(item.name.toUpperCase(), 20);
    lines.forEach((line, index) => {
      let lineText = line.padEnd(20, " ");
      if (index === 0) { lineText += `  ${qty}`; if (showPrices) lineText += `  ${priceStr}  ${totalStr}`; }
      printer.align("LT").text(lineText);
    });
    if (item.note) printer.align("LT").text(`   ↳ Nota: ${item.note}`);
  });
  printer.text("----------------------------------------");
}

// ===== Codifica ordine per barcode =====
function encodeOrderId(orderId, timestamp = null) {
  let code = orderId.toString(36).toUpperCase().padStart(6, '0');
  if (timestamp) {
    const d = new Date(timestamp);
    code += String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + String(d.getSeconds()).padStart(2, '0');
  }
  return `ORD${code}`;
}

// ===== Templates =====
export async function renderCustomerEscpos(printer, orderData, eventName, logoPath) {
  await renderHeader(printer, eventName, "Copia Cliente");
  printer.align("LT").text(`Ordine #${orderData.id}`).text("");
  renderItems(printer, orderData.items, true);
  const ts = new Date(orderData.created_at);
  await renderFooter(printer, logoPath, encodeOrderId(orderData.id, ts), ts.toLocaleString(), orderData.total);
}

export async function renderKitchenEscpos(printer, orderData, eventName, logoPath) {
  await renderHeader(printer, eventName, "Copia Cucina");
  printer.align("LT").text(`Ordine #${orderData.id}`).text("");
  renderItems(printer, orderData.items, false);
  const ts = orderData.created_at ? new Date(orderData.created_at) : new Date();
  await renderFooter(printer, logoPath, encodeOrderId(orderData.id, ts), ts.toLocaleString(), orderData.total);
}

export async function renderGastronomyEscpos(printer, orderData, eventName, logoPath) {
  await renderHeader(printer, eventName, "Copia Gastronomia");
  printer.align("LT").text(`Ordine #${orderData.id}`).text("");
  renderItems(printer, orderData.items, false);
  const ts = orderData.created_at ? new Date(orderData.created_at) : new Date();
  await renderFooter(printer, logoPath, encodeOrderId(orderData.id, ts), ts.toLocaleString(), orderData.total);
}

// FIX: aggiunto "Ritiro Bar" mancante
export async function renderBarEscpos(printer, orderData, eventName, logoPath) {
  await renderHeader(printer, eventName, "Copia Bar");
  printer.align("LT").text(`Ordine #${orderData.id}`).text("");
  renderItems(printer, orderData.items, false);
  const ts = orderData.created_at ? new Date(orderData.created_at) : new Date();
  await renderFooter(printer, logoPath, encodeOrderId(orderData.id, ts), ts.toLocaleString(), orderData.total);
}

// ===== Export map — tutti e 4 i tipi =====
export const templatesEscpos = {
  "Cliente": renderCustomerEscpos,
  "Cucina": renderKitchenEscpos,
  "Ritiro Gastronomia": renderGastronomyEscpos,
  "Ritiro Bar": renderBarEscpos,        // era mancante
};

// ===== Helper stampa network =====
export async function printESCPosNetwork(settingOrTemplate, orderData, eventName, logoPath, hostDefault = "127.0.0.1", portDefault = 631) {
  let templateFunc;
  let host = hostDefault;
  let port = portDefault;

  if (typeof settingOrTemplate === "function") {
    templateFunc = settingOrTemplate;
  } else if (settingOrTemplate && typeof settingOrTemplate === "object") {
    templateFunc = templatesEscpos[settingOrTemplate.copy_type];
    if (!templateFunc) {
      console.warn(`Nessun template per copy_type: "${settingOrTemplate.copy_type}"`);
      return;
    }
    if (settingOrTemplate.printer_name) {
      const pn = String(settingOrTemplate.printer_name).trim();
      const m = pn.match(/^(.+?):(\d{2,5})$/);
      if (m) { host = m[1]; port = parseInt(m[2], 10); }
      else if (/^\d+$/.test(pn)) port = parseInt(pn, 10);
      else if (/^\d{1,3}(\.\d{1,3}){3}$/.test(pn)) host = pn;
    }
  } else return;

  fs.mkdirSync("./tmp", { recursive: true });
  const device = new escposNetwork(host, port);
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