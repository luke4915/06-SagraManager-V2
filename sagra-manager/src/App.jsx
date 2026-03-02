import React, { useState, useEffect, useRef } from 'react';

// Hooks dai Context (Assicurati che i percorsi siano corretti)
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';

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
  // --- STATI GLOBALI (da Context) ---
  const { user, loading, login, logout } = useAuth();
  const { showToast } = useToast();

  // --- STATI LOCALI (Mantenuti) ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showReversePopup, setShowReversePopup] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const ws = useRef(null);

  const [theme, setTheme] = useState('dark');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [orderMode, setOrderMode] = useState("simple");

  // 1️⃣ CONTROLLO SESSIONE ATTIVA (Persistenza lato business)
  useEffect(() => {
    if (loading || !user) return; // Esegui solo se loggato
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_URL}/sessions/latest`);
        const data = await res.json();
        if (data && !data.end_time) {
          setSessionActive(true);
          setSessionName(data.name);
        }
      } catch (err) {
        console.error("Errore check sessione:", err);
      }
    };
    checkSession();
  }, [user, loading]);

  // 2️⃣ CARICAMENTO PRODOTTI
  useEffect(() => {
    if (loading || !user) return;
    fetch(`${API_URL}/products`)
      .then(res => res.json())
      .then(data => setProducts(data.map(p => ({ ...p, price: parseFloat(p.price) }))))
      .catch(err => console.error("Errore fetch prodotti:", err));
  }, [user, loading]);

  // 3️⃣ GESTIONE WEBSOCKET
  useEffect(() => {
    if (loading || !user) return; // 🛡️ Evita connessioni WS se non c'è utente o sta caricando

    ws.current = new WebSocket(WS_URL);

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "product_updated":
            setProducts(prev => prev.map(p =>
              p.id === msg.product.id ? { ...msg.product, price: parseFloat(msg.product.price) } : p
            ));
            showToast(`Prodotto "${msg.product.name}" aggiornato!`, "success");
            break;
          case "product_created":
            setProducts(prev => [...prev, { ...msg.product, price: parseFloat(msg.product.price) }]);
            showToast(`Nuovo prodotto "${msg.product.name}" aggiunto!`, "success");
            break;
          case "product_deleted":
            setProducts(prev => prev.filter(p => p.id !== msg.id));
            showToast(`Prodotto rimosso!`, "warning");
            break;
          default: break;
        }
      } catch (err) { console.error("Errore parsing WS:", err); }
    };

    ws.current.onerror = (err) => console.error("WS Error App.jsx:", err);

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user, loading]); // 🔄 Fondamentale per pulire/riaprire al login/logout

  // 4️⃣ LOGICA CARRELLO & ORDINI
  useEffect(() => setTotal(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)), [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };
  const clearCart = () => setCart([]);
  const removeFromCart = (product) => setCart(prev => prev.filter(i => i.id !== product.id));
  const removeLastItem = (product) => setCart(prev =>
    prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity - 1 } : i)
      .filter(i => i.quantity > 0)
  );

  const sendOrder = async () => {
    if (cart.length === 0) return showToast("Carrello vuoto!", "error");
    try {
      const orderPayload = {
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          note: item.note || ""
        })),
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

      if (!res.ok) throw new Error("Errore invio ordine");

      clearCart();
      showToast("Ordine inviato e stampa avviata!", "success");
    } catch (err) {
      showToast(err.message || "Errore durante l'invio ordine!", "error");
    }
  };

  // 5️⃣ GESTIONE ACCESSI
  const handleLoginSuccess = (userData) => {
    login(userData); // Aggiorna il contesto globale
    if (userData.needsPassword) setNeedsPasswordChange(true);
    else setView(userData.role === 'cucina' ? 'kitchen' : 'dashboard');
  };

  // In App.jsx
  const performLogout = async () => {
    console.log("1. Inizio procedura logout...");

    // 🛡️ NON chiudere subito il modale, aspetta che la fetch sia almeno partita
    try {
      if (logout) {
        console.log("2. Chiamata al context in corso...");
        await logout(); // Questo ora contiene la fetch al server
        console.log("3. Server ha risposto o timeout raggiunto");
      }
    } catch (err) {
      console.error("Errore durante il logout:", err);
    } finally {
      // 🧹 Chiudiamo il modale e puliamo i messaggi solo alla fine
      setShowLogoutConfirm(false);
      showToast("Sessione chiusa correttamente", "info");
    }
  };

  const handlePasswordChanged = () => {
    setNeedsPasswordChange(false);
    setView(user.role === 'cucina' ? 'kitchen' : 'dashboard');
  };

  // --- RENDERING CONDIZIONALE ---
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mr-3"></div>
      Caricamento SagraManager...
    </div>
  );

  if (!user) return <Login onLogin={handleLoginSuccess} />;
  if (needsPasswordChange) return <ChangePassword user={user} onPasswordChanged={handlePasswordChanged} />;

  return (
    <div className={`flex h-screen transition-colors duration-500 ease-in-out ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>

      <Sidebar
        view={view} setView={setView}
        isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentUser={user}
        sessionActive={sessionActive} setSessionActive={setSessionActive}
        sessionName={sessionName} setSessionName={setSessionName}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'} flex flex-col p-4`}>
        <Header
          title="Sagra Manager"
          sessionName={sessionName}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          currentUser={user}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          onProfileClick={() => setShowProfilePopup(true)}
        />

        {view === 'dashboard' && user.role !== 'cucina' && (
          <div className="flex flex-col md:flex-row gap-6 relative flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <ProductList products={products} addToCart={addToCart} />
            </div>
            <div className="w-full md:w-96 flex-shrink-0 flex flex-col space-y-2 mt-2">
              <Cart
                cart={cart} setCart={setCart} total={total}
                addToCart={addToCart} removeFromCart={removeFromCart}
                removeLastItem={removeLastItem} clearCart={clearCart}
                sendOrder={sendOrder} showRemoveButtons={true}
                sessionActive={sessionActive}
              >
                <button
                  onClick={() => setShowReversePopup(true)}
                  className="w-full py-2 rounded-full bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-all shadow-md text-sm"
                >
                  Storno Ordini
                </button>
              </Cart>
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="flex flex-col gap-6">
            <AppearanceSettings theme={theme} setTheme={setTheme} />
            <OrderSettings orderMode={orderMode} setOrderMode={setOrderMode} />
            <PrintProfiles />
          </div>
        )}

        {view === 'config' && (user.role === 'cassa' || user.role === 'admin') && <ProductConfig />}
        {view === 'kitchen' && (user.role === 'cucina' || user.role === 'admin') && <OrdersKitchen />}
        {view === "statistics" && user.role === 'admin' && <Statistics />}
      </div>

      {/* MODALI & POPUP GLOBALI */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 text-center">
            <h2 className="text-lg font-bold mb-4">Confermi il logout?</h2>
            <div className="flex justify-around gap-4">
              <button
                onClick={() => performLogout()}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Logout
              </button>
              <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded">Annulla</button>
            </div>
          </div>
        </div>
      )
      }

      {showProfilePopup && <UserProfile user={user} onClose={() => setShowProfilePopup(false)} />}
      {showReversePopup && <ReverseOrder onClose={() => setShowReversePopup(false)} />}
    </div >
  );
};

export default App;