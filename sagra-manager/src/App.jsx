import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

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
import KDS from './components/KDS';
import MenuPage from './components/MenuPage';
import MenuSettings from './components/MenuSettings';

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000`;

const App = () => {
  const { user, loading, login, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('cart') || '[]'); }
    catch { return []; }
  });
  useEffect(() => { sessionStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);
  const [total, setTotal] = useState(0);

  const [view, setView] = useState(user?.role === 'cucina' ? 'kitchen' : 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showReversePopup, setShowReversePopup] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const ws = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  const [theme, setTheme] = useState('dark');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [inputSessionName, setInputSessionName] = useState("");
  const [orderMode, setOrderMode] = useState("simple");

  // Stato per il carrello su mobile
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const audioCtxRef = useRef(null);
  const audioBuffers = useRef({});

  // Sincronizza view con URL al mount e ai cambi di rotta
  useEffect(() => {
    const path = window.location.pathname.replace('/', '') || 'dashboard';
    setView(path);
  }, [window.location.pathname]);

  // Sincronizza view se utente cucina
  useEffect(() => {
    if (user?.role === 'cucina') {
      setView('kitchen');
      navigate('/kitchen');
    }
  }, [user]);

  // 🟢 LOGICA COMPORTAMENTO MOBILE: Quando cambi pagina dalla sidebar, questa si chiude automaticamente
  const handleSetView = (newView) => {
    setView(newView);
    navigate(`/${newView}`);
    setIsSidebarOpen(false); // Chiusura automatica del menu dopo il click
  };

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
        const res = await fetch(`${API_URL}/sessions/latest`, { credentials: 'include' });
        const data = await res.json();
        if (data && !data.end_time) { setSessionActive(true); setSessionName(data.name); }
      } catch (err) { console.error("Errore sessione:", err); }
    };
    checkSession();
  }, [user, loading]);

  // 2️⃣ FETCH PRODOTTI
  useEffect(() => {
    if (loading || !user) return;
    fetch(`${API_URL}/products`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setProducts(data.map(p => ({ ...p, price: parseFloat(p.price) }))))
      .catch(err => console.error(err));
  }, [user, loading]);

  // 3️⃣ WEBSOCKET
  const wsReconnectTimer = useRef(null);
  const connectWS = useRef(null);
  connectWS.current = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    ws.current = new WebSocket(WS_URL);
    ws.current.onopen = () => setWsConnected(true);
    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "product_updated":
            setProducts(prev => prev.map(p => p.id === msg.product.id ? { ...msg.product, price: parseFloat(msg.product.price) } : p));
            showToast(`"${msg.product.name}" aggiornato!`, "success"); break;
          case "product_created":
            setProducts(prev => [...prev, { ...msg.product, price: parseFloat(msg.product.price) }]);
            showToast(`Nuovo prodotto aggiunto!`, "success"); break;
          case "product_deleted":
            setProducts(prev => prev.filter(p => p.id !== msg.id));
            showToast(`Prodotto rimosso!`, "warning"); break;
          case "session_started": setSessionActive(true); setSessionName(msg.session.name); break;
          case "session_ended": setSessionActive(false); setSessionName(""); break;
          default: break;
        }
      } catch (err) { console.error("WS Parsing Error", err); }
    };
    ws.current.onclose = () => {
      setWsConnected(false);
      wsReconnectTimer.current = setTimeout(() => connectWS.current?.(), 3000);
    };
    ws.current.onerror = () => { ws.current?.close(); };
  };

  useEffect(() => {
    if (loading || !user) return;
    connectWS.current();
    return () => { clearTimeout(wsReconnectTimer.current); ws.current?.close(); };
  }, [user, loading]);

  // 4️⃣ CARRELLO
  useEffect(() => setTotal(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)), [cart]);

  const addToCart = (product) => {
    playSagraSound('product_select_sound');
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id && (i.note || '') === (product.note || ''));
      if (exists) return prev.map(i => i.id === product.id && (i.note || '') === (product.note || '') ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };
  const clearCart = (isManual = false) => { if (isManual) playSagraSound('empty_cart_sound'); setCart([]); };
  const removeFromCart = (product) => setCart(prev => prev.filter(i => !(i.id === product.id && (i.note || '') === (product.note || ''))));
  const removeLastItem = (product) => setCart(prev =>
    prev.map(i => i.id === product.id && (i.note || '') === (product.note || '') ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0)
  );

  const sendOrder = async () => {
    if (!sessionActive) return showToast("Nessuna sessione attiva! Apri una sessione per procedere.", "error");
    if (cart.length === 0) return showToast("Carrello vuoto!", "error");
    try {
      const orderPayload = {
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price, note: item.note || "", print_destination: item.print_destination || 'both' })),
        status: orderMode === "simple" ? "completed" : "pending",
      };
      const res = await fetch(`${API_URL}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(orderPayload) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Errore server"); }
      playSagraSound('order_confirm_sound');
      clearCart();
      showToast("Ordine inviato con successo!", "success");
    } catch (err) { showToast(`Errore invio ordine: ${err.message}`, "error"); }
  };

  const handleSessionToggleClick = (targetState) => {
    const shouldActivate = typeof targetState === 'boolean' ? targetState : !sessionActive;
    if (shouldActivate) { setInputSessionName(""); setShowStartSessionModal(true); }
    else { setShowEndSessionModal(true); }
  };

  const handleStartSessionSubmit = async (e) => {
    e.preventDefault();
    if (!inputSessionName.trim()) { showToast("Inserisci un nome valido!", "warning"); return; }
    try {
      const res = await fetch(`${API_URL}/sessions/start`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: inputSessionName.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore db");
      setSessionActive(true); setSessionName(data.name); setShowStartSessionModal(false);
      showToast(`Sessione "${data.name}" avviata con successo!`, "success");
    } catch (err) { showToast(err.message || "Impossibile avviare la sessione", "error"); }
  };

  const handleEndSessionConfirm = async () => {
    try {
      const res = await fetch(`${API_URL}/sessions/end`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore db");
      setSessionActive(false); setSessionName(""); setShowEndSessionModal(false);
      showToast("Sessione terminata e salvata correttamente.", "info");
    } catch (err) { showToast(err.message || "Impossibile chiudere la sessione", "error"); }
  };

  const performLogout = async () => {
    try { await logout(); setShowLogoutConfirm(false); showToast("Sessione chiusa", "info"); navigate('/login'); }
    catch (err) { console.error(err); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)]">Caricamento...</div>;

  if (!user) return (
    <Routes>
      <Route path="/login" element={<Login onLogin={login} />} />
      <Route path="/kds" element={<KDS />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/menu" element={<MenuPage />} />
    </Routes>
  );

  if (needsPasswordChange) return <ChangePassword user={user} onPasswordChanged={() => setNeedsPasswordChange(false)} />;
  if (window.location.pathname === '/menu') return <MenuPage />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)] relative">

      {/* 🟢 SIDEBAR COMPORTAMENTO ADATTIVO:
          - Su Desktop (xl) è sempre visibile e segue lo stato di apertura/chiusura normale.
          - Su Mobile parte nascosta (hidden). Se 'isSidebarOpen' è vero, si attiva come overlay fisso (fixed) 
            che compare sopra i contenuti, forzando la visualizzazione compatta (isOpen={false}).
      */}
      <div className={`inset-y-0 left-0 z-[1600] transition-transform duration-300 ease-in-out
        ${window.innerWidth >= 1280
          ? 'xl:static xl:translate-x-0 xl:block'
          : isSidebarOpen ? 'fixed translate-x-0 block' : 'hidden -translate-x-full'
        }`}
      >
        <Sidebar
          view={view} setView={handleSetView}
          isOpen={window.innerWidth >= 1280 ? isSidebarOpen : false} // 🟢 Forza la visualizzazione COMPACT (solo icone) su mobile/tablet
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          currentUser={user}
          sessionActive={sessionActive} setSessionActive={handleSessionToggleClick}
          sessionName={sessionName} setSessionName={setSessionName}
        />
      </div>

      {/* 🟢 OVERLAY SFONDO MOBILE (BACKDROP OPACIZZATO): Compare solo sotto xl quando la barra è aperta, cliccandoci sopra si chiude */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1550] xl:hidden transition-all duration-300 animate-fadeIn"
        />
      )}

      {/* MAIN: Margini desktop corretti basati sullo stato. Su mobile il margine è 0 perché la sidebar va sopra i contenuti senza romperli */}
      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out w-full overflow-hidden
        ${isSidebarOpen ? 'xl:ml-64 ml-0' : 'xl:ml-20 ml-0'}`}>

        <Header
          title="Sagra Manager"
          sessionName={sessionName}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          currentUser={user}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          onProfileClick={() => setShowProfilePopup(true)}
          wsConnected={wsConnected}
        />

        <div className="flex-1 flex overflow-hidden p-4 gap-4 relative">

          <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--bg-card)] rounded-xl border border-gray-400 dark:border-[var(--border)] p-6">
            {user.role === 'cucina' ? (
              <OrdersKitchen />
            ) : (
              <Routes>
                <Route path="/dashboard" element={<ProductList products={products} addToCart={addToCart} />} />
                <Route path="/kitchen" element={<OrdersKitchen />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/config" element={<ProductConfig products={products} setProducts={setProducts} />} />
                <Route path="/setup" element={
                  <div className="space-y-6">
                    <AppearanceSettings theme={theme} setTheme={setTheme} isSoundEnabled={isSoundEnabled} setIsSoundEnabled={setIsSoundEnabled} />
                    <MenuSettings />
                    <OrderSettings orderMode={orderMode} setOrderMode={setOrderMode} />
                    <PrintProfiles />
                  </div>
                } />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            )}
          </div>

          {/* ==========================================
              GESTIONE CARRELLO DESKTOP / MOBILE
             ========================================== */}
          {view === 'dashboard' && user.role !== 'cucina' && (
            <>
              {/* 🖥️ DESKTOP: Renderizzato solo su schermi grandi */}
              <div className="w-[420px] hidden xl:flex flex-col shrink-0">
                <Cart
                  cart={cart} setCart={setCart} total={total}
                  addToCart={addToCart} removeFromCart={removeFromCart}
                  removeLastItem={removeLastItem} clearCart={clearCart}
                  sendOrder={sendOrder} sessionActive={sessionActive}
                  wsConnected={wsConnected}
                >
                  <button onClick={() => setShowReversePopup(true)}
                    className="py-3 bg-purple-600/10 text-purple-600 border border-purple-100 dark:border-purple-900/30 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all">
                    Storno Ordini
                  </button>
                </Cart>
              </div>

              {/* 📱 MOBILE OVERLAY: Schermo intero (solo sotto xl) */}
              {isMobileCartOpen && (
                <div className="fixed inset-0 z-[1700] bg-[var(--bg-main)] p-4 flex flex-col xl:hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-black text-[var(--text-main)]">Riepilogo Ordine</h3>
                    <button
                      onClick={() => setIsMobileCartOpen(false)}
                      className="px-5 py-2 bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-main)] rounded-xl font-bold text-sm uppercase tracking-wider transition-transform active:scale-95"
                    >
                      ← Chiudi
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)]">
                    <Cart
                      cart={cart} setCart={setCart} total={total}
                      addToCart={addToCart} removeFromCart={removeFromCart}
                      removeLastItem={removeLastItem} clearCart={clearCart}
                      sendOrder={async () => { await sendOrder(); setIsMobileCartOpen(false); }}
                      sessionActive={sessionActive}
                      wsConnected={wsConnected}
                    >
                      <button onClick={() => { setShowReversePopup(true); setIsMobileCartOpen(false); }}
                        className="py-3 bg-purple-600/10 text-purple-600 border border-purple-100 dark:border-purple-900/30 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all">
                        Storno Ordini
                      </button>
                    </Cart>
                  </div>
                </div>
              )}

              {/* 🛒 MOBILE BUTTON: Sempre accessibile in basso a destra su mobile per aprire la cassa */}
              {!isMobileCartOpen && (
                <div className="fixed bottom-6 right-6 z-[1400] xl:hidden">
                  <button
                    onClick={() => setIsMobileCartOpen(true)}
                    className="flex items-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-500/40 transition-all transform active:scale-95"
                  >
                    <div className="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                      </svg>
                      {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-white text-emerald-600 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border border-emerald-500 shadow-sm">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm tracking-wide">
                      {cart.length > 0 ? `VEDI CASSA (${total.toFixed(2)}€)` : "APRI CASSA"}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modale Logout */}
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

      {/* Modale Apri Sessione */}
      {showStartSessionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[2000]">
          <form onSubmit={handleStartSessionSubmit} className="bg-[var(--bg-card)] p-8 rounded-5xl shadow-2xl w-[450px] border border-[var(--border)] space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-[var(--text-main)]">Apri Nuova Sessione</h2>
              <p className="text-sm text-gray-400 mt-1">Assegna un nome o specifica il turno attuale</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Nome Sessione / Turno</label>
              <input type="text" autoFocus placeholder="Es. Turno Sera Sabato, Pranzo Domenica..."
                value={inputSessionName} onChange={(e) => setInputSessionName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] placeholder-gray-500 font-medium focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowStartSessionModal(false)}
                className="flex-1 py-3 bg-transparent border border-[var(--border)] text-[var(--text-main)] rounded-2xl font-bold transition-all hover:bg-gray-500/10">ANNULLA</button>
              <button type="submit"
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600">AVVIA TURNO</button>
            </div>
          </form>
        </div>
      )}

      {/* Modale Chiudi Sessione */}
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
                I prossimi ordini saranno bloccati fino all'apertura di un Turno.
              </p>
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <button onClick={() => setShowEndSessionModal(false)}
                className="flex-1 py-3 bg-transparent border border-[var(--border)] text-[var(--text-main)] rounded-2xl font-bold transition-all hover:bg-gray-500/10">ANNULLA</button>
              <button onClick={handleEndSessionConfirm}
                className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600">CONFERMA CHIUSURA</button>
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