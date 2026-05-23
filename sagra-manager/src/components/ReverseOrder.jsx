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
        credentials: "include",
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-[var(--border)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black tracking-tighter text-[var(--text-main)]">Storno Ordini</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-card-2)] transition-colors">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-[var(--text-muted)] py-10 text-center font-black uppercase tracking-widest text-xs">
            Nessun ordine pending da stornare.
          </div>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {orders.map(order => (
              <li key={order.id} className="flex justify-between items-center p-4 bg-[var(--bg-card-2)] rounded-2xl border border-[var(--border)]">
                <div>
                  <span className="font-black text-sm uppercase tracking-tight text-[var(--text-main)]">Ordine ID: {order.id}</span>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
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
