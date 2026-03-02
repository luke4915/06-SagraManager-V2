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
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001`;

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
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [orderMode, setOrderMode] = useState("simple");

  // Funzione Feedback Sonoro (Server-side assets)
  const playSagraSound = (soundName) => {
    if (!isSoundEnabled) return;
    const audio = new Audio(`${API_URL}/assets/${soundName}.mp3`);
    audio.volume = 0.15;
    audio.play().catch(() => { });
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

  const performLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      showToast("Sessione chiusa", "info");
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-950">Caricamento...</div>;
  if (!user) return <Login onLogin={login} />;
  if (needsPasswordChange) return <ChangePassword user={user} onPasswordChanged={() => setNeedsPasswordChange(false)} />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)]">

      <Sidebar
        view={view} setView={setView}
        isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentUser={user}
        sessionActive={sessionActive} setSessionActive={setSessionActive}
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
          <div className="flex-1 overflow-y-auto no-scrollbar bg-white/40 dark:bg-white/5 rounded-5xl p-6">
            {view === 'dashboard' && <ProductList products={products} addToCart={addToCart} />}
            {view === 'setup' && (
              <div className="space-y-6">
                <AppearanceSettings theme={theme} setTheme={setTheme} isSoundEnabled={isSoundEnabled} setIsSoundEnabled={setIsSoundEnabled} />
                <OrderSettings orderMode={orderMode} setOrderMode={setOrderMode} />
                <PrintProfiles />
              </div>
            )}
            {view === 'config' && <ProductConfig />}
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

      {/* Modali */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[2000]">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-5xl shadow-2xl w-96 text-center border border-white/10">
            <h2 className="text-2xl font-black mb-6">Sei sicuro?</h2>
            <div className="flex justify-center gap-4">
              <button onClick={performLogout} className="px-8 py-3 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/30">LOGOUT</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="px-8 py-3 bg-gray-200 dark:bg-gray-700 rounded-2xl font-bold">ANNULLA</button>
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