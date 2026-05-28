import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;
const TEMPLATES = ['Cliente', 'Cucina', 'Ritiro Bar', 'Ritiro Gastronomia'];


const PrintProfiles = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [settings, setSettings] = useState([]);
  const [usbPrinters, setUsbPrinters] = useState([]);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | 'new' | { id, name, label }
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`${API_URL}/print-settings`, { credentials: 'include' }),
        fetch(`${API_URL}/printers`, { credentials: 'include' }),
      ]);
      if (sRes.ok) setSettings(await sRes.json());
      if (pRes.ok) setUsbPrinters((await pRes.json()) || []);
    } catch (err) {
      setError('Errore caricamento impostazioni');
    }
  };

  const updateSetting = async (id, patch) => {
    setSaving(id);
    setError(null);
    const current = settings.find(s => s.id === id);
    const updated = { ...current, ...patch };
    try {
      const res = await fetch(`${API_URL}/print-settings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ printer_type: updated.printer_type, printer_address: updated.printer_address, enabled: updated.enabled }),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      const saved = await res.json();
      setSettings(prev => prev.map(s => s.id === id ? { ...s, ...saved } : s));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const createCopyType = async ({ name, label }) => {
    try {
      const res = await fetch(`${API_URL}/print-settings/copy-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, label }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore creazione');
      setModal(null);
      await fetchAll();
    } catch (err) { setError(err.message); }
  };

  const editCopyType = async ({ name, label }) => {
    try {
      const res = await fetch(`${API_URL}/print-settings/copy-types/${modal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, label }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore modifica');
      setModal(null);
      await fetchAll();
    } catch (err) { setError(err.message); }
  };

  const deleteCopyType = async (id) => {
    try {
      const res = await fetch(`${API_URL}/print-settings/copy-types/${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) throw new Error('Errore eliminazione');
      setConfirmDelete(null);
      await fetchAll();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="mt-6 p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          Impostazioni di stampa
        </h2>
        {isAdmin && (
          <button
            onClick={() => setModal('new')}
            className="px-3 py-1.5 text-xs rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition"
          >
            + Tipo copia
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {settings.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nessun tipo di copia configurato.{isAdmin ? ' Aggiungine uno.' : ''}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.map(s => (
            <div key={s.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--bg-card-2)] border border-[var(--border)]">

              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-black text-sm uppercase tracking-tight text-[var(--text-main)]">
                    {s.copy_type_label}
                  </span>
                  <span className="ml-2 text-[10px] text-[var(--text-muted)]">({s.copy_type_name})</span>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <>
                      <button onClick={() => setModal({ id: s.copy_type_id, name: s.copy_type_name, label: s.copy_type_label })}
                        className="text-xs text-orange-400 hover:underline">Rinomina</button>
                      <button onClick={() => setConfirmDelete(s.copy_type_id)}
                        className="text-xs text-red-400 hover:underline">Elimina</button>
                    </>
                  )}
                  {/* Toggle */}
                  <label className={`relative inline-flex items-center ${!isAdmin ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    <input type="checkbox" className="sr-only peer"
                      checked={s.enabled}
                      disabled={!isAdmin || saving === s.id}
                      onChange={e => updateSetting(s.id, { enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-orange-500 transition"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition"></div>
                  </label>
                </div>
              </div>

              {/* Tipo connessione + indirizzo */}
              <div className={`flex flex-col gap-2 transition-opacity ${!s.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex gap-4">
                  {['network', 'usb'].map(type => (
                    <label key={type} className={`flex items-center gap-1.5 text-xs ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}>
                      <input type="radio" name={`type-${s.id}`} value={type}
                        checked={s.printer_type === type}
                        disabled={!isAdmin || saving === s.id}
                        onChange={() => updateSetting(s.id, { printer_type: type, printer_address: '' })}
                        className="accent-orange-500"
                      />
                      <span className="text-[var(--text-main)]">{type === 'network' ? 'Rete (IP)' : 'USB'}</span>
                    </label>
                  ))}
                </div>

                {s.printer_type === 'network' ? (
                  <input
                    type="text"
                    placeholder="192.168.1.100:9100"
                    value={s.printer_address || ''}
                    disabled={!isAdmin || saving === s.id}
                    onChange={e => setSettings(prev => prev.map(x => x.id === s.id ? { ...x, printer_address: e.target.value } : x))}
                    onBlur={e => updateSetting(s.id, { printer_address: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={s.printer_address || ''}
                    disabled={!isAdmin || saving === s.id}
                    onChange={e => updateSetting(s.id, { printer_address: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleziona stampante USB</option>
                    {usbPrinters.map(p => (
                      <option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' (default)' : ''}</option>
                    ))}
                  </select>
                )}
                {saving === s.id && <span className="text-xs text-[var(--text-muted)]">Salvataggio...</span>}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modale nuovo/modifica tipo copia */}
      {modal && (
        <CopyTypeModal
          initial={modal === 'new' ? null : modal}
          onSave={modal === 'new' ? createCopyType : editCopyType}
          onClose={() => setModal(null)}
        />
      )}

      {/* Conferma eliminazione */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl p-6 w-full max-w-sm text-center border border-[var(--border)]">
            <p className="text-[var(--text-main)] mb-2 font-bold">Eliminare questo tipo di copia?</p>
            <p className="text-xs text-[var(--text-muted)] mb-6">Tutte le impostazioni associate verranno perse.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-card-2)] text-[var(--text-main)] text-sm">Annulla</button>
              <button onClick={() => deleteCopyType(confirmDelete)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CopyTypeModal = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [label, setLabel] = useState(initial?.label || '');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl p-6 w-full max-w-sm border border-[var(--border)]">
        <h3 className="font-black text-sm uppercase tracking-widest text-[var(--text-muted)] mb-4">
          {initial ? 'Modifica tipo copia' : 'Nuovo tipo copia'}
        </h3>
        <div className="flex flex-col gap-3">
          <div>
            <select
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!!initial}
            >
              <option value="">Seleziona template...</option>
              {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Etichetta UI <span className="font-normal opacity-60">(es. Copia Cucina)</span></label>
            <input className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={label} onChange={e => setLabel(e.target.value)} placeholder="Copia Cucina" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[var(--bg-card-2)] text-[var(--text-main)] text-sm">Annulla</button>
          <button onClick={() => onSave({ name: name.trim(), label: label.trim() })}
            disabled={!name.trim() || !label.trim()}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-50">Salva</button>
        </div>
      </div>
    </div>
  );
};

export default PrintProfiles;
