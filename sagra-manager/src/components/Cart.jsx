import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Check, Printer, X, MessageSquare } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const ReprintSelectionModal = ({ onClose }) => {
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reprintingId, setReprintingId] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/orders?session=active`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setRecentOrders(data.slice(0, 10)))
      .catch(() => setError('Impossibile recuperare gli ordini'))
      .finally(() => setLoading(false));
  }, []);

  const handleReprint = async (orderId) => {
    setReprintingId(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/reprint`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error();
      onClose();
    } catch { alert('Errore durante la ristampa'); }
    finally { setReprintingId(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Ristampa Periferica</p>
            <h3 className="font-black text-sm uppercase tracking-tight text-[var(--text-main)]">Seleziona scontrino</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {loading && <p className="text-xs text-center py-4 text-[var(--text-muted)]">Caricamento...</p>}
          {error && <p className="text-xs text-center py-4 text-red-500">{error}</p>}
          {!loading && !error && recentOrders.length === 0 && <p className="text-xs text-center py-4 text-[var(--text-muted)]">Nessun ordine trovato.</p>}
          {!loading && !error && recentOrders.map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)]">
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-[var(--text-main)]">#{order.id}</span>
                  <span className="text-[10px] tabular-nums text-[var(--text-muted)]">{new Date(order.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || '—'}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-black text-xs text-[var(--accent)] tabular-nums">{Number(order.total).toFixed(2)} €</span>
                <button disabled={reprintingId !== null} onClick={() => handleReprint(order.id)}
                  className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white transition-colors">
                  <Printer size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CartItemModal = ({ item, onClose, onAdd, onRemove, onDelete, onNoteChange }) => {
  const [note, setNote] = useState(item.note || '');
  const handleClose = () => { if (note !== (item.note || '')) onNoteChange(item, note); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Articolo selezionato</p>
            <h3 className="font-black text-base uppercase tracking-tight text-[var(--text-main)] leading-tight">{item.name}</h3>
            <p className="text-[var(--accent)] font-black text-sm tabular-nums mt-0.5">{(item.price * item.quantity).toFixed(2)} €</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"><X size={15} /></button>
        </div>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Quantità</p>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => onRemove(item)} className="flex-1 py-3 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] flex justify-center text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95"><Minus size={16} /></button>
            <span className="text-3xl font-black tabular-nums text-[var(--text-main)] w-12 text-center">{item.quantity}</span>
            <button onClick={() => onAdd(item)} className="flex-1 py-3 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] flex justify-center text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95"><Plus size={16} /></button>
          </div>
        </div>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={11} className="text-[var(--text-muted)]" />
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Note cucina</p>
          </div>
          <textarea rows={2} placeholder="Es: senza cipolla, ben cotto..."
            value={note} onChange={e => setNote(e.target.value.toUpperCase())}
            className="w-full bg-[var(--bg-input)] px-3 py-2.5 rounded-xl text-sm font-medium outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] text-[var(--text-main)] resize-none placeholder:text-[var(--text-muted)] placeholder:font-normal transition-[ring]" />
        </div>
        <div className="px-5 py-4">
          <button onClick={() => { onDelete(item); onClose(); }}
            className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <Trash2 size={13} /> Rimuovi dal carrello
          </button>
        </div>
      </div>
    </div>
  );
};

const ClearCartModal = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
      <p className="font-black text-[var(--text-main)] mb-1">Svuotare il carrello?</p>
      <p className="text-xs text-[var(--text-muted)] mb-6">Tutti gli articoli verranno rimossi.</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[var(--text-main)] font-black text-xs uppercase tracking-widest hover:bg-[var(--bg-card-2)] transition-all">Annulla</button>
        <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all">Svuota</button>
      </div>
    </div>
  </div>
);

const Cart = ({ cart, setCart, total, addToCart, removeFromCart, removeLastItem, clearCart, sendOrder, sessionActive, children }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  useEffect(() => {
    const received = parseFloat(amountReceived.replace(',', '.')) || 0;
    setChange(received - total);
  }, [amountReceived, total]);

  const cartKey = (item) => `${item.id}__${item.note || ''}`;

  const mergeCartItems = (cartItems) => {
    const merged = [];
    cartItems.forEach(item => {
      if (!item.note) {
        const existing = merged.find(i => i.name === item.name && !i.note);
        if (existing) { existing.quantity += item.quantity; return; }
      }
      merged.push({ ...item });
    });
    return merged;
  };

  const handleNoteChange = (item, note) => {
    const oldKey = cartKey(item);
    setCart(prev => prev.map(i => cartKey(i) === oldKey ? { ...i, note } : i));
  };

  const handleSendOrder = async () => {
    if (!sessionActive) return;
    await sendOrder();
    setAmountReceived('');
  };

  const mergedCart = mergeCartItems(cart);
  const currentSelected = selectedItem ? mergedCart.find(i => i.id === selectedItem.id && (i.note || '') === (selectedItem.note || '')) : null;

  return (
    <>
      <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3 flex justify-between items-center border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-black tracking-tighter uppercase text-[var(--text-main)]">Carrello</h2>
            <span className={`text-[9px] font-black uppercase tracking-widest ${sessionActive ? 'text-green-500' : 'text-red-400'}`}>
              {sessionActive ? '● Sessione attiva' : '● Sessione non attiva'}
            </span>
          </div>
          <button onClick={() => setIsReprintModalOpen(true)} title="Ristampa scontrini recenti"
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all">
            <Printer size={16} />
          </button>
        </div>

        {/* Lista articoli */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 no-scrollbar">
          {mergedCart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30">
              <ShoppingCart size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest mt-2">Vuoto</p>
            </div>
          ) : mergedCart.map(item => (
            <div key={cartKey(item)} onClick={() => setSelectedItem(item)}
              className="px-3 py-2 rounded-xl cursor-pointer border border-gray-300 dark:border-[var(--border)] bg-[var(--bg-card-2)] hover:border-[var(--accent)]/60 active:scale-[0.99] transition-all">
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="bg-[var(--accent)] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded shrink-0">{item.quantity}</span>
                  <span className="font-bold text-xs uppercase text-[var(--text-main)] leading-tight truncate">{item.name}</span>
                </div>
                <span className="font-black text-xs tabular-nums text-[var(--text-main)] shrink-0">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
              {item.note && (
                <div className="ml-7 mt-1.5 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1">
                  <MessageSquare size={9} className="text-yellow-500 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wide text-yellow-500 truncate">{item.note}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] space-y-2 bg-[var(--bg-card-2)]">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Ricevuti</span>
              <input type="text" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} placeholder="0.00"
                className="w-full bg-transparent outline-none font-black text-base text-[var(--text-main)] tabular-nums text-right" />
            </div>
            <div className="bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Resto</span>
              <span className={`text-base font-black tabular-nums block text-right ${change < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {change >= 0 ? change.toFixed(2) : '0.00'} €
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Totale</span>
            <span className="text-2xl font-black tracking-tighter text-[var(--text-main)] tabular-nums">{total.toFixed(2)} €</span>
          </div>

          <button onClick={handleSendOrder} disabled={cart.length === 0 || !sessionActive}
            className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-input)] disabled:text-[var(--text-muted)] text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-[0.99] transition-all flex items-center justify-center gap-2">
            <Check size={15} /> Invia Ordine
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => cart.length > 0 && setIsClearModalOpen(true)} disabled={cart.length === 0}
              className="h-9 border border-red-300 dark:border-red-900/40 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30">
              Svuota
            </button>
            {children && (
              <div className="[&>*]:w-full [&>*]:h-9 [&>*]:rounded-xl [&>*]:font-black [&>*]:text-[10px] [&>*]:uppercase [&>*]:tracking-widest [&>*]:transition-all [&>*]:flex [&>*]:items-center [&>*]:justify-center [&>*]:gap-1">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>

      {currentSelected && <CartItemModal item={currentSelected} onClose={() => setSelectedItem(null)} onAdd={addToCart} onRemove={removeLastItem} onDelete={removeFromCart} onNoteChange={handleNoteChange} />}
      {isReprintModalOpen && <ReprintSelectionModal onClose={() => setIsReprintModalOpen(false)} />}
      {isClearModalOpen && <ClearCartModal onConfirm={clearCart} onClose={() => setIsClearModalOpen(false)} />}
    </>
  );
};

export default Cart;
