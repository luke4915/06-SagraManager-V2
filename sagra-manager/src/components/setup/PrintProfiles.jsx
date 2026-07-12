import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical, Wifi, Usb, Pencil, Trash2, Plus, X, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;
const BACKEND_TEMPLATES = ['Cliente', 'Associazione', 'Cucina', 'Ritiro Bar', 'Ritiro Gastronomia', 'Numeretto'];

const PrintProfiles = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [settings, setSettings] = useState([]);
  const [usbPrinters, setUsbPrinters] = useState([]);
  const [copyTypes, setCopyTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | 'new' | { id, name, label }
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── Drag & drop via Pointer Events ─────────────────────────────
  // A differenza dell'HTML5 Drag&Drop (draggable/onDragStart/onDrop),
  // i Pointer Events funzionano in modo identico con mouse, touch e penna:
  // niente comportamento inconsistente su tablet/smartphone.
  const itemRefs = useRef(new Map());
  const dragInfo = useRef(null); // { id, pointerId, lastY }
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, ctRes] = await Promise.all([
        fetch(`${API_URL}/print-settings`, { credentials: 'include' }),
        fetch(`${API_URL}/printers`, { credentials: 'include' }),
        fetch(`${API_URL}/print-settings/copy-types`, { credentials: 'include' }),
      ]);
      if (sRes.ok) setSettings(await sRes.json());
      if (pRes.ok) setUsbPrinters((await pRes.json()) || []);
      if (ctRes.ok) setCopyTypes(await ctRes.json());
    } catch (err) {
      setError('Errore caricamento impostazioni');
    } finally {
      setLoading(false);
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

  const persistOrder = useCallback(async (newSettings) => {
    const originalSettings = settingsRef.current;
    try {
      const res = await fetch(`${API_URL}/print-settings/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order: newSettings.map(s => s.id) }),
      });
      if (!res.ok) throw new Error('Errore nel salvataggio del nuovo ordine');
    } catch (err) {
      setError(err.message);
      setSettings(originalSettings); // rollback in caso di errore di rete
    }
  }, []);

  // ─── Pointer handlers (maniglia = unico punto di innesco) ───────
  const handlePointerDown = (id) => (e) => {
    if (!isAdmin) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    dragInfo.current = { id, pointerId: e.pointerId, lastY: e.clientY };
    setDraggingId(id);
    setDragOffset(0);
  };

  const handlePointerMove = (e) => {
    if (!dragInfo.current || dragInfo.current.id == null) return;
    const { id, lastY } = dragInfo.current;
    const deltaY = e.clientY - lastY;
    setDragOffset(prev => prev + deltaY);
    dragInfo.current.lastY = e.clientY;

    const current = settingsRef.current;
    const currentIndex = current.findIndex(s => s.id === id);
    const draggedEl = itemRefs.current.get(id);
    if (currentIndex === -1 || !draggedEl) return;

    let targetIndex = currentIndex;
    current.forEach((s, idx) => {
      if (s.id === id) return;
      const el = itemRefs.current.get(s.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      if (idx < currentIndex && e.clientY < center) targetIndex = Math.min(targetIndex, idx);
      if (idx > currentIndex && e.clientY > center) targetIndex = Math.max(targetIndex, idx);
    });

    if (targetIndex !== currentIndex) {
      setSettings(prev => {
        const arr = [...prev];
        const [moved] = arr.splice(currentIndex, 1);
        arr.splice(targetIndex, 0, moved);
        return arr;
      });
    }
  };

  const handlePointerUp = () => {
    if (!dragInfo.current) return;
    dragInfo.current = null;
    setDraggingId(null);
    setDragOffset(0);
    persistOrder(settingsRef.current);
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

  const availableTemplates = BACKEND_TEMPLATES.filter(
    t => !copyTypes.some(ct => ct.name === t)
  );

  return (
    <div className="mt-6 p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Impostazioni di stampa
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            {isAdmin ? 'Tieni premuta la maniglia e trascina per definire l\'ordine di stampa.' : 'Configurazione gestita dall\'amministratore.'}
          </p>
        </div>
        {isAdmin && availableTemplates.length > 0 && (
          <button
            onClick={() => setModal('new')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[var(--accent)] text-white font-bold hover:bg-[var(--accent-hover)] transition"
          >
            <Plus size={14} /> Tipo copia
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 hover:opacity-70"><X size={13} /></button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] mt-6">Caricamento...</p>
      ) : settings.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] mt-6">
          Nessun tipo di copia configurato.{isAdmin ? ' Aggiungine uno.' : ''}
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-2.5">
          {settings.map((s, index) => {
            const isDragging = draggingId === s.id;
            return (
              <div
                key={s.id}
                ref={el => { if (el) itemRefs.current.set(s.id, el); else itemRefs.current.delete(s.id); }}
                style={isDragging ? {
                  transform: `translateY(${dragOffset}px)`,
                  zIndex: 20,
                  boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
                } : undefined}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-2xl border transition-colors
                  ${isDragging ? 'border-[var(--accent)] bg-[var(--bg-card)] scale-[1.01]' : 'border-[var(--border)] bg-[var(--bg-card-2)]'}`}
              >
                {/* Maniglia + posizione + nome */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isAdmin && (
                    <button
                      type="button"
                      aria-label="Trascina per riordinare"
                      onPointerDown={handlePointerDown(s.id)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      style={{ touchAction: 'none' }}
                      className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] border border-transparent select-none
                        ${isDragging ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)] cursor-grabbing' : 'hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] cursor-grab'}`}
                    >
                      <GripVertical size={18} />
                    </button>
                  )}
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-[11px] font-black">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-black text-xs uppercase tracking-tight text-[var(--text-main)] truncate">
                      {s.copy_type_label}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{s.copy_type_name}</p>
                  </div>
                </div>

                {/* Connessione stampante */}
                <div className={`flex flex-wrap items-center gap-2 sm:flex-1 transition-opacity ${!s.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-0.5 shrink-0">
                    <button
                      disabled={!isAdmin || saving === s.id}
                      onClick={() => updateSetting(s.id, { printer_type: 'network', printer_address: '' })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${s.printer_type === 'network' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'}`}
                    >
                      <Wifi size={12} /> Rete
                    </button>
                    <button
                      disabled={!isAdmin || saving === s.id}
                      onClick={() => updateSetting(s.id, { printer_type: 'usb', printer_address: '' })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${s.printer_type === 'usb' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'}`}
                    >
                      <Usb size={12} /> USB
                    </button>
                  </div>

                  {s.printer_type === 'network' ? (
                    <input
                      type="text"
                      placeholder="192.168.1.100:9100"
                      value={s.printer_address || ''}
                      disabled={!isAdmin || saving === s.id}
                      onChange={e => setSettings(prev => prev.map(x => x.id === s.id ? { ...x, printer_address: e.target.value } : x))}
                      onBlur={e => updateSetting(s.id, { printer_address: e.target.value })}
                      className="flex-1 min-w-[150px] px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-xs outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={s.printer_address || ''}
                      disabled={!isAdmin || saving === s.id}
                      onChange={e => updateSetting(s.id, { printer_address: e.target.value })}
                      className="flex-1 min-w-[150px] px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-xs outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed"
                    >
                      <option value="">Seleziona stampante USB</option>
                      {usbPrinters.map(p => (
                        <option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' (default)' : ''}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Azioni + toggle */}
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  {saving === s.id && <span className="text-[10px] text-[var(--text-muted)]">Salvataggio...</span>}
                  {isAdmin && (
                    <>
                      <button onClick={() => setModal({ id: s.copy_type_id, name: s.copy_type_name, label: s.copy_type_label })}
                        title="Rinomina"
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete(s.copy_type_id)}
                        title="Elimina"
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  <label className={`relative inline-flex items-center ${!isAdmin ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    <input type="checkbox" className="sr-only peer"
                      checked={s.enabled}
                      disabled={!isAdmin || saving === s.id}
                      onChange={e => updateSetting(s.id, { enabled: e.target.checked })}
                    />
                    <div className="w-10 h-5.5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-[var(--accent)] transition"></div>
                    <div className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full shadow transform peer-checked:translate-x-4 transition"></div>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale nuovo/modifica tipo copia */}
      {modal && (
        <CopyTypeModal
          initial={modal === 'new' ? null : modal}
          templatesOptions={modal === 'new' ? availableTemplates : BACKEND_TEMPLATES}
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

const CopyTypeModal = ({ initial, templatesOptions, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [label, setLabel] = useState(initial?.label || '');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-xl p-6 w-full max-w-sm border border-[var(--border)]">
        <h3 className="font-black text-sm uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
          <Printer size={14} /> {initial ? 'Modifica tipo copia' : 'Nuovo tipo copia'}
        </h3>
        <div className="flex flex-col gap-3">
          <div>
            <select
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!!initial}
            >
              <option value="">Seleziona template...</option>
              {templatesOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Etichetta UI <span className="font-normal opacity-60">(es. Copia Associazione)</span></label>
            <input className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={label} onChange={e => setLabel(e.target.value)} placeholder="Copia Associazione" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[var(--bg-card-2)] text-[var(--text-main)] text-sm">Annulla</button>
          <button onClick={() => onSave({ name: name.trim(), label: label.trim() })}
            disabled={!name.trim() || !label.trim()}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-bold disabled:opacity-50">Salva</button>
        </div>
      </div>
    </div>
  );
};

export default PrintProfiles;