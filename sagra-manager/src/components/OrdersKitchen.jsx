import React, { useEffect, useState, useRef } from 'react';
import { Check, Camera } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000`;

const OrdersKitchen = () => {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const { showToast } = useToast();
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const wsRef = useRef(null);

  const loadOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`);
      setOrders(await res.json());
    } catch { showToast("Errore nel caricamento degli ordini", "error"); }
  };

  useEffect(() => {
    if (loading || !user) return;
    loadOrders();

    let reconnectTimer = null;

    const connectWS = () => {
      if (!user) return;
      wsRef.current = new WebSocket(WS_URL);
      wsRef.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "order_created" || msg.type === "new_order") { setOrders(prev => [msg.order, ...prev]); showToast("Nuovo ordine ricevuto!", "info"); }
          else if (msg.type === "order_updated") setOrders(prev => prev.map(o => o.id === msg.order.id ? msg.order : o));
        } catch (err) { console.error("Errore parsing WS:", err); }
      };
      wsRef.current.onclose = () => {
        if (user) reconnectTimer = setTimeout(connectWS, 3000);
      };
    };

    // Piccolo delay per evitare race condition al mount
    reconnectTimer = setTimeout(connectWS, 100);

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [user, loading]);

  const markAsCompleted = async (orderId) => {
    if (!orderId) return;
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: 'completed' }) });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
      showToast(`Ordine ${orderId} completato!`, "success");
    } catch { showToast("Errore aggiornamento ordine", "error"); }
  };

  const parseBarcode = (code) => {
    if (!code.startsWith("ORD")) return null;
    try { return parseInt(code.slice(3, 9), 36); } catch { return null; }
  };

  const startScanner = async () => {
    setScannerError('');
    if (!navigator.mediaDevices?.getUserMedia) { setScannerError("Fotocamera non disponibile."); return; }
    setScanning(true);
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) { const id = parseBarcode(result.text); if (id) { markAsCompleted(id); stopScanner(); } else setScannerError("Codice non valido."); }
        else if (err && !(err instanceof NotFoundException)) setScannerError("Errore lettura barcode.");
      });
    } catch { setScannerError("Errore accesso fotocamera."); setScanning(false); }
  };

  const stopScanner = () => {
    setScanning(false);
    if (codeReaderRef.current) codeReaderRef.current.reset();
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const pending = orders.filter(o => o.status !== 'completed');
  const completed = orders.filter(o => o.status === 'completed');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-gray-100">CUCINA</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
            {pending.length} in attesa · {completed.length} completati
          </p>
        </div>
        <button
          onClick={scanning ? stopScanner : startScanner}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-lg ${scanning ? 'bg-red-500 shadow-red-500/30' : 'bg-orange-500 shadow-orange-500/30'}`}
        >
          <Camera size={16} /> {scanning ? "Ferma" : "Scansiona"}
        </button>
      </div>

      {scanning && (
        <div className="bg-white dark:bg-[#1c1f26] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-3">
          <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden border-2 border-orange-500">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-2 border-dashed border-white/30 m-4 pointer-events-none rounded-lg" />
          </div>
          {scannerError && <p className="text-red-500 text-xs font-bold">{scannerError}</p>}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="font-black uppercase tracking-widest text-xs">Nessun ordine in attesa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => (
            <div
              key={order.id}
              className={`rounded-2xl p-5 border-l-4 transition-all ${order.status === 'completed'
                ? 'bg-white dark:bg-[#1c1f26] border-gray-200 dark:border-gray-700 opacity-50'
                : 'bg-white dark:bg-[#1c1f26] border-orange-500 shadow-sm hover:shadow-lg'
                }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className={`font-black text-sm tracking-widest uppercase ${order.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  #{order.id}
                </span>
                <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                  {order.created_at ? new Date(order.created_at).toLocaleTimeString() : ''}
                </span>
              </div>
              <ul className="space-y-1.5 mb-4">
                {order.items?.map((item, idx) => (
                  <li key={idx}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-orange-500 font-black text-sm">×{item.quantity}</span>
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-200 uppercase">{item.name}</span>
                    </div>
                    {item.note && (
                      <div className="ml-6 mt-0.5 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 text-xs text-yellow-700 dark:text-yellow-300 italic">
                        {item.note}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {order.status !== 'completed' && (
                <button
                  onClick={() => markAsCompleted(order.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20"
                >
                  <Check size={16} /> PRONTO
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersKitchen;