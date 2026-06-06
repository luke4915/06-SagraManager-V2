import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Check, Printer, X, MessageSquare, QrCode } from 'lucide-react';
import jsQR from 'jsqr';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Modale ristampa ────────────────────────────────────────────
const ReprintSelectionModal = ({ onClose }) => {
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reprintingId, setReprintingId] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/orders?session=active`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setRecentOrders(data.slice(0, 10)))
      .catch(() => setError('Impossibile recuperare gli ordini'))
      .finally(() => setLoading(false));
  }, []);

  const handleReprint = async (orderId) => {
    setReprintingId(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/reprint`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error();
      onClose();
    } catch { alert('Errore durante la ristampa'); }
    finally { setReprintingId(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Ristampa Periferica</p>
            <h3 className="font-black text-sm uppercase tracking-tight text-[var(--text-main)]">Seleziona scontrino</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {loading && <p className="text-xs text-center py-4 text-[var(--text-muted)]">Caricamento...</p>}
          {error && <p className="text-xs text-center py-4 text-red-500">{error}</p>}
          {!loading && !error && recentOrders.length === 0 && <p className="text-xs text-center py-4 text-[var(--text-muted)]">Nessun ordine trovato.</p>}
          {!loading && !error && recentOrders.map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)]">
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-[var(--text-main)]">#{order.id}</span>
                  <span className="text-[10px] tabular-nums text-[var(--text-muted)]">{new Date(order.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || '—'}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-black text-xs text-[var(--accent)] tabular-nums">{Number(order.total).toFixed(2)} €</span>
                <button disabled={reprintingId !== null} onClick={() => handleReprint(order.id)}
                  className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white transition-colors">
                  <Printer size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Modale scan QR ─────────────────────────────────────────────
const QRScanModal = ({ currentCart, onMerge, onReplace, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scanned, setScanned] = useState(null);
  const videoRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Fai partire la richiesta permessi fotocamera non appena si apre la modale
  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    setScannerError('');

    // Verifica supporto HTTPS o ambiente locale protetto
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('Fotocamera non supportata (richiede HTTPS).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;
      setScanning(true);

      // Ritardo millesimale per consentire al browser di montare l'elemento video nel DOM
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            // Avvia la decodifica dei fotogrammi solo dopo il play andato a buon fine
            animFrameRef.current = requestAnimationFrame(scanFrame);
          } catch (playErr) {
            console.error("Errore playback video:", playErr);
          }
        }
      }, 100);

    } catch (err) {
      console.error("Errore getUserMedia:", err);
      if (err.name === 'NotAllowedError') {
        setScannerError('Permesso fotocamera negato dall\'utente.');
      } else {
        setScannerError('Impossibile accedere alla fotocamera.');
      }
    }
  };

  const scanFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        try {
          // Decodifica la stringa in base64
          const items = JSON.parse(atob(code.data));
          if (Array.isArray(items) && items.length > 0) {
            stopScanner();
            setScanned(items);
            return;
          } else {
            setScannerError('Contenuto QR non valido.');
          }
        } catch {
          setScannerError('Formato QR non riconosciuto.');
        }
      }
    } catch (canvasErr) {
      console.error("Errore elaborazione frame:", canvasErr);
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const stopScanner = () => {
    setScanning(false);

    // 1. Cancella subito il loop di animazione prima di toccare lo stream
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // 2. Ferma tutte le tracce hardware dello stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Traccia stoppata:", track.label);
      });
      streamRef.current = null;
    }

    // 3. FIX SPECIFICO PER iOS: Resetta e svuota completamente l'elemento video nativo
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();           // Forza la pausa
      video.srcObject = null;  // Rimuove lo stream
      video.removeAttribute('src'); // Rimuove eventuali sorgenti residue
      video.load();            // Forza iOS a ricaricare l'elemento vuoto rilasciando la cam
    }
  };

  const hasCart = currentCart.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Importa ordine</p>
            <h3 className="font-black text-sm uppercase tracking-tight text-[var(--text-main)]">Scansiona QR cliente</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Vista di scansione attiva */}
          {!scanned && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-[var(--accent)] bg-black flex items-center justify-center">
                {scanning ? (
                  // Aggiunti autoPlay, playsInline e muted per forzare i browser mobile ad attivare la cam
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                ) : (
                  <p className="text-xs text-gray-400">Inizializzazione cam...</p>
                )}
                <div className="absolute inset-0 border-2 border-dashed border-white/30 m-4 pointer-events-none rounded-lg" />
              </div>

              {scannerError && <p className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20 w-full">{scannerError}</p>}

              <button onClick={onClose}
                className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:bg-red-500 hover:text-white">
                Annulla Scansione
              </button>
            </div>
          )}

          {/* Risultato scansione */}
          {scanned && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-card-2)] rounded-xl border border-[var(--border)] p-4 space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Ordine scansionato</p>
                {scanned.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="font-bold text-[var(--text-main)]">×{item.quantity} {item.name}</span>
                    <span className="text-[var(--text-muted)] tabular-nums">€{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-[var(--text-main)] border-t border-[var(--border)] pt-2 mt-2">
                  <span>Totale</span>
                  <span className="text-[var(--accent)]">€{scanned.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0).toFixed(2)}</span>
                </div>
              </div>

              {!hasCart && (
                <button onClick={() => onReplace(scanned)}
                  className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <Check size={14} /> Carica nel carrello
                </button>
              )}

              {hasCart && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-muted)] font-bold text-center">Il carrello ha già degli articoli</p>
                  <button onClick={() => onMerge(scanned)}
                    className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                    Unisci ordini
                  </button>
                  <button onClick={() => onReplace(scanned)}
                    className="w-full py-3 bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-main)] hover:border-[var(--accent)] rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                    Sostituisci carrello
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Modale item carrello ───────────────────────────────────────
const CartItemModal = ({ item, onClose, onAdd, onRemove, onDelete, onNoteChange }) => {
  const [note, setNote] = useState(item.note || '');
  const handleClose = () => { if (note !== (item.note || '')) onNoteChange(item, note); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Articolo selezionato</p>
            <h3 className="font-black text-base uppercase tracking-tight text-[var(--text-main)] leading-tight">{item.name}</h3>
            <p className="text-[var(--accent)] font-black text-sm tabular-nums mt-0.5">{(item.price * item.quantity).toFixed(2)} €</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"><X size={15} /></button>
        </div>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Quantità</p>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => onRemove(item)} className="flex-1 py-3 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] flex justify-center text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95"><Minus size={16} /></button>
            <span className="text-3xl font-black tabular-nums text-[var(--text-main)] w-12 text-center">{item.quantity}</span>
            <button onClick={() => onAdd(item)} className="flex-1 py-3 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] flex justify-center text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95"><Plus size={16} /></button>
          </div>
        </div>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={11} className="text-[var(--text-muted)]" />
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Note cucina</p>
          </div>
          <textarea rows={2} placeholder="Es: senza cipolla, ben cotto..."
            value={note} onChange={e => setNote(e.target.value.toUpperCase())}
            className="w-full bg-[var(--bg-input)] px-3 py-2.5 rounded-xl text-sm font-medium outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)] text-[var(--text-main)] resize-none placeholder:text-[var(--text-muted)] placeholder:font-normal transition-[ring]" />
        </div>
        <div className="px-5 py-4">
          <button onClick={() => { onDelete(item); onClose(); }}
            className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <Trash2 size={13} /> Rimuovi dal carrello
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modale svuota carrello ─────────────────────────────────────
const ClearCartModal = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
      <p className="font-black text-[var(--text-main)] mb-1">Svuotare il carrello?</p>
      <p className="text-xs text-[var(--text-muted)] mb-6">Tutti gli articoli verranno rimossi.</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[var(--text-main)] font-black text-xs uppercase tracking-widest hover:bg-[var(--bg-card-2)] transition-all">Annulla</button>
        <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all">Svuota</button>
      </div>
    </div>
  </div>
);

