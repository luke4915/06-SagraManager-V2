import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Check, Printer } from 'lucide-react';

const Cart = ({
  cart,
  setCart,
  total,
  addToCart,
  removeFromCart,
  removeLastItem,
  clearCart,
  sendOrder,
  sessionActive,
  reprintLastReceipt,
  children
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
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) setSelectedProductId(null);
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

  const handleNoteChange = (productId, note) => {
    setCart(prev => prev.map(item => item.id === productId ? { ...item, note } : item));
  };

  const mergedCart = mergeCartItems(cart);

  return (
    // RIPRISTINATO IL CONTENITORE VISIBILE: Sfondo card, angoli raccordati a 2xl e bordo coerente
    <div ref={cartRef} className="flex flex-col h-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl p-4">

      {/* Header pulito senza bande colorate staccate */}
      <div className="pb-4 flex justify-between items-center border-b border-[var(--border)] bg-transparent">
        <div>
          <h2 className="text-lg font-black tracking-tighter uppercase text-[var(--text-main)]">Carrello</h2>
          <span className={`text-[9px] font-black uppercase tracking-widest block ${sessionActive ? 'text-green-500' : 'text-red-500'}`}>
            {sessionActive ? '● Sessione ON' : '● Sessione OFF'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => reprintLastReceipt && reprintLastReceipt()}
            title="Ristampa Ultimo Scontrino"
            className="p-2 bg-[var(--bg-card-2)] border border-[var(--border)] rounded-xl text-[var(--text-main)] hover:text-orange-500 hover:border-orange-500/50 transition-colors active:scale-95 flex items-center justify-center"
          >
            <Printer size={16} />
          </button>
          <ShoppingCart size={18} className="text-gray-400" />
        </div>
      </div>

      {/* Lista Articoli con sfondo alternato interno per i singoli elementi */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1.5 no-scrollbar">
        {mergedCart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400/20">
            <ShoppingCart size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest mt-2">Vuoto</p>
          </div>
        ) : (
          mergedCart.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => setSelectedProductId(item.id)}
              className={`p-2.5 rounded-xl transition-all cursor-pointer border ${selectedProductId === item.id
                ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-500/40'
                : 'bg-[var(--bg-card-2)] border-transparent hover:border-[var(--border)]'
                }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="bg-orange-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-md shadow-sm shrink-0 mt-0.5">
                    {item.quantity}
                  </span>
                  <h4 className="font-bold text-sm uppercase text-[var(--text-main)] whitespace-normal break-words leading-tight flex-1">
                    {item.name}
                  </h4>
                </div>
                <span className="font-black text-sm tabular-nums text-[var(--text-main)] shrink-0 mt-0.5">
                  {(item.price * item.quantity).toFixed(2)}€
                </span>
              </div>

              {item.note && selectedProductId !== item.id && (
                <div className="ml-8 mt-1 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/5 border-l-2 border-yellow-400 text-[9px] text-yellow-700 dark:text-yellow-300 italic rounded-r">
                  {item.note}
                </div>
              )}

              {selectedProductId === item.id && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-1.5 animate-in fade-in zoom-in-95">
                  <input
                    type="text"
                    placeholder="Note cucina..."
                    value={item.note || ''}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    className="w-full bg-[var(--bg-input)] px-2.5 py-1.5 rounded-lg text-[11px] font-bold outline-none ring-1 ring-[var(--border)] focus:ring-orange-500 text-[var(--text-main)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="flex-1 py-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] flex justify-center text-[var(--text-main)] hover:border-orange-500"><Plus size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeLastItem(item); }} className="flex-1 py-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] flex justify-center text-[var(--text-main)] hover:border-orange-500"><Minus size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeFromCart(item); }} className="flex-1 py-1 bg-red-500 text-white rounded-lg flex justify-center hover:bg-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer del Carrello */}
      <div className="pt-3 border-t border-[var(--border)] space-y-2.5 bg-transparent">
        <div className="flex gap-2">
          <div className="flex-1 bg-[var(--bg-card-2)] px-2.5 py-1 rounded-xl border border-[var(--border)]">
            <span className="text-[12px] font-black text-gray-400 uppercase block tracking-wider">Ricevuti</span>
            <input
              type="text"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent border-none outline-none font-black text-base text-[var(--text-main)] tabular-nums mt-0.5"
            />
          </div>
          <div className="flex-1 bg-[var(--bg-card-2)] px-2.5 py-1 rounded-xl border border-[var(--border)] flex flex-col justify-center">
            <span className="text-[12px] font-black text-gray-400 uppercase block tracking-wider">Resto</span>
            <span className={`text-base font-black tabular-nums mt-0.5 ${change < 0 ? 'text-red-500' : 'text-green-500'}`}>
              {change >= 0 ? change.toFixed(2) : '0.00'} €
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center px-1 py-1 border-y border-dashed border-[var(--border)]">
          <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">TOTALE</span>
          <span className="text-3xl font-black tracking-tighter text-orange-500 tabular-nums">{total.toFixed(2)} €</span>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => sessionActive && sendOrder()}
            disabled={cart.length === 0 || !sessionActive}
            className="w-full h-11 bg-orange-500/85 disabled:bg-[var(--bg-input)] disabled:text-[var(--text-muted)] text-white rounded-xl font-black text-xs shadow-md shadow-orange-500/10 hover:bg-orange-600 disabled:shadow-none active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <Check size={16} /> Invia Ordine
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="h-11 bg-red-500/85 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:hover:bg-red-500/85 flex items-center justify-center gap-1.5 shadow-md shadow-red-500/5 active:scale-[0.99]"
            >
              <Trash2 size={13} /> Svuota Carrello
            </button>

            {children && (
              <div className="flex [&>*]:w-full [&>*]:h-11 [&>*]:rounded-xl [&>*]:font-black [&>*]:text-[10px] [&>*]:uppercase [&>*]:tracking-widest [&>*]:transition-all [&>*]:flex [&>*]:items-center [&>*]:justify-center [&>*]:gap-1.5 [&>*]:shadow-md
                [&>*]:bg-blue-600/85 [&>*]:text-white [&>*]:border-transparent hover:[&>*]:bg-blue-700 active:[&>*]:scale-[0.99] disabled:[&>*]:opacity-30">
                {children}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Cart;