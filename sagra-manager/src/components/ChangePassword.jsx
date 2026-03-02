import { useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL;

const ChangePassword = ({ user, showToast, onPasswordChanged }) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!newPassword) return showToast("Inserisci la nuova password", "error");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, oldPassword: '', newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore cambio password");
      showToast("Password cambiata con successo!", "success");
      onPasswordChanged();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Errore durante il cambio password", "error");
    } finally {
      setLoading(false);
      setNewPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-80 p-4 border rounded space-y-4 bg-white">
        <h2 className="text-lg font-semibold">Imposta la tua password</h2>
        <input type="password" placeholder="Nuova password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded" />
        <button onClick={handleChange} disabled={loading} className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded font-semibold transition-all">
          {loading ? "Caricamento..." : "Imposta Password"}
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;
