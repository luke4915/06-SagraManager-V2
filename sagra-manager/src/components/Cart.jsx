import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Check, Banknote } from 'lucide-react';

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
    <div ref={cartRef} className="flex flex-col h-full bg-white dark:bg-[#16181d] rounded-5xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
      {/* Header compatto */}
      <div className="p-6 pb-2 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black tracking-tighter uppercase">Carrello</h2>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${sessionActive ? 'text-green-500' : 'text-red-500'}`}>
            {sessionActive ? '● Sessione ON' : '● Sessione OFF'}
          </span>
        </div>
        <ShoppingCart size={20} className="text-gray-300" />
      </div>

      {/* Lista Articoli - Ora ha più spazio */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 no-scrollbar">
        {mergedCart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <ShoppingCart size={48} />
            <p className="text-[10px] font-black uppercase mt-2">Vuoto</p>
          </div>
        ) : (
          mergedCart.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => setSelectedProductId(item.id)}
              className={`p-3 rounded-3xl transition-all cursor-pointer border ${selectedProductId === item.id
                  ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-500/30'
                  : 'bg-gray-50 dark:bg-gray-800/40 border-transparent'
                }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg">
                    {item.quantity}
                  </span>
                  <h4 className="font-bold text-xs uppercase truncate w-32">{item.name}</h4>
                </div>
                <span className="font-black text-xs">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>

              {selectedProductId === item.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2 animate-in fade-in zoom-in-95">
                  <input
                    type="text"
                    placeholder="Note..."
                    value={item.note || ''}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 px-3 py-2 rounded-xl text-[10px] font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-orange-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="flex-1 py-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-center"><Plus size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeLastItem(item); }} className="flex-1 py-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-center"><Minus size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeFromCart(item); }} className="flex-1 py-1.5 bg-red-500 text-white rounded-lg flex justify-center shadow-lg shadow-red-500/20"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Ottimizzato */}
      <div className="p-6 bg-gray-50 dark:bg-[#111317] border-t border-gray-100 dark:border-gray-800 space-y-4">

        {/* Resto Compatto */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700">
            <span className="text-[8px] font-black text-gray-400 uppercase block ml-1">Ricevuti</span>
            <input
              type="text"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent border-none outline-none font-black text-sm px-1"
            />
          </div>
          <div className="flex-1 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700">
            <span className="text-[8px] font-black text-gray-400 uppercase block ml-1">Resto</span>
            <span className={`text-sm font-black block ml-1 ${change < 0 ? 'text-red-500' : 'text-green-500'}`}>
              {change >= 0 ? change.toFixed(2) : '0.00'} €
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Totale</span>
          <span className="text-3xl font-black tracking-tighter">{total.toFixed(2)} €</span>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => sessionActive && sendOrder()}
            disabled={cart.length === 0 || !sessionActive}
            className="w-full h-14 bg-orange-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-500/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <Check size={20} /> Invia Ordine
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* FIX: Pulsante Svuota con Hover reale */}
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="py-2.5 bg-transparent hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-500"
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