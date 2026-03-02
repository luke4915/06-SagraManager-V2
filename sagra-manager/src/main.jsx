import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Importiamo i Provider che gestiscono lo stato globale
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

const root = createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <AuthProvider>
            <ToastProvider>
                <App />
            </ToastProvider>
        </AuthProvider>
    </React.StrictMode>
);