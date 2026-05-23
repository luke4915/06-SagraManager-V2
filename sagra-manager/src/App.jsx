import React, { useState, useEffect, useRef } from 'react';

// Hooks Context
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';

// Componenti UI
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Cart from './components/Cart';
import ProductList from './components/ProductList';
import ProductConfig from './components/ProductConfig';
import OrdersKitchen from './components/OrdersKitchen';
import AppearanceSettings from './components/AppearanceSettings';
import ReverseOrder from './components/ReverseOrder';
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import UserProfile from './components/UserProfile';
import Statistics from './components/Statistics';
import PrintProfiles from './components/PrintProfiles';
import OrderSettings from './components/OrderSettings';

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000`;

const App = () => {
  const { user, loading, login, logout } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showReversePopup, setShowReversePopup] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const ws = useRef(null);

  const [theme, setTheme] = useState('dark');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  // Stati Gestione Sessione e Modali dedicati
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [inputSessionName, setInputSessionName] = useState("");

  const [orderMode, setOrderMode] = useState("simple");

  const audioCtxRef = useRef(null);
  const audioBuffers = useRef({});

  const getAudioContext = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playSagraSound = async (soundName) => {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!audioBuffers.current[soundName]) {
        const res = await fetch(`${API_URL}/assets/${soundName}.mp3`, { credentials: 'include' });
        if (!res.ok) throw new Error(`404: ${soundName}`);
        const arrayBuffer = await res.arrayBuffer();
        audioBuffers.current[soundName] = await ctx.decodeAudioData(arrayBuffer);
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffers.current[soundName];
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.15;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } catch (err) { console.warn('Audio error:', err); }
  };

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // 1️⃣ CHECK SESSIONE
  useEffect(() => {
    if (loading || !user) return;
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_URL}/sessions/latest`);
        const data = await res.json();
        if (data && !data.end_time) {
          setSessionActive(true);
          setSessionName(data.name);
        }
      } catch (err) { console.error("Errore sessione:", err); }
    };
    checkSession();
  }, [user, loading]);

  // 2️⃣ FETCH PRODOTTI
  useEffect(() => {
    if (loading || !user) return;
    fetch(`${API_URL}/products`)
      .then(res => res.json())
      .then(data => setProducts(data.map(p => ({ ...p, price: parseFloat(p.price) }))))
      .catch(err => console.error(err));
  }, [user, loading]);

  // 3️⃣ WEBSOCKET (Logica Originale preservata)
  useEffect(() => {
    if (loading || !user) return;
    ws.current = new WebSocket(WS_URL);
    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "product_updated":
            setProducts(prev => prev.map(p => p.id === msg.product.id ? { ...msg.product, price: parseFloat(msg.product.price) } : p));
            showToast(`"${msg.product.name}" aggiornato!`, "success");
            break;
          case "product_created":
            setProducts(prev => [...prev, { ...msg.product, price: parseFloat(msg.product.price) }]);
            showToast(`Nuovo prodotto aggiunto!`, "success");
            break;
          case "product_deleted":
            setProducts(prev => prev.filter(p => p.id !== msg.id));
            showToast(`Prodotto rimosso!`, "warning");
            break;
          // Integrazione opzionale se il server invia messaggi di sessione broadcast via WS
          case "session_started":
            setSessionActive(true);
            setSessionName(msg.session.name);
            break;
          case "session_ended":
            setSessionActive(false);
            setSessionName("");
            break;
          default: break;
        }
      } catch (err) { console.error("WS Parsing Error", err); }
    };
    return () => { if (ws.current) ws.current.close(); };
  }, [user, loading]);

  // 4️⃣ LOGICA CARRELLO
  useEffect(() => setTotal(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)), [cart]);

  const addToCart = (product) => {
    playSagraSound('product_select_sound');
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id && !i.note);
      if (exists) return prev.map(i => i.id === product.id && !i.note ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const clearCart = () => setCart([]);
  const removeFromCart = (product) => setCart(prev => prev.filter(i => i.id !== product.id));
  const removeLastItem = (product) => setCart(prev =>
    prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0)
  );

  const sendOrder = async () => {
    if (!sessionActive) return showToast("Nessuna sessione attiva! Apri una sessione per procedere.", "error");
    if (cart.length === 0) return showToast("Carrello vuoto!", "error");
    try {
      const orderPayload = {
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price, note: item.note || "" })),
        total,
        status: orderMode === "simple" ? "completed" : "pending",
        created_at: new Date().toISOString(),
        created_by: user?.id || null
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(orderPayload)
      });

      if (!res.ok) throw new Error("Errore server");

      playSagraSound('order_confirm_sound');
      clearCart();
      showToast("Ordine inviato con successo!", "success");
    } catch (err) { showToast("Errore durante l'invio", "error"); }
  };

  // Intercettore del pulsante sessione proveniente dalla Sidebar
  const handleSessionToggleClick = (targetState) => {
    // FIX: Se targetState non è un booleano (es. è un evento o undefined), 
    // decidiamo l'azione basandoci sul contrario dello stato attuale della sessione.
    const shouldActivate = typeof targetState === 'boolean' ? targetState : !sessionActive;

    if (shouldActivate) {
      // L'utente vuole attivare una sessione -> Apri il modale di inserimento nome
      setInputSessionName("");
      setShowStartSessionModal(true);
    } else {
      // L'utente vuole disattivare una sessione -> Chiedi conferma nel relativo modale
      setShowEndSessionModal(true);
    }
  };

  // Chiamata API Creazione Sessione
  const handleStartSessionSubmit = async (e) => {
    e.preventDefault();
    if (!inputSessionName.trim()) {
      showToast("Inserisci un nome valido!", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputSessionName.trim() })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Errore db");

      setSessionActive(true);
      setSessionName(data.name);
      setShowStartSessionModal(false);
      showToast(`Sessione "${data.name}" avviata con successo!`, "success");
    } catch (err) {
      showToast(err.message || "Impossibile avviare la sessione", "error");
    }
  };

  // Chiamata API Chiusura Sessione
  const handleEndSessionConfirm = async () => {
    try {
      const res = await fetch(`${API_URL}/sessions/end`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Errore db");

      setSessionActive(false);
      setSessionName("");
      setShowEndSessionModal(false);
      showToast("Sessione terminata e salvata correttamente.", "info");
    } catch (err) {
      showToast(err.message || "Impossibile chiudere la sessione", "error");
    }
  };

  const performLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      showToast("Sessione chiusa", "info");
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)]">Caricamento...</div>;
  if (!user) return <Login onLogin={login} />;
  if (needsPasswordChange) return <ChangePassword user={user} onPasswordChanged={() => setNeedsPasswordChange(false)} />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)]">

      <Sidebar
        view={view} setView={setView}
        isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentUser={user}
        sessionActive={sessionActive} setSessionActive={handleSessionToggleClick}
        sessionName={sessionName} setSessionName={setSessionName}
      />

      {/* Main Content: il margine si adatta alla sidebar in modo fluido */}
      <main className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header
          title="Sagra Manager"
          sessionName={sessionName}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          currentUser={user}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          onProfileClick={() => setShowProfilePopup(true)}
        />

        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--bg-card)] rounded-5xl p-6">
            {view === 'dashboard' && <ProductList products={products} addToCart={addToCart} />}
            {view === 'setup' && (
              <div className="space-y-6">
                <AppearanceSettings theme={theme} setTheme={setTheme} isSoundEnabled={isSoundEnabled} setIsSoundEnabled={setIsSoundEnabled} />
                <OrderSettings orderMode={orderMode} setOrderMode={setOrderMode} />
                <PrintProfiles />
              </div>
            )}
            {view === 'config' && <ProductConfig products={products} setProducts={setProducts} />}
            {view === 'kitchen' && <OrdersKitchen />}
            {view === 'statistics' && <Statistics />}
          </div>

          {/* Sezione Carrello laterale (Desktop) */}
          {view === 'dashboard' && user.role !== 'cucina' && (
            <div className="w-[420px] hidden xl:flex flex-col">
              <Cart
                cart={cart} setCart={setCart} total={total}
                addToCart={addToCart} removeFromCart={removeFromCart}
                removeLastItem={removeLastItem} clearCart={clearCart}
                sendOrder={sendOrder} sessionActive={sessionActive}
              >
                {/* Il bottone Storno passato come children */}
                <button
                  onClick={() => setShowReversePopup(true)}
                  className="py-3 bg-purple-600/10 text-purple-600 border border-purple-100 dark:border-purple-900/30 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all"
                >
                  Storno Ordini
                </button>
              </Cart>
            </div>
          )}
        </div>
      </main>

      {/* Modale di Conferma LOGOUT */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[2000]">
          <div className="bg-[var(--bg-card)] p-8 rounded-5xl shadow-2xl w-96 text-center border border-[var(--border)]">
            <h2 className="text-2xl font-black mb-6 text-[var(--text-main)]">Sei sicuro?</h2>
            <div className="flex justify-center gap-4">
              <button onClick={performLogout} className="px-8 py-3 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/30">LOGOUT</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="px-8 py-3 bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-main)] rounded-2xl font-bold">ANNULLA</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale 1: CREAZIONE NUOVA SESSIONE */}
      {showStartSessionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[2000]">
          <form onSubmit={handleStartSessionSubmit} className="bg-[var(--bg-card)] p-8 rounded-5xl shadow-2xl w-[450px] border border-[var(--border)] space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-[var(--text-main)]">Apri Nuova Sessione</h2>
              <p className="text-sm text-gray-400 mt-1">Assegna un nome o specifica il turno attuale</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Nome Sessione / Turno</label>
              <input
                type="text"
                autoFocus
                placeholder="Es. Turno Sera Sabato, Pranzo Domenica..."
                value={inputSessionName}
                onChange={(e) => setInputSessionName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] placeholder-gray-500 font-medium focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStartSessionModal(false)}
                className="flex-1 py-3 bg.transparent border border-[var(--border)] text-[var(--text-main)] rounded-2xl font-bold transition-all hover:bg-gray-500/10"
              >
                ANNULLA
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600"
              >
                AVVIA TURNO
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modale 2: CHIUSURA SESSIONE CORRENTE */}
      {showEndSessionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[2000]">
          <div className="bg-[var(--bg-card)] p-8 rounded-5xl shadow-2xl w-[450px] text-center border border-[var(--border)] space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-[var(--text-main)]">Terminare Sessione?</h2>
              <p className="text-sm text-gray-400 mt-2">
                Stai per chiudere la sessione attiva <span className="font-bold text-[var(--text-main)]">"{sessionName}"</span>.<br />
                I prossimi ordini saranno bloccati fino all'apertura di un nuovo turno.
              </p>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => setShowEndSessionModal(false)}
                className="flex-1 py-3 bg-transparent border border-[var(--border)] text-[var(--text-main)] rounded-2xl font-bold transition-all hover:bg-gray-500/10"
              >
                ANNULLA
              </button>
              <button
                onClick={handleEndSessionConfirm}
                className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600"
              >
                CONFERMA CHIUSURA
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfilePopup && <UserProfile user={user} onClose={() => setShowProfilePopup(false)} />}
      {showReversePopup && <ReverseOrder onClose={() => setShowReversePopup(false)} />}
    </div>
  );
};

export default App;