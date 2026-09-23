// ─── Utility pure per la gestione del carrello ─────────────────────
// Estratte da Cart.jsx: nessuna dipendenza da React, facilmente testabili.

/** Chiave univoca di una riga carrello: stesso prodotto con note diverse = righe distinte. */
export const cartKey = (item) => `${item.id}__${item.note || ''}`;

/**
 * Unisce righe duplicate dello stesso prodotto SENZA note in un'unica riga
 * (sommando le quantità), utile solo per la visualizzazione — il carrello
 * "vero" (state) resta invariato, mergeCartItems si usa solo per il render.
 */
export function mergeCartItems(cartItems) {
    const merged = [];
    cartItems.forEach(item => {
        if (!item.note) {
            const existing = merged.find(i => i.name === item.name && !i.note);
            if (existing) { existing.quantity += item.quantity; return; }
        }
        merged.push({ ...item });
    });
    return merged;
}