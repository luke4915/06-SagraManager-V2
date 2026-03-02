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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Storno Ordini</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-700 dark:text-gray-200"/>
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 py-10 text-center">
            Nessun ordine pending da stornare.
          </div>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {orders.map(order => (
              <li key={order.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded shadow">
                <div>
                  <span className="font-semibold truncate">Ordine ID: {order.id}</span>
                  <div className="text-sm text-gray-500 dark:text-gray-300">
                    Totale: {(Number(order.total) || 0).toFixed(2)} €
                  </div>
                </div>
                <button
                  onClick={() => cancelOrder(order.id)}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors text-sm"
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
