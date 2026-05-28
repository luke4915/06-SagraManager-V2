import React, { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL;

const ReverseOrder = ({ onClose }) => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/orders?session=active`, { credentials: 'include' });
        const data = await res.json();
        setOrders(data.filter(o => o.status === 'pending'));
      } catch {
        showToast("Errore caricamento ordini", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cancelOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: 'canceled' })
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.filter(o => o.id !== orderId));
      showToast("Ordine stornato", "success");
    } catch {
      showToast("Errore durante lo storno", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl p-6 w-full max-w-lg border border-[var(--border)]">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-black tracking-tighter text-[var(--text-main)]">Storno Ordini</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">Solo ordini pending della sessione attiva</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-card-2)] transition-colors">
            <X size={18} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">Caricamento...</div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">Nessun ordine da stornare</div>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
            {orders.map(order => (
              <li key={order.id} className="flex justify-between items-center p-4 bg-[var(--bg-card-2)] rounded-2xl border border-[var(--border)]">
                <div>
                  <span className="font-black text-sm uppercase tracking-tight text-[var(--text-main)]">Ordine #{order.id}</span>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {order.items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                  </div>
                  <div className="text-xs font-black text-[var(--accent)] mt-0.5">{Number(order.total || 0).toFixed(2)} €</div>
                </div>
                <button
                  onClick={() => cancelOrder(order.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  <AlertTriangle size={12} /> Storna
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