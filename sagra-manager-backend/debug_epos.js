// debug-epos.js
// Lancialo con: node debug-epos.js
// Prova in sequenza pezzi di XML via ePOS-Print, dal più semplice (che sai funzionare)
// al più complesso, fermandosi al primo che fallisce così isoliamo l'attributo incriminato.

import https from "https";

const HOST = "192.168.1.100";
const agent = new https.Agent({ rejectUnauthorized: false });

function send(label, innerXml) {
    const xml =
        `<?xml version="1.0" encoding="utf-8"?>` +
        `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>` +
        `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">${innerXml}</epos-print>` +
        `</s:Body></s:Envelope>`;

    return new Promise((resolve) => {
        const req = https.request(
            {
                hostname: HOST,
                path: `/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`,
                method: "POST",
                agent,
                timeout: 15000,
                headers: {
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": '""',
                    "If-Modified-Since": "Thu, 01 Jan 1970 00:00:00 GMT",
                    "Content-Length": Buffer.byteLength(xml),
                },
            },
            (res) => {
                let data = "";
                res.on("data", (c) => (data += c));
                res.on("end", () => {
                    const ok = data.includes('success="true"');
                    console.log(`[${ok ? "OK " : "FAIL"}] ${label}`);
                    if (!ok) console.log("    ->", data);
                    resolve(ok);
                });
            }
        );
        req.on("error", (e) => { console.log(`[ERR ] ${label} ->`, e.message); resolve(false); });
        req.on("timeout", () => { req.destroy(); console.log(`[TIMEOUT] ${label}`); resolve(false); });
        req.write(xml);
        req.end();
    });
}

async function main() {
    // 1. Baseline identica al curl che sai funzionare
    if (!await send("1. baseline (lang+cut)", `<text lang="en">BASELINE&#10;&#10;</text><cut type="feed"/>`)) return;

    // 2. Aggiungo align
    if (!await send("2. + align", `<text lang="en" align="center">ALIGN&#10;&#10;</text><cut type="feed"/>`)) return;

    // 3. Aggiungo em (grassetto)
    if (!await send("3. + em", `<text lang="en" align="center" em="true">EM&#10;&#10;</text><cut type="feed"/>`)) return;

    // 4. Aggiungo ul (sottolineato)
    if (!await send("4. + ul", `<text lang="en" align="center" em="true" ul="true">UL&#10;&#10;</text><cut type="feed"/>`)) return;

    // 5. Aggiungo width/height (dimensione doppia)
    if (!await send("5. + width/height", `<text lang="en" align="center" width="2" height="2">SIZE&#10;&#10;</text><cut type="feed"/>`)) return;

    // 6. feed con line
    if (!await send("6. feed line", `<text lang="en">FEED TEST&#10;</text><feed line="3"/><cut type="feed"/>`)) return;

    // 7. Sequenza multipla di text (come nei template reali)
    if (!await send("7. multi text", `<text lang="en" align="left">RIGA 1&#10;</text><text lang="en" align="left">RIGA 2&#10;</text><cut type="feed"/>`)) return;

    // 8. Caratteri accentati italiani
    if (!await send("8. accenti italiani", `<text lang="en">PERCHÉ ÈÒ ARTICOLO&#10;</text><cut type="feed"/>`)) return;

    console.log("Tutti i test passati: il problema è nell'<image> (logo/barcode).");
}

main();