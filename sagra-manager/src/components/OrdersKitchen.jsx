import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Check, Camera, ChefHat, Minus } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000`;

// ─── KDS Cumulativo ────────────────────────────────────────────
const CumulativeQueue = ({ orders, onEvade }) => {
  const queue = useMemo(() => {
    const active = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
    const map = {};
    active.forEach(o => {
      o.items?.forEach(item => {
        const key = `${item.name}__${item.note || ''}`;
        if (!map[key]) map[key] = { name: item.name, note: item.note || '', quantity: 0 };
        map[key].quantity += Number(item.quantity || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  if (!queue.length) return (
    <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
      <ChefHat size={28} className="mb-2 opacity-30" />
      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Tutto evaso</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {queue.map(item => (
        <div key={`${item.name}__${item.note}`}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)]">
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm uppercase tracking-tight text-[var(--text-main)] truncate">{item.name}</p>
            {item.note && (
              <p className="text-[10px] font-black uppercase text-yellow-500 mt-0.5">⚠ {item.note}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-3xl font-black tabular-nums text-[var(--accent)] w-10 text-right leading-none">
              {item.quantity}
            </span>
            <button onClick={() => onEvade(item.name, item.note, 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-white border border-[var(--accent)]/30 transition-all active:scale-95">
              <Minus size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Singolo ordine ─────────────────────────────────────────────
const OrderCard = ({ order, onComplete }) => (
  <div className={`rounded-xl p-4 border-l-4 transition-all ${
    order.status === 'completed' ? 'bg-[var(--bg-card)] border-green-500/40 opacity-40' :
    order.status === 'canceled'  ? 'bg-[var(--bg-card)] border-red-500/40 opacity-30' :
    'bg-[var(--bg-card)] border-[var(--accent)] shadow-sm'
  }`}>
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center gap-2">
        <span className={`font-black text-sm tracking-widest uppercase ${
          order.status === 'completed' || order.status === 'canceled' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'
        }`}>#{order.id}</span>
        {order.status === 'canceled' && (
          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full text-[9px] font-black uppercase">Stornato</span>
        )}
        {order.status === 'completed' && (
          <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-500 rounded-full text-[9px] font-black uppercase">Completato</span>
        )}
      </div>
      <span className="text-[10px] font-bold text-[var(--text-muted)] tabular-nums">
        {order.created_at ? new Date(order.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}
      </span>
    </div>
    <ul className="space-y-1.5 mb-3">
      {order.items?.map((item, idx) => (
        <li key={idx}>
          <div className="flex items-baseline gap-2">
            <span className="text-[var(--accent)] font-black text-sm">×{item.quantity}</span>
            <span className="font-bold text-sm text-[var(--text-main)] uppercase">{item.name}</span>
          </div>
          {item.note && (
            <div className="ml-6 mt-0.5 px-2 py-0.5 bg-yellow-500/10 border-l-2 border-yellow-400 text-xs text-yellow-500 font-black uppercase">
              {item.note}
            </div>
          )}
        </li>
      ))}
    </ul>
    {order.status !== 'completed' && order.status !== 'canceled' && (
      <button onClick={() => onComplete(order.id)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.99]">
        <Check size={14} /> PRONTO
      </button>
    )}
  </div>
);

// ─── Componente principale ──────────────────────────────────────
const OrdersKitchen = () => {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const { showToast } = useToast();
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const wsRef = useRef(null);

  // Stato locale cumulativo evaso (scalature manuali non persistite)
  const [evaded, setEvaded] = useState({});

  const loadOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders?session=active`, { credentials: 'include' });
      if (res.ok) setOrders(await res.json());
    } catch { showToast('Errore caricamento ordini', 'error'); }
  };

  useEffect(() => {
    if (loading || !user) return;
    loadOrders();
    let reconnectTimer = null;
    const connectWS = () => {
      wsRef.current = new WebSocket(WS_URL);
      wsRef.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'order_created' || msg.type === 'new_order') {
            setOrders(prev => [msg.order, ...prev]);
            showToast('Nuovo ordine ricevuto!', 'info');
          } else if (msg.type === 'order_updated') {
            setOrders(prev => prev.map(o => o.id === msg.order.id ? msg.order : o));
          }
        } catch (err) { console.error('WS parse error:', err); }
      };
      wsRef.current.onclose = () => { reconnectTimer = setTimeout(connectWS, 3000); };
      wsRef.current.onerror = () => wsRef.current?.close();
    };
    reconnectTimer = setTimeout(connectWS, 100);
    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [user, loading]);

  const markAsCompleted = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
      showToast(`Ordine #${orderId} completato!`, 'success');
    } catch { showToast('Errore aggiornamento ordine', 'error'); }
  };

  // Scalatura manuale cumulativo — non persiste sul DB, solo UI locale
  const handleEvade = (name, note, qty) => {
    const key = `${name}__${note}`;
    setEvaded(prev => ({ ...prev, [key]: (prev[key] || 0) + qty }));
  };

  // Applica evaded al cumulativo passato a CumulativeQueue
  const ordersWithEvaded = useMemo(() => {
    if (!Object.keys(evaded).length) return orders;
    return orders.map(o => ({
      ...o,
      items: o.items?.map(item => {
        const key = `${item.name}__${item.note || ''}`;
        const e = evaded[key] || 0;
        if (!e) return item;
        return { ...item, quantity: Math.max(0, item.quantity - e) };
      }),
    }));
  }, [orders, evaded]);

  const parseBarcode = (code) => {
    if (!code.startsWith('ORD')) return null;
    try { return parseInt(code.slice(3, 9), 36); } catch { return null; }
  };

  const startScanner = async () => {
    setScannerError('');
    if (!navigator.mediaDevices?.getUserMedia) { setScannerError('Fotocamera non disponibile.'); return; }
    setScanning(true);
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) { const id = parseBarcode(result.text); if (id) { markAsCompleted(id); stopScanner(); } else setScannerError('Codice non valido.'); }
        else if (err && !(err instanceof NotFoundException)) setScannerError('Errore lettura barcode.');
      });
    } catch { setScannerError('Errore accesso fotocamera.'); setScanning(false); }
  };

  const stopScanner = () => {
    setScanning(false);
    codeReaderRef.current?.reset();
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const pending = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const completed = orders.filter(o => o.status === 'completed');
  const canceled = orders.filter(o => o.status === 'canceled');

  return (
    <div className="h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-[var(--text-main)]">CUCINA</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">
            {pending.length} in attesa · {completed.length} completati · {canceled.length} stornati
          </p>
        </div>
        <button onClick={scanning ? stopScanner : startScanner}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all ${
            scanning ? 'bg-red-500' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
          }`}>
          <Camera size={16} /> {scanning ? 'Ferma' : 'Scansiona'}
        </button>
      </div>

      {/* Scanner */}
      {scanning && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] flex flex-col items-center gap-3 shrink-0">
          <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden border-2 border-[var(--accent)]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-2 border-dashed border-white/30 m-4 pointer-events-none rounded-lg" />
          </div>
          {scannerError && <p className="text-red-500 text-xs font-bold">{scannerError}</p>}
        </div>
      )}

      {/* Layout a due colonne */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">

        {/* Colonna sinistra — Cumulativo */}
        <div className="flex flex-col bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Coda cumulativa</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Totale da preparare ora</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
            <CumulativeQueue orders={ordersWithEvaded} onEvade={handleEvade} />
          </div>
        </div>

        {/* Colonna destra — Ordini cronologici */}
        <div className="flex flex-col bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ordini cronologici</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Dal più recente</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {orders.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[var(--text-muted)]">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Nessun ordine</p>
              </div>
            ) : orders.map(order => (
              <OrderCard key={order.id} order={order} onComplete={markAsCompleted} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrdersKitchen;
