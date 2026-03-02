// server/escposTemplates/receiptTemplates.js
import fs from "fs";
import escpos from "escpos";
import escposNetwork from "escpos-network";
import bwipjs from "bwip-js"; // per generare barcode come immagine

// ===== Helper: stampa logo discreto =====
function printLogo(printer, logoPath) {
  return new Promise((resolve) => {
    if (logoPath && fs.existsSync(logoPath)) {
      escpos.Image.load(logoPath, (image) => {
        try {
          if (!(image instanceof escpos.Image)) throw new Error("File non convertito correttamente in escpos.Image");
          printer.align("CT");
          printer.image(image, "s8");
          printer.newLine();
        } catch (err) {
          console.error("Errore nel caricare il logo ESC/POS:", err.message);
        }
        resolve();
      });
    } else resolve();
  });
}

// ===== Helper: stampa barcode come immagine =====
async function printBarcodeImage(printer, code) {
  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',       // più sicuro e leggibile di code39
      text: code,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
      textyoffset: 5        // distanza del testo dal barcode
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
    console.error("Errore generazione barcode immagine:", err);
    printer.align('CT').text(code); // fallback testo
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

  if (total !== null) {
    printer.align("RT").style("B").text(`Totale: € ${total.toFixed(2)}`).style("NORMAL");
  }

  if (orderBarcode) {
    printer.newLine();
    printer.align("CT").text("CODICE ORDINE:");
    await printBarcodeImage(printer, orderBarcode);
    printer.newLine();
  }

  if (timestamp) {
    printer.text("");
    printer.align("CT").text(`Emesso: ${timestamp}`);
  }

  printer.text("");
  printer.align("CT").style("B").text("Grazie per il tuo acquisto!").style("NORMAL");
  printer.align("CT").text("Powered by:");
  if (logoPath) await printLogo(printer, logoPath);

  printer.cut();
}

// ===== Articoli con wrapping =====
function wrapText(text, width) {
  const lines = [];
  let current = "";
  const words = text.split(" ");
  words.forEach(word => {
    if ((current + word).length > width) {
      lines.push(current.trim());
      current = word + " ";
    } else {
      current += word + " ";
    }
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
      if (index === 0) {
        lineText += `  ${qty}`;
        if (showPrices) lineText += `  ${priceStr}  ${totalStr}`;
      }
      printer.align("LT").text(lineText);
    });

    if (item.note) {
      printer.align("LT").text(`   ↳ Nota: ${item.note}`);
    }
  });

  printer.text("----------------------------------------");
}

// ===== Codifica ordine per barcode con timestamp =====
function encodeOrderId(orderId, timestamp = null) {
  let code = orderId.toString(36).toUpperCase().padStart(6, '0');
  if (timestamp) {
    const date = new Date(timestamp);
    const hh = String(date.getHours()).padStart(2,'0');
    const mm = String(date.getMinutes()).padStart(2,'0');
    const ss = String(date.getSeconds()).padStart(2,'0');
    code += hh + mm + ss; // es. 153045
  }
  return `ORD${code}`;
}

// ===== Customer receipt =====
export async function renderCustomerEscpos(printer, orderData, eventName, logoPath) {
  printer.encode('UTF-8');
  await renderHeader(printer, eventName, "Copia Cliente");
  printer.align("LT").text(`Ordine #${orderData.id}`).text("");
  renderItems(printer, orderData.items, true);

  const timestamp = new Date(orderData.created_at);
  const barcode = encodeOrderId(orderData.id, timestamp);
  await renderFooter(printer, logoPath, barcode, timestamp.toLocaleString(), orderData.total);
}

// ===== Kitchen receipt =====
export async function renderKitchenEscpos(printer, orderData, eventName, logoPath) {
  printer.encode('UTF-8');
  await renderHeader(printer, eventName, "Copia Cucina");
  printer.align("LT").text(`Ordine #${orderData.id}`).text("");
  renderItems(printer, orderData.items, false);

  const timestamp = orderData.created_at ? new Date(orderData.created_at) : new Date();
  const barcode = encodeOrderId(orderData.id, timestamp);
  await renderFooter(printer, logoPath, barcode, timestamp.toLocaleString(), orderData.total);
}

// ===== Bar receipt =====
export async function renderGastronomyEscpos(printer, orderData, eventName, logoPath) {
  printer.encode('UTF-8');
  await renderHeader(printer, eventName, "Copia Gastronomia");
  printer.align("LT").text(`Ordine #${orderData.id}`).text("");
  renderItems(printer, orderData.items, false);

  const timestamp = orderData.created_at ? new Date(orderData.created_at) : new Date();
  const barcode = encodeOrderId(orderData.id, timestamp);
  await renderFooter(printer, logoPath, barcode, timestamp.toLocaleString(), orderData.total);
}

// ===== Helper stampa network =====
export async function printESCPosNetwork(settingOrTemplate, orderData, eventName, logoPath, hostDefault = "127.0.0.1", portDefault = 631) {
  let templateFunc;
  let host = hostDefault;
  let port = portDefault;

  if (typeof settingOrTemplate === "function") templateFunc = settingOrTemplate;
  else if (settingOrTemplate && typeof settingOrTemplate === "object") {
    const setting = settingOrTemplate;
    templateFunc = templatesEscpos[setting.copy_type];
    if (!templateFunc) return;

    if (setting.printer_name) {
      const pn = String(setting.printer_name).trim();
      const m = pn.match(/^(.+?):(\d{2,5})$/);
      if (m) { host = m[1]; port = parseInt(m[2],10); }
      else if (/^\d+$/.test(pn)) port = parseInt(pn,10);
      else if (/^\d{1,3}(\.\d{1,3}){3}$/.test(pn)) host = pn;
    }
  } else return;
 
  const device = new escposNetwork(host, port);
  const printer = new escpos.Printer(device);

  return new Promise((resolve, reject) => {
    device.open(async (err) => {
      if (err) return reject(err);
      try {
        await templateFunc(printer, orderData, eventName, logoPath);
        printer.close(() => resolve());
      } catch(e) { try { printer.close(() => reject(e)); } catch(_) { reject(e); } }
    });
  });
}

// ===== Export map =====
export const templatesEscpos = {
  Cliente: renderCustomerEscpos,
  Cucina: renderKitchenEscpos,
  "Ritiro Gastronomia": renderGastronomyEscpos
};
