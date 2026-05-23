import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const UserProfile = ({ user, onClose, showToast, setCurrentUser }) => {
  const [username, setUsername] = useState(user.username);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async () => {
    try {
      if (username !== user.username) {
        const res = await fetch(`${API_URL}/profile/username`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ newUsername: username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore aggiornamento username");
        setCurrentUser(prev => ({ ...prev, username }));
      }

      if (newPassword) {
        if (!oldPassword) {
          showToast("Inserisci la vecchia password!", "error");
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast("Le nuove password non coincidono!", "error");
          return;
        }

        const res = await fetch(`${API_URL}/auth/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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

  const handleCreateUser = async () => {
    if (!newUserName) {
      showToast("Inserisci un nome utente!", "error");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch(`${API_URL}/auth/admin/createUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-[#1c1f26] border border-gray-100 dark:border-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-sm transform transition-all duration-200">
        <div className="mb-6">
          <h2 className="text-xl font-black tracking-tighter text-gray-900 dark:text-gray-50 uppercase">Gestione Profilo</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Aggiorna credenziali o aggiungi staff</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">Nome utente</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium outline-none text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">Vecchia password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium outline-none text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">Nuova password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium outline-none text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">Conferma nuova password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium outline-none text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {user.role === 'admin' && !showCreateUser && (
          <button
            onClick={() => setShowCreateUser(true)}
            className="w-full mt-5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-md shadow-emerald-600/10"
          >
            Crea nuovo utente
          </button>
        )}

        {showCreateUser && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Nuovo utente staff</h3>
            <input
              type="text"
              placeholder="Username"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium outline-none text-gray-900 dark:text-gray-100"
            />
            <select
              value={newUserRole}
              onChange={e => setNewUserRole(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium outline-none text-gray-900 dark:text-gray-100"
            >
              <option value="user">User (Cassa)</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreateUser}
                disabled={isCreating}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creazione...' : 'Conferma'}
              </button>
              <button
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {!showCreateUser && (
          <div className="flex gap-2 mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-md shadow-indigo-500/10"
            >
              Salva
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
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