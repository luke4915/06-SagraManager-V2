// OrdersKitchen.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Check, Camera } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useToast } from '../context/ToastContext'; // ✅ Integrato Context
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;
// 🛡️ Migliorata la gestione URL per evitare il fallimento della connessione
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001`;

const OrdersKitchen = () => {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const { showToast } = useToast(); // ✅ Usiamo il toast globale
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const wsRef = useRef(null); // ✅ Ref per il websocket per gestirlo meglio

  // ===== Carica ordini =====
  const loadOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`);
      const data = await res.json();
      setOrders(data);
    } catch {
      showToast("Errore nel caricamento degli ordini", "error");
    }
  };

  // ===== Gestione WebSocket con Auto-Riconnessione =====
  useEffect(() => {
    if (loading || !user) return; // 🛡️ Protezione fondamentale

    loadOrders();

    const connectWS = () => {
      if (!user) return; // Ulteriore check prima di aprire

      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "order_created" || msg.type === "new_order") {
            setOrders(prev => [msg.order, ...prev]);
            showToast("Nuovo ordine ricevuto!", "info");
          } else if (msg.type === "order_updated") {
            setOrders(prev => prev.map(o => o.id === msg.order.id ? msg.order : o));
          }
        } catch (err) { console.error("Errore parsing WS:", err); }
      };

      wsRef.current.onclose = (e) => {
        // Riconnettiamo solo se l'utente è ancora loggato
        if (user) {
          console.warn("WS Cucina chiuso. Riconnessione...");
          setTimeout(connectWS, 3000);
        }
      };
    };

    connectWS();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, loading]); // 🔄 Aggiunte dipendenze auth

  // ===== Aggiorna stato ordine =====
  const markAsCompleted = async (orderId) => {
    if (!orderId) return;
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'completed' })
      });
      if (!res.ok) throw new Error();

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
      showToast(`Ordine ${orderId} completato!`, "success");
    } catch {
      showToast("Errore aggiornamento ordine", "error");
    }
  };

  // ===== Logica Barcode (Invariata) =====
  const parseBarcode = (code) => {
    if (!code.startsWith("ORD")) return null;
    const body = code.slice(3);
    const base36Part = body.slice(0, 6);
    try {
      return parseInt(base36Part, 36);
    } catch {
      return null;
    }
  };

  // ===== Scanner (Invariato nella logica, pulito nei riferimenti) =====
  const startScanner = async () => {
    setScannerError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Fotocamera non disponibile.");
      return;
    }

    setScanning(true);
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          const orderId = parseBarcode(result.text);
          if (orderId) {
            markAsCompleted(orderId);
            stopScanner();
          } else {
            setScannerError("Codice non valido.");
          }
        } else if (err && !(err instanceof NotFoundException)) {
          setScannerError("Errore lettura barcode.");
        }
      });
    } catch {
      setScannerError("Errore accesso fotocamera.");
      setScanning(false);
    }
  };

  const stopScanner = () => {
    setScanning(false);
    if (codeReaderRef.current) codeReaderRef.current.reset();
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg min-h-[400px] mt-2 flex-1 overflow-y-auto relative">

      {/* Header + Pulsante scanner */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Ordini Cucina</h2>
        <button
          onClick={scanning ? stopScanner : startScanner}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-white transition-colors ${scanning ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          <Camera size={16} /> {scanning ? "Ferma scanner" : "Scansiona ordine"}
        </button>
      </div>

      {/* Video scanner */}
      {scanning && (
        <div className="mb-4 flex flex-col items-center">
          <div className="relative w-full max-w-[320px] aspect-video rounded-lg overflow-hidden shadow-md border-2 border-blue-500">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-2 border-dashed border-white opacity-30 pointer-events-none m-4"></div>
          </div>
          {scannerError && <p className="text-red-600 text-sm mt-2 font-semibold">{scannerError}</p>}
        </div>
      )}

      {/* Lista ordini */}
      {orders.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 py-12 text-center italic">
          Nessun ordine in attesa...
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map(order => (
            <li
              key={order.id}
              className={`relative p-4 rounded-lg shadow-sm border-l-4 transition-all
                ${order.status === 'completed'
                  ? 'bg-gray-100 dark:bg-gray-700 opacity-60 border-gray-400'
                  : 'bg-gray-50 dark:bg-gray-700 border-orange-500'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={`font-bold ${order.status === 'completed' ? 'line-through' : ''}`}>
                  ORDINE #{order.id}
                </span>
                <span className="text-xs font-mono text-gray-500 dark:text-gray-300">
                  {order.created_at ? new Date(order.created_at).toLocaleTimeString() : ''}
                </span>
              </div>

              <ul className="text-sm space-y-1">
                {order.items?.map((item, idx) => (
                  <li key={idx} className="flex flex-col">
                    <div className="flex justify-between">
                      <span><span className="font-bold text-base">x{item.quantity}</span> {item.name}</span>
                    </div>
                    {item.note && (
                      <div className="ml-4 mt-1 p-1 px-2 bg-yellow-100 dark:bg-yellow-900/30 border-l-2 border-yellow-500 text-xs">
                        <span className="font-bold uppercase mr-1 text-[10px]">Nota:</span>
                        <span className="italic">{item.note}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {order.status !== 'completed' && (
                <button
                  onClick={() => markAsCompleted(order.id)}
                  className="mt-3 w-full md:w-auto md:absolute md:bottom-3 md:right-3 flex items-center justify-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm font-bold text-sm"
                >
                  <Check size={18} /> PRONTO
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OrdersKitchen;