// Cart.jsx
import { Trash2, Plus, Minus, ShoppingCart, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const Cart = ({
  cart,
  setCart,
  total,
  addToCart,
  removeFromCart,
  removeLastItem,
  clearCart,
  sendOrder,
  showRemoveButtons = true,
  sessionActive,
  children
}) => {
  const [selectedProductId, setSelectedProductId] = useState(null);
  const cartRef = useRef(null);
  const [notes, setNotes] = useState({});
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);

  // Calcolo resto automatico
  useEffect(() => {
    const received = parseFloat(amountReceived.replace(',', '.')) || 0;
    setChange(received - total);
  }, [amountReceived, total]);

  // Click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        setSelectedProductId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Funzione di merge: unisce solo articoli senza note
  const mergeCartItems = (cartItems) => {
    const merged = [];
    cartItems.forEach(item => {
      if (!item.note) {
        const existing = merged.find(i => i.name === item.name && !i.note);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          merged.push({ ...item });
        }
      } else {
        merged.push({ ...item });
      }
    });
    return merged;
  };

  // Conferma nota su un articolo
  const confirmNote = (itemId) => {
    const note = notes[itemId]?.trim().toUpperCase();
    if (note === undefined) return;

    setCart(prevCart => {
      return mergeCartItems(
        prevCart.flatMap(item => {
          if (item.id !== itemId) return item;

          if (note) {
            // separa 1 unità con nota se quantity > 1
            if (item.quantity > 1) {
              const newItem = { ...item, id: Date.now(), quantity: 1, note };
              const remainingItem = { ...item, quantity: item.quantity - 1 };
              return [remainingItem, newItem];
            } else {
              return [{ ...item, note }];
            }
          } else {
            // se nota vuota, rimuovi nota dall'articolo
            return [{ ...item, note: undefined }];
          }
        })
      );
    });

    // pulizia temporanea nota
    setNotes(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const clearCartAndNotes = () => {
    clearCart();
    setNotes({});
  };

  const sendOrderAndReset = () => {
    sendOrder();
    setNotes({});
  };

  // Aggiunta articolo aggiornata per rispettare separazione note
  const handleAddToCart = (product) => {
    setCart(prevCart => {
      // se ha note, aggiungi come voce separata
      if (product.note) {
        return [...prevCart, { ...product, id: Date.now(), quantity: 1 }];
      } else {
        // merge automatico con articoli senza note
        return mergeCartItems([
          ...prevCart,
          { ...product, quantity: 1 }
        ]);
      }
    });
  };

  return (
    <div
      ref={cartRef}
      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                 border border-gray-300 dark:border-gray-700 
                 p-6 rounded-xl shadow-2xl flex flex-col h-full"
    >

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          <div className="text-xl font-bold">Carrello</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => removeLastItem(cart.find(p => p.id === selectedProductId))}
            disabled={!selectedProductId || !cart.some(p => p.id === selectedProductId)}
            className={`p-2 rounded transition-transform transform hover:scale-110 
              ${!selectedProductId || !cart.some(p => p.id === selectedProductId)
                ? 'opacity-50 cursor-not-allowed hover:scale-100'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            title="Rimuovi 1 unità"
          >
            <Minus size={16} />
          </button>

          <button
            onClick={() => handleAddToCart(cart.find(p => p.id === selectedProductId))}
            disabled={!selectedProductId || !cart.some(p => p.id === selectedProductId)}
            className={`p-2 rounded transition-transform transform hover:scale-110 
              ${!selectedProductId || !cart.some(p => p.id === selectedProductId)
                ? 'opacity-50 cursor-not-allowed hover:scale-100'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            title="Aggiungi 1 unità"
          >
            <Plus size={16} />
          </button>

          <button
            onClick={() => removeFromCart(cart.find(p => p.id === selectedProductId))}
            disabled={!selectedProductId || !cart.some(p => p.id === selectedProductId)}
            className={`p-2 rounded transition-transform transform hover:scale-110 
              ${!selectedProductId || !cart.some(p => p.id === selectedProductId)
                ? 'opacity-50 cursor-not-allowed hover:scale-100'
                : 'hover:bg-red-200 dark:hover:bg-red-700'
              }`}
            title="Rimuovi completamente"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Lista prodotti */}
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {cart.length === 0 ? (
            <li className="text-center text-gray-500 dark:text-gray-400 py-6">
              Carrello vuoto
            </li>
          ) : (
            cart.map(item => (
              <li
                key={item.id}
                className={`flex flex-col md:flex-row justify-between items-start md:items-center p-2 rounded-lg transition-all cursor-pointer
                  ${selectedProductId === item.id
                    ? 'border-2 border-blue-500 dark:border-blue-400 bg-gray-50 dark:bg-gray-700'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                onClick={() => setSelectedProductId(prev => prev === item.id ? null : item.id)}
              >
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold truncate">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>

                  {/* Mostra la nota sotto il titolo, se presente */}
                  {item.note && (
                    <div className="ml-3 mt-0.5 text-sm bg-yellow-400 text-black px-1 rounded inline-block">
                      <strong>Nota:</strong> {item.note}
                    </div>
                  )}

                  {selectedProductId === item.id && (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={notes[item.id] ?? item.note ?? ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [item.id]: e.target.value.toUpperCase() }))}
                        placeholder="Note (es. senza mozzarella)"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 p-1.5 border border-gray-300 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => confirmNote(item.id)}
                        className="p-2 rounded transition-transform transform hover:scale-110 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
                        title="Conferma nota"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 mt-auto flex flex-col gap-2">

        {/* Importo ricevuto */}
        <div className="flex justify-between items-center text-xl font-semibold">
          <label htmlFor="amountReceived" className="text-gray-700 dark:text-gray-200">
            Importo ricevuto [€]:
          </label>
          <input
            id="amountReceived"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            step="0.01"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/[^0-9.,]/g, '');
            }}
            placeholder="0.00"
            className="w-28 text-right p-1 border border-gray-300 dark:border-gray-600 rounded-md 
                      bg-gray-50 dark:bg-gray-700 dark:text-gray-100 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Totale e resto */}
        <div className="flex justify-between items-center text-xl font-bold mt-1">
          <span>Totale:</span>
          <span>{total.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between items-center text-xl font-semibold mb">
          <span>Resto:</span>
          <span className={`${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
            {change >= 0 ? change.toFixed(2) : '0.00'} €
          </span>
        </div>

        {/* Pulsanti principali */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!sessionActive) {
                showToast("Devi avviare la sessione prima di inviare ordini!", "error");
                return;
              }
              sendOrderAndReset();
            }}
            disabled={cart.length === 0 || !sessionActive}
            className="flex-1 h-12 px-6 rounded-lg text-white font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md
              bg-green-500 disabled:bg-gray-400"
          >
            Invia Ordine
          </button>

          <button
            onClick={clearCartAndNotes}
            disabled={cart.length === 0}
            className="flex-1 h-12 px-6 rounded-lg text-white font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md
              bg-red-500 disabled:bg-gray-400"
          >
            Svuota Carrello
          </button>
        </div>

        {children && <div className="w-full mt-1">{children}</div>}
      </div>
    </div>
  );
};

export default Cart;
