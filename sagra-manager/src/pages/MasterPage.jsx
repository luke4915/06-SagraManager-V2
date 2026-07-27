import { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../config/api';
const MasterPage = () => {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenants, setTenants] = useState([]);

  const [form, setForm] = useState({ slug: '', name: '', plan: 'trial', expiresInDays: 7, adminUsername: '' });
  const [creating, setCreating] = useState(false);

  const loadTenants = useCallback(async () => {
    const res = await fetch(`${API_URL}/master/tenants`, { credentials: 'include' });
    if (res.status === 401) { setAuthed(false); return; }
    setTenants(await res.json());
  }, []);

  useEffect(() => { if (authed) loadTenants(); }, [authed, loadTenants]);

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/master/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore login');
      setAuthed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    setCreating(true); setError('');
    try {
      const res = await fetch(`${API_URL}/master/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore creazione tenant');
      setForm({ slug: '', name: '', plan: 'trial', expiresInDays: 7, adminUsername: '' });
      loadTenants();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const inputClass = "p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] focus:ring-2 focus:ring-[var(--accent)] outline-none placeholder:text-[var(--text-muted)]";

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-main)]">
        <h1 className="text-2xl font-black mb-6 text-[var(--text-main)]">Master Panel</h1>
        <div className="flex flex-col gap-4 w-80">
          <input
            type="password"
            placeholder="Password master"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className={inputClass}
          />
          {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[var(--accent)]/30 transition-all ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Accesso..." : "Entra"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-8">
      <h1 className="text-2xl font-black mb-6 text-[var(--text-main)]">Master Panel — Tenant</h1>

      <div className="bg-[var(--bg-card)] rounded-2xl p-5 mb-8 border border-[var(--border)] max-w-2xl">
        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">Nuovo tenant</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input placeholder="slug (es. prova)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputClass} />
          <input placeholder="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
          <input placeholder="Piano" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} className={inputClass} />
          <input type="number" placeholder="Giorni licenza" value={form.expiresInDays} onChange={e => setForm(f => ({ ...f, expiresInDays: Number(e.target.value) }))} className={inputClass} />
          <input placeholder="Username admin" value={form.adminUsername} onChange={e => setForm(f => ({ ...f, adminUsername: e.target.value }))} className={`${inputClass} col-span-2`} />
        </div>
        {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest mb-3">{error}</p>}
        <button
          onClick={handleCreateTenant}
          disabled={creating}
          className={`px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all ${creating ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {creating ? "Creazione..." : "Crea tenant"}
        </button>
      </div>

      <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Tenant esistenti</h2>
      <div className="space-y-2 max-w-2xl">
        {tenants.map(t => (
          <div key={t.id} className="flex justify-between items-center p-4 bg-[var(--bg-card-2)] rounded-xl border border-[var(--border)]">
            <div>
              <span className="font-black text-sm text-[var(--text-main)]">{t.name}</span>
              <span className="text-xs text-[var(--text-muted)] ml-2">({t.slug})</span>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {t.plan} · {t.user_count} utenti · {t.expires_at ? `scade ${new Date(t.expires_at).toLocaleDateString()}` : 'nessuna scadenza'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasterPage;
