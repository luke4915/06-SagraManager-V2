import React, { useEffect, useState } from 'react';
import { Home, Settings, Edit3, UtensilsCrossed, BarChart, Play, Square } from 'lucide-react';
import Toast from './Toast';

const Sidebar = ({
  view,
  setView,
  isOpen,
  toggleSidebar,
  sessionActive,
  setSessionActive,
  sessionName,
  setSessionName
}) => {

  const [showSessionPopup, setShowSessionPopup] = useState(false);
  const [sessionInput, setSessionInput] = useState("");   // ← input temporaneo
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const menuItems = [
    { name: 'Dashboard', key: 'dashboard', icon: <Home size={18} /> },
    { name: 'Setup', key: 'setup', icon: <Settings size={18} /> },
    { name: 'Configurazione', key: 'config', icon: <Edit3 size={18} /> },
    { name: 'Cucina', key: 'kitchen', icon: <UtensilsCrossed size={18} /> },
    { name: 'Statistiche', key: 'statistics', icon: <BarChart size={18} /> },
  ];

  const startSession = () => {
    setShowSessionPopup(true);
  };

  const confirmStartSession = async () => {
    if (!sessionInput.trim()) {
      showToast("Inserisci il nome della serata", "error");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionInput })
      });

      if (!res.ok) throw new Error('Errore avvio sessione');

      setSessionActive(true);
      setSessionName(sessionInput);        // ← aggiorna App
      showToast(`Sessione "${sessionInput}" avviata`, "success");

      setShowSessionPopup(false);
      setSessionInput("");

    } catch (err) {
      console.error(err);
      showToast("Errore avvio sessione", "error");
    }
  };

  const endSession = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sessions/end`, { method: 'POST' });
      if (!res.ok) throw new Error('Errore termine sessione');

      setSessionActive(false);
      setSessionName("");                // ← reset del nome

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Carica sessione attuale dal backend
    const checkSession = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/sessions/latest`);
        const data = await res.json();

        const active = !!data?.start_time && !data?.end_time;
        setSessionActive(active);
        setSessionName(active ? data.name : "");

      } catch (err) {
        console.error(err);
      }
    };

    checkSession();
  }, []);

  return (
    <>
      <div
        className={`
          fixed z-50 left-0 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          border border-gray-300 dark:border-gray-700 p-6 flex flex-col rounded-2xl shadow-md mt-4 mb-4
          h-[calc(100vh-2rem)] transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <nav className="flex flex-col space-y-3">
          {menuItems.map(item => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors duration-200
                ${view === item.key ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            >
              {item.icon}
              {item.name}
            </button>
          ))}
        </nav>

        {/* Pulsanti sessione */}
        <div className="mt-auto flex gap-2">
          <button
            onClick={startSession}
            disabled={sessionActive}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-white
              ${sessionActive ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
          >
            <Play size={16} /> Inizia
          </button>

          <button
            onClick={endSession}
            disabled={!sessionActive}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-white
              ${!sessionActive ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
          >
            <Square size={16} /> Termina
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Popup avvio sessione */}
      {showSessionPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Avvia Sessione</h2>

            <input
              type="text"
              placeholder="Nome sessione"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg w-full mb-4"
            />

            <div className="flex justify-between">
              <button
                onClick={confirmStartSession}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Avvia
              </button>

              <button
                onClick={() => setShowSessionPopup(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
