import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Check, Printer } from 'lucide-react';

const Cart = ({
  cart, setCart, total, addToCart, removeFromCart, removeLastItem,
  clearCart, sendOrder, sessionActive, reprintLastReceipt, children
}) => {
  const [selectedProductId, setSelectedProductId] = useState(null);
  const cartRef = useRef(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);

  useEffect(() => {
    const received = parseFloat(amountReceived.replace(',', '.')) || 0;
    setChange(received - total);
  }, [amountReceived, total]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cartRef.current && !cartRef.current.contains(e.target)) setSelectedProductId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mergeCartItems = (cartItems) => {
    const merged = [];
    cartItems.forEach(item => {
      if (!item.note) {
        const existing = merged.find(i => i.name === item.name && !i.note);
        if (existing) existing.quantity += item.quantity;
        else merged.push({ ...item });
      } else merged.push({ ...item });
    });
    return merged;
  };

  const handleNoteChange = (productId, note) =>
    setCart(prev => prev.map(item => item.id === productId ? { ...item, note } : item));

  const mergedCart = mergeCartItems(cart);

  return (
    <div ref={cartRef} className="flex flex-col h-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 flex justify-between items-center border-b border-[var(--border)]">
        <div>
          <h2 className="text-base font-black tracking-tighter uppercase text-[var(--text-main)]">Carrello</h2>
          <span className={`text-[9px] font-black uppercase tracking-widest ${sessionActive ? 'text-green-500' : 'text-red-400'}`}>
            {sessionActive ? '● Sessione attiva' : '● Sessione non attiva'}
          </span>
        </div>
        <button
          onClick={() => reprintLastReceipt?.()}
          title="Ristampa ultimo scontrino"
          className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-orange-500 hover:border-orange-500/50 transition-colors"
        >
          <Printer size={16} />
        </button>
      </div>

      {/* Lista articoli */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 no-scrollbar">
        {mergedCart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30">
            <ShoppingCart size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest mt-2">Vuoto</p>
          </div>
        ) : (
          mergedCart.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => setSelectedProductId(prev => prev === item.id ? null : item.id)}
              className={`px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${
                selectedProductId === item.id
                  ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-400/40'
                  : 'bg-[var(--bg-card-2)] border-transparent hover:border-[var(--border)]'
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="bg-orange-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded shrink-0">
                    {item.quantity}
                  </span>
                  <span className="font-bold text-xs uppercase text-[var(--text-main)] leading-tight truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-black text-xs tabular-nums text-[var(--text-main)] shrink-0">
                  {(item.price * item.quantity).toFixed(2)}€
                </span>
              </div>

              {item.note && selectedProductId !== item.id && (
                <div className="ml-7 mt-1 text-[9px] text-yellow-600 dark:text-yellow-400 italic truncate">
                  ↳ {item.note}
                </div>
              )}

              {selectedProductId === item.id && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-1.5">
                  <input
                    type="text"
                    placeholder="Note cucina..."
                    value={item.note || ''}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    className="w-full bg-[var(--bg-input)] px-2.5 py-1.5 rounded-lg text-[11px] font-medium outline-none ring-1 ring-[var(--border)] focus:ring-orange-500 text-[var(--text-main)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="flex-1 py-1.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] flex justify-center text-[var(--text-main)] hover:border-orange-500 transition-colors"><Plus size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeLastItem(item); }} className="flex-1 py-1.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] flex justify-center text-[var(--text-main)] hover:border-orange-500 transition-colors"><Minus size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeFromCart(item); }} className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg flex justify-center transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[var(--border)] space-y-3 bg-[var(--bg-card-2)]">
        {/* Ricevuti / Resto */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--bg-card)] px-3 py-2 rounded-xl border border-[var(--border)]">
            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Ricevuti</span>
            <input
              type="text"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent outline-none font-black text-sm text-[var(--text-main)] tabular-nums mt-0.5"
            />
          </div>
          <div className="bg-[var(--bg-card)] px-3 py-2 rounded-xl border border-[var(--border)]">
            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Resto</span>
            <span className={`text-sm font-black tabular-nums block mt-0.5 ${change < 0 ? 'text-red-500' : 'text-green-500'}`}>
              {change >= 0 ? change.toFixed(2) : '0.00'} €
            </span>
          </div>
        </div>

        {/* Totale */}
        <div className="flex justify-between items-center py-2 border-y border-dashed border-[var(--border)]">
          <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Totale</span>
          <span className="text-2xl font-black tracking-tighter text-orange-500 tabular-nums">{total.toFixed(2)} €</span>
        </div>

        {/* Bottoni */}
        <button
          onClick={() => sessionActive && sendOrder()}
          disabled={cart.length === 0 || !sessionActive}
          className="w-full h-11 bg-orange-500 hover:bg-orange-600 disabled:bg-[var(--bg-input)] disabled:text-[var(--text-muted)] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <Check size={15} /> Invia Ordine
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="h-9 border border-red-300 dark:border-red-900/40 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30"
          >
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
  );
};

export default Cart;
