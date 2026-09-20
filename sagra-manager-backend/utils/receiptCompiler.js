// Utility per sostituire i placeholder es. {{order.id}} con i dati dell'ordine
function interpolate(templateStr = '', data = {}) {
    return templateStr.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
        const val = path.split('.').reduce((acc, curr) => acc?.[curr], data);
        return val !== undefined ? val : '';
    });
}

// Escape per XML sicuro
function escapeXml(str = '') {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * 1. DRIVER EPSON ePOS-XML (Stampa diretta HTTP POST su IP stampante)
 */
export function compileToEposXml(blocks, orderData, paperWidth = 42) {
    const elements = [];

    for (const block of blocks) {
        switch (block.type) {
            case 'text': {
                const textContent = interpolate(block.content, orderData);
                const w = block.size?.w || 1;
                const h = block.size?.h || 1;
                const align = block.align || 'left';
                const em = block.bold ? 'true' : 'false';
                const reverse = block.reverse ? 'true' : 'false';

                elements.push(
                    `<text align="${align}" width="${w}" height="${h}" em="${em}" reverse="${reverse}">${escapeXml(textContent)}&#10;</text>`
                );
                break;
            }

            case 'divider': {
                const char = block.style === 'double' ? '=' : '-';
                const line = char.repeat(paperWidth);
                elements.push(`<text align="center">${line}&#10;</text>`);
                break;
            }

            case 'items_list': {
                const items = orderData.order?.items || [];
                items.forEach((item) => {
                    const qty = `${item.quantity}x`.padEnd(4, ' ');
                    const name = item.name.toUpperCase();
                    const price = block.showPrices ? `€${parseFloat(item.price).toFixed(2)}` : '';

                    if (block.bigFont) {
                        elements.push(`<text align="left" width="2" height="2" em="true">${qty}${name}&#10;</text>`);
                    } else {
                        const line = price
                            ? `${qty}${name.padEnd(paperWidth - qty.length - price.length, ' ')}${price}`
                            : `${qty}${name}`;
                        elements.push(`<text align="left">${escapeXml(line)}&#10;</text>`);
                    }
                });
                break;
            }

            case 'banner': {
                const text = block.content.toUpperCase();
                elements.push(`<text align="center" width="2" height="2" reverse="true"> ${escapeXml(text)} &#10;</text>`);
                break;
            }

            case 'qrcode': {
                const content = interpolate(block.content, orderData);
                elements.push(`<symbol type="qrcode" error="level_m" width="${block.width || 3}">${escapeXml(content)}</symbol>`);
                elements.push(`<feed line="1"/>`);
                break;
            }

            case 'feed': {
                elements.push(`<feed line="${block.lines || 1}"/>`);
                break;
            }

            case 'cut': {
                elements.push(`<cut type="${block.mode || 'feed'}"/>`);
                break;
            }
        }
    }

    return (
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
        `<s:Body>` +
        `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
        elements.join('') +
        `</epos-print>` +
        `</s:Body>` +
        `</s:Envelope>`
    );
}

/**
 * 2. DRIVER ESC/POS GENERICO (Byte array per stampanti USB/LAN Bixolon, Custom, Xprinter, etc.)
 * Ritorna un array di buffer binari sequenziali
 */
export function compileToEscPosCommands(blocks, orderData, paperWidth = 42) {
    // ESC/POS Bytes Constants
    const ESC = 0x1b;
    const GS = 0x1d;

    const commands = [
        Buffer.from([ESC, 0x40]) // Reset stampante (HW Init)
    ];

    for (const block of blocks) {
        switch (block.type) {
            case 'text': {
                const textContent = interpolate(block.content, orderData) + '\n';

                // Allineamento: ESC a (0=Left, 1=Center, 2=Right)
                const alignVal = block.align === 'center' ? 1 : block.align === 'right' ? 2 : 0;
                commands.push(Buffer.from([ESC, 0x61, alignVal]));

                // Grassetto: ESC E (1=ON, 0=OFF)
                commands.push(Buffer.from([ESC, 0x45, block.bold ? 1 : 0]));

                // Inversione colore: GS B (1=ON, 0=OFF)
                commands.push(Buffer.from([GS, 0x42, block.reverse ? 1 : 0]));

                // Dimensione Font: GS ! (width/height multipliers)
                const w = Math.min(Math.max((block.size?.w || 1) - 1, 0), 7);
                const h = Math.min(Math.max((block.size?.h || 1) - 1, 0), 7);
                const sizeByte = (w << 4) | h;
                commands.push(Buffer.from([GS, 0x21, sizeByte]));

                commands.push(Buffer.from(textContent, 'latin1'));
                break;
            }

            case 'divider': {
                const char = block.style === 'double' ? '=' : '-';
                const line = char.repeat(paperWidth) + '\n';
                commands.push(Buffer.from([ESC, 0x61, 1])); // Center
                commands.push(Buffer.from([GS, 0x21, 0x00])); // Font 1x1
                commands.push(Buffer.from(line, 'latin1'));
                break;
            }

            case 'cut': {
                commands.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // Cut paper (Partial Cut)
                break;
            }
        }
    }

    return Buffer.concat(commands);
}