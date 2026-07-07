import https from "https";

function escapeXml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

function mapAlign(pos) {
    if (!pos) return "left";
    const p = String(pos).toUpperCase().trim();
    if (p === "CT" || p === "CENTER") return "center";
    if (p === "RT" || p === "RIGHT") return "right";
    return "left";
}

export class EposXmlPrinter {
    constructor() {
        this.elements = [];
        this._align = "left";
        this._bold = false;
        this._underline = false;
        this._reverse = false;
        this._font = "font_a";
        this._w = 1;
        this._h = 1;
    }

    encode() { return this; }

    align(pos) {
        this._align = mapAlign(pos);
        return this;
    }

    style(s) {
        if (s === "B") { this._bold = true; }
        else if (s === "U") { this._underline = true; }
        else if (s === "BU") { this._bold = true; this._underline = true; }
        else { this._bold = false; this._underline = false; }
        return this;
    }

    // Banda nera/testo bianco: rv="true" sull'attributo <text>
    reverse(on = true) {
        this._reverse = !!on;
        return this;
    }

    // font_a (default, leggibile) o font_b (condensato)
    font(name = "font_a") {
        this._font = name;
        return this;
    }

    size(w, h) {
        this._w = Math.max(1, Math.min(8, w));
        this._h = Math.max(1, Math.min(8, h));
        return this;
    }

    text(str) {
        const attrs = [
            `align="${this._align}"`,
            `width="${this._w}"`,
            `height="${this._h}"`,
            `em="${this._bold}"`,
            `ul="${this._underline}"`,
            `reverse="${this._reverse}"`,
            `font="${this._font}"`,
        ];
        this.elements.push(`<text ${attrs.join(" ")}>${escapeXml(str)}&#10;</text>`);
        return this;
    }

    async _encodeMonoRaster(pngBuffer, targetWidth) {
        const sharp = (await import("sharp")).default;
        const { data, info } = await sharp(pngBuffer)
            .resize({ width: targetWidth, withoutEnlargement: false })
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { width, height } = info;
        const bytesPerRow = Math.ceil(width / 8);
        const mono = Buffer.alloc(bytesPerRow * height, 0);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[y * width + x] < 128) {
                    mono[y * bytesPerRow + Math.floor(x / 8)] |= (0x80 >> (x % 8));
                }
            }
        }

        return {
            width,
            height,
            b64: mono.toString("base64").replace(/[\r\n\s]/g, ""),
        };
    }

    async _printRaster(pngBuffer, align, targetWidth) {
        if (!pngBuffer) return this;
        const targetAlign = mapAlign(align || this._align);
        const { width, height, b64 } = await this._encodeMonoRaster(pngBuffer, targetWidth);
        this.elements.push(`<text align="${targetAlign}"/>`);
        this.elements.push(`<image width="${width}" height="${height}">${b64}</image>`);
        return this;
    }

    async imagePngRaster(pngBuffer, align = null) {
        return this._printRaster(pngBuffer, align, 384);
    }

    async imagePngRasterCustom(pngBuffer, align = null, customWidth = 512) {
        return this._printRaster(pngBuffer, align, customWidth);
    }

    async imagePng(pngBuffer, align = null) {
        return this._printRaster(pngBuffer, align, 240);
    }

    // Alias richiesto da receiptTemplates.js: image(buffer, { align, width })
    async image(pngBuffer, { align = null, width = 384 } = {}) {
        return this._printRaster(pngBuffer, align, width);
    }

    feed(n = 1) {
        this.elements.push(`<feed line="${n}"/>`);
        return this;
    }

    cut() {
        this.elements.push(`<cut type="feed"/>`);
        return this;
    }

    qrcode(data, { model = "model2", level = "level_l", width = 3 } = {}) {
        const attrs = [
            `type="qrcode"`,
            `model="${model}"`,
            `level="${level}"`,
            `width="${Math.max(1, Math.min(8, width))}"`
        ];
        this.elements.push(`<barcode ${attrs.join(" ")}>${escapeXml(data)}</barcode>`);
        return this;
    }

    close() { return this; }

    buildXml() {
        const body = this.elements.join("");
        return (
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
            `<s:Body>` +
            `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">${body}</epos-print>` +
            `</s:Body>` +
            `</s:Envelope>`
        );
    }

    send(host, { devid = "local_printer", timeout = 10000, port = 443 } = {}) {
        const xml = this.buildXml();
        const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

        return new Promise((resolve, reject) => {
            const req = https.request(
                {
                    hostname: host,
                    port,
                    path: `/cgi-bin/epos/service.cgi?devid=${devid}&timeout=${timeout}`,
                    method: "POST",
                    agent,
                    timeout: timeout + 5000,
                    headers: {
                        "Content-Type": "text/xml; charset=utf-8",
                        "If-Modified-Since": "Thu, 01 Jan 1970 00:00:00 GMT",
                        "Content-Length": Buffer.byteLength(xml),
                    },
                },
                (res) => {
                    let data = "";
                    res.on("data", (c) => (data += c));
                    res.on("end", () => {
                        const successMatch = data.match(/success="(true|false)"/);
                        const codeMatch = data.match(/code="([^"]*)"/);

                        if (successMatch && successMatch[1] === "true") {
                            resolve(data);
                        } else {
                            const code = codeMatch ? codeMatch[1] : "unknown";
                            reject(new Error(`Stampa ePOS fallita [${res.statusCode}] code="${code}": ${data}`));
                        }
                    });
                }
            );
            req.on("error", reject);
            req.on("timeout", () => req.destroy(new Error("Timeout stampante")));
            req.write(xml);
            req.end();
        });
    }
}