import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const ReverseOrder = ({ onClose, showToast }) => {
  const [orders, setOrders] = useState([]);

  const loadPendingOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`);
      const data = await res.json();
      setOrders(data.filter(o => o.status === 'pending'));
    } catch (err) {
      console.error(err);
      showToast("Errore caricamento ordini!");
    }
  };

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const cancelOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'canceled' })
      });
      if (!res.ok) throw new Error("Errore stornare ordine");
      setOrders(prev => prev.filter(o => o.id !== orderId));
      showToast("Ordine stornato!");
    } catch (err) {
      console.error(err);
      showToast("Errore durante lo storno!");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1c1f26] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-lg transform transition-all duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black tracking-tighter text-gray-900 dark:text-gray-50 uppercase">Storno Ordini</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Annullamento comande in sospeso</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-500 py-12 text-center text-sm font-medium">
            Nessun ordine pending da stornare.
          </div>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto pr-1 no-scrollbar">
            {orders.map(order => (
              <li key={order.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
                <div>
                  <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Comanda ID: #{order.id}</span>
                  <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 tracking-tight">
                    Totale: {(Number(order.total) || 0).toFixed(2)} €
                  </div>
                </div>
                <button
                  onClick={() => cancelOrder(order.id)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-sm shadow-red-500/10"
                >
                  Storna
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ReverseOrder;