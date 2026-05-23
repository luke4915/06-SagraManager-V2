import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const UserProfile = ({ user, onClose, showToast, setCurrentUser }) => {
  const [username, setUsername] = useState(user.username);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 🔹 Stato per creazione nuovo utente
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async () => {
    try {
      // 1️⃣ AGGIORNAMENTO USERNAME
      if (username !== user.username) {
        const res = await fetch(`${API_URL}/profile/username`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // ✅ Fondamentale per i cookie
          body: JSON.stringify({
            // userId non serve passarlo nel body se il backend lo prende dal token (req.user.id)
            newUsername: username,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore aggiornamento username");

        setCurrentUser(prev => ({ ...prev, username }));
      }

      // 2️⃣ AGGIORNAMENTO PASSWORD
      if (newPassword) {
        if (!oldPassword) {
          showToast("Inserisci la vecchia password!", "error");
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast("Le nuove password non coincidono!", "error");
          return;
        }

        // ❌ RIMOSSO: const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/auth/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // ✅ Fondamentale per i cookie
          body: JSON.stringify({
            userId: user.id,
            oldPassword,
            newPassword,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore aggiornamento password");
      }

      showToast("Profilo aggiornato con successo!", "success");
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  };

  // 🔹 Crea nuovo utente (solo admin)
  const handleCreateUser = async () => {
    if (!newUserName) {
      showToast("Inserisci un nome utente!", "error");
      return;
    }
    setIsCreating(true);
    try {
      // ❌ RIMOSSO: const token = localStorage.getItem('token'); 

      const res = await fetch(`${API_URL}/auth/admin/createUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // ❌ RIMOSSO: "Authorization": `Bearer ${token}`,
        },
        // ✅ AGGIUNTO: permette l'invio automatico del cookie 'token'
        credentials: "include",
        body: JSON.stringify({
          username: newUserName,
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore creazione utente");

      showToast(`Utente "${data.user.username}" creato con successo`, "success");
      setNewUserName('');
      setShowCreateUser(false);
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-[var(--bg-card)] p-8 rounded-3xl shadow-2xl w-full max-w-md border border-[var(--border)]">
        <h2 className="text-2xl font-black tracking-tighter text-[var(--text-main)] mb-6">
          Gestione Profilo
        </h2>

        {/* Username */}
        <div className="mb-3">
          <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Nome utente</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Vecchia password */}
        <div className="mb-3">
          <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Vecchia password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Nuova password */}
        <div className="mb-3">
          <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Nuova password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Conferma nuova password */}
        <div className="mb-4">
          <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Conferma nuova password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Crea nuovo utente (solo admin) */}
        {user.role === 'admin' && (
          <button
            onClick={() => setShowCreateUser(true)}
            className="w-full mb-3 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all"
          >
            Crea nuovo utente
          </button>
        )}

        {showCreateUser && (
          <div className="border-t border-[var(--border)] pt-4 mt-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-[var(--text-muted)] mb-3">Nuovo utente</h3>
            <input
              type="text"
              placeholder="Username"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500 mb-2"
            />
            <select
              value={newUserRole}
              onChange={e => setNewUserRole(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500 mb-3"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex justify-between">
              <button
                onClick={handleCreateUser}
                disabled={isCreating}
                className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                {isCreating ? 'Creazione...' : 'Crea'}
              </button>
              <button
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2.5 bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-main)] rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* --- BOTTONI FINALI --- */}
        {!showCreateUser && (
          <div className="flex justify-between mt-6 gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all"
            >
              Salva
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-[var(--bg-card-2)] border border-[var(--border)] text-[var(--text-main)] rounded-xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