// ─── Cart principale ────────────────────────────────────────────
const Cart = ({ cart, setCart, total, addToCart, removeFromCart, removeLastItem, clearCart, sendOrder, sessionActive, children, wsConnected }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [isQRScanModalOpen, setIsQRScanModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  useEffect(() => {
    const received = parseFloat(amountReceived.replace(',', '.')) || 0;
    setChange(received - total);
  }, [amountReceived, total]);

  const cartKey = (item) => `${item.id}__${item.note || ''}`;

  const mergeCartItems = (cartItems) => {
    const merged = [];
    cartItems.forEach(item => {
      if (!item.note) {
        const existing = merged.find(i => i.name === item.name && !i.note);
        if (existing) { existing.quantity += item.quantity; return; }
      }
      merged.push({ ...item });
    });
    return merged;
  };

  const handleNoteChange = (item, note) => {
    const oldKey = cartKey(item);
    setCart(prev => prev.map(i => cartKey(i) === oldKey ? { ...i, note } : i));
  };

  const handleSendOrder = async () => {
    if (!sessionActive) return;
    await sendOrder();
    setAmountReceived('');
  };

  // QR scan handlers
  const handleQRReplace = (items) => {
    setCart(items.map(i => ({ ...i, note: i.note || '' })));
    setIsQRScanModalOpen(false);
  };

  const handleQRMerge = (items) => {
    setCart(prev => {
      const merged = [...prev];
      items.forEach(newItem => {
        const idx = merged.findIndex(i => i.id === newItem.id && (i.note || '') === (newItem.note || ''));
        if (idx >= 0) merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + newItem.quantity };
        else merged.push({ ...newItem, note: newItem.note || '' });
      });
      return merged;
    });
    setIsQRScanModalOpen(false);
  };

  const mergedCart = mergeCartItems(cart);
  const currentSelected = selectedItem ? mergedCart.find(i => i.id === selectedItem.id && (i.note || '') === (selectedItem.note || '')) : null;

  return (
    <>
      <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3 flex justify-between items-center border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-black tracking-tighter uppercase text-[var(--text-main)]">Carrello</h2>
            <span className={`text-[9px] font-black uppercase tracking-widest ${sessionActive ? 'text-green-500' : 'text-red-400'}`}>
              {sessionActive ? '● Sessione attiva' : '● Sessione non attiva'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsQRScanModalOpen(true)} title="Importa ordine da QR"
              className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all">
              <QrCode size={16} />
            </button>
            <button onClick={() => setIsReprintModalOpen(true)} title="Ristampa scontrini recenti"
              className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all">
              <Printer size={16} />
            </button>
          </div>
        </div>

        {/* Lista articoli */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 no-scrollbar">
          {mergedCart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30">
              <ShoppingCart size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest mt-2">Vuoto</p>
            </div>
          ) : mergedCart.map(item => (
            <div key={cartKey(item)} onClick={() => setSelectedItem(item)}
              className="px-3 py-2 rounded-xl cursor-pointer border border-gray-300 dark:border-[var(--border)] bg-[var(--bg-card-2)] hover:border-[var(--accent)]/60 active:scale-[0.99] transition-all">
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="bg-[var(--accent)] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded shrink-0">{item.quantity}</span>
                  <span className="font-bold text-xs uppercase text-[var(--text-main)] leading-tight truncate">{item.name}</span>
                </div>
                <span className="font-black text-xs tabular-nums text-[var(--text-main)] shrink-0">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
              {item.note && (
                <div className="ml-7 mt-1.5 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1">
                  <MessageSquare size={9} className="text-yellow-500 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wide text-yellow-500 truncate">{item.note}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] space-y-2 bg-[var(--bg-card-2)]">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Ricevuti</span>
              <input type="text" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} placeholder="0.00"
                className="w-full bg-transparent outline-none font-black text-base text-[var(--text-main)] tabular-nums text-right" />
            </div>
            <div className="bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Resto</span>
              <span className={`text-base font-black tabular-nums block text-right ${change < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {change >= 0 ? change.toFixed(2) : '0.00'} €
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Totale</span>
            <span className="text-2xl font-black tracking-tighter text-[var(--text-main)] tabular-nums">{total.toFixed(2)} €</span>
          </div>

          <button onClick={handleSendOrder}
            disabled={cart.length === 0 || !sessionActive || !wsConnected}
            className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-input)] disabled:text-[var(--text-muted)] text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-[0.99] transition-all flex items-center justify-center gap-2">
            <Check size={15} /> Invia Ordine
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => cart.length > 0 && setIsClearModalOpen(true)} disabled={cart.length === 0}
              className="h-9 border border-red-300 dark:border-red-900/40 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30">
              Svuota
            </button>
            {children && (
              <div className="[&>*]:w-full [&>*]:h-9 [&>*]:rounded-xl [&>*]:font-black [&>*]:text-[10px] [&>*]:uppercase [&>*]:tracking-widest [&>*]:transition-all [&>*]:flex [&>*]:items-center [&>*]:justify-center [&>*]:gap-1">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>

      {currentSelected && <CartItemModal item={currentSelected} onClose={() => setSelectedItem(null)} onAdd={addToCart} onRemove={removeLastItem} onDelete={removeFromCart} onNoteChange={handleNoteChange} />}
      {isReprintModalOpen && <ReprintSelectionModal onClose={() => setIsReprintModalOpen(false)} />}
      {isClearModalOpen && <ClearCartModal onConfirm={() => clearCart(true)} onClose={() => setIsClearModalOpen(false)} />}
      {isQRScanModalOpen && <QRScanModal currentCart={cart} onMerge={handleQRMerge} onReplace={handleQRReplace} onClose={() => setIsQRScanModalOpen(false)} />}
    </>
  );
};

export default Cart;