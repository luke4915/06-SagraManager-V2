import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Check, FileText, Printer } from 'lucide-react';

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
    <div ref={cartRef} className="flex flex-col h-full bg-white dark:bg-[#1c1f26] rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">

      {/* Header compatto ed elegante */}
      <div className="p-5 pb-2 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-xl font-black tracking-tighter text-gray-950 dark:text-gray-50 uppercase">Carrello</h2>
          <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5 ${sessionActive ? 'text-emerald-500' : 'text-red-500'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Sessione {sessionActive ? 'ON' : 'OFF'}
          </span>
        </div>
        <ShoppingCart size={20} className="text-gray-300 dark:text-gray-600" />
      </div>

      {/* Lista Articoli - Spazio massimizzato */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 no-scrollbar">
        {mergedCart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-40 py-12">
            <ShoppingCart size={32} strokeWidth={1.5} />
            <p className="text-[10px] font-black uppercase mt-2 tracking-widest">Vuoto</p>
          </div>
        ) : (
          mergedCart.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => setSelectedProductId(item.id)}
              className={`p-3 rounded-xl transition-all cursor-pointer border ${selectedProductId === item.id
                  ? 'bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-500/30 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800/40 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="bg-gray-950 dark:bg-gray-800 text-white dark:text-gray-200 text-xs font-black h-6 w-8 flex items-center justify-center rounded-md flex-shrink-0">
                    {item.quantity}x
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs uppercase text-gray-900 dark:text-gray-100 truncate pr-2">{item.name}</h4>
                    {item.note && selectedProductId !== item.id && (
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight truncate mt-0.5 flex items-center gap-1">
                        <FileText size={10} /> {item.note}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-black text-xs text-gray-950 dark:text-gray-50 flex-shrink-0 ml-2">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>

              {/* Barra Controlli Smart e Compatta */}
              {selectedProductId === item.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/60 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">

                  {/* Input Note Ingrandito ma compatto */}
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      placeholder="NOTE (ES. NO CIPOLLA)..."
                      value={item.note || ''}
                      onChange={(e) => handleNoteChange(item.id, e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 pl-3 pr-3 py-2 rounded-lg text-xs font-black uppercase text-gray-900 dark:text-gray-100 outline-none border border-gray-200 dark:border-gray-800 focus:border-indigo-500 transition-colors placeholder:normal-case placeholder:font-medium"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Micro-pulsantiera allineata e pulita */}
                  <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-0.5 shadow-sm flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeLastItem(item); }}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-0.5" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromCart(item); }}
                      className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Ottimizzato e compatto */}
      <div className="p-4 bg-gray-50 dark:bg-[#16181d] border-t border-gray-100 dark:border-gray-800 space-y-3 flex-shrink-0">

        {/* Sezione Resto compatta */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white dark:bg-[#1c1f26] p-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between px-3">
            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ricevuti</span>
            <input
              type="text"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              className="w-20 bg-transparent border-none outline-none font-black text-sm text-right text-gray-900 dark:text-gray-50"
            />
          </div>
          <div className="flex-1 bg-white dark:bg-[#1c1f26] p-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between px-3">
            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Resto</span>
            <span className={`text-sm font-black ${change < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {change >= 0 ? change.toFixed(2) : '0.00'} €
            </span>
          </div>
        </div>

        {/* Visualizzazione Totale */}
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Totale Comanda</span>
          <span className="text-2xl font-black tracking-tighter text-gray-950 dark:text-gray-50">{total.toFixed(2)} €</span>
        </div>

        {/* Pulsanti di Azione */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => sessionActive && sendOrder()}
            disabled={cart.length === 0 || !sessionActive}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-emerald-600/10 transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={3} /> Invia Ordine
          </button>

          {/* Griglia pulsanti ausiliari (Svuota, Ristampa e Children aggiuntivi) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="py-2 bg-transparent hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded-lg font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-500 flex items-center justify-center"
            >
              Svuota
            </button>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;