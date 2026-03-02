import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Fondamentale per evitare il "flicker" del login

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/me`, {
                    credentials: "include" // ✅ Fondamentale per inviare il cookie
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                }
            } catch (err) {
                console.error("Sessione non valida o scaduta");
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = (userData) => setUser(userData);
    const logout = () => {
        // Qui andrebbe anche una chiamata al backend per cancellare il cookie
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);