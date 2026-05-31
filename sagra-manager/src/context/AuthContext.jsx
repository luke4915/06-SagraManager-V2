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
        });
        if (!res.ok) {
          // Token scaduto e refresh fallito → logout forzato
          setUser(null);
          clearInterval(refreshTimer.current);
        }
      } catch {
        console.warn('Refresh token fallito — connessione assente?');
      }
    }, REFRESH_INTERVAL_MS);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          setUser(await res.json());
          startRefreshTimer();
        }
      } catch (err) {
        console.error('Sessione non valida o scaduta');
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
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch { }
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
