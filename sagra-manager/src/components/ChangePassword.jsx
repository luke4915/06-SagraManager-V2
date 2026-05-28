import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const ChangePassword = ({ onPasswordChanged }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!newPassword.trim()) return showToast("Inserisci la nuova password", "error");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, { credentials: 'include', 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id, oldPassword: '', newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore cambio password");
      showToast("Password impostata", "success");
      onPasswordChanged();
    } catch (err) {
      showToast(err.message || "Errore durante il cambio password", "error");
    } finally {
      setLoading(false);
      setNewPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-main)]">
      <div className="bg-[var(--bg-card)] p-10 rounded-3xl shadow-xl border border-[var(--border)] w-full max-w-sm space-y-5">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-[var(--text-main)]">Imposta password</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Scegli una password per il tuo account</p>
        </div>
        <input
          type="password"
          placeholder="Nuova password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleChange()}
          className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          onClick={handleChange}
          disabled={loading}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
        >
          {loading ? "Salvataggio..." : "Imposta Password"}
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;