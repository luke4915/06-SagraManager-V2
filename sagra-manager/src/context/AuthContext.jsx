import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL;
const AuthContext = createContext();

// Refresh silenzioso ogni 6h — il token dura 8h quindi c'è sempre margine
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const startRefreshTimer = () => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          // Token scaduto, cookie non valido o refresh fallito → logout forzato sicuro
          setUser(null);
          if (refreshTimer.current) clearInterval(refreshTimer.current);
        }
      } catch (err) {
        console.warn('Refresh token fallito — backend non raggiungibile o sessione assente?', err);
      }
    }, REFRESH_INTERVAL_MS);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          startRefreshTimer();
        } else {
          // Se lo status non è 200 (es: 401 Unauthorized), azzeriamo l'utente locale
          setUser(null);
        }
      } catch (err) {
        console.error('Sessione non valida, scaduta o server HTTPS non in ascolto', err);
        setUser(null); // 🔴 SICUREZZA: Forza lo stato vuoto se il server risponde picche o è offline
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, []);

  const login = (userData) => {
    setUser(userData);
    startRefreshTimer();
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.warn('Chiamata di logout al server fallita, pulizia stato locale in corso...', err);
    }
    // Pulizia immediata e aggressiva dello stato locale (UX istantanea per l'operatore)
    setUser(null);
    if (refreshTimer.current) clearInterval(refreshTimer.current);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);