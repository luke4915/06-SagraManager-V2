import { useState, useEffect, useRef } from 'react';
import { X, Edit, Trash2, Search, Plus, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';

import { API_URL } from '../../config/api';

const Combobox = ({ name, value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes((value || '').toLowerCase()));
  const exactMatch = options.some(o => o.toLowerCase() === (value || '').trim().toLowerCase());

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        name={name}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] font-medium text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />
      {open && (filtered.length > 0 || (value?.trim() && !exactMatch)) && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg no-scrollbar">
          {filtered.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-card-2)] transition-colors cursor-pointer"
            >
              {o}
            </button>
          ))}
          {value?.trim() && !exactMatch && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 text-sm text-[var(--accent)] font-bold hover:bg-[var(--bg-card-2)] transition-colors border-t border-[var(--border)] cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} /> Crea nuovo: "{value}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ProductConfig = ({ products, setProducts }) => {
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: 0, category: '', color: '#3b82f6', visible: true });
  const [showForm, setShowForm] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Stato per gestione conflitti di categoria (stesso prodotto presente già in un'altra categoria --> WARNING)
  const [duplicateConflict, setDuplicateConflict] = useState(null);

  // Stati per la Selezione Multipla
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // MODIFICA: Aggiunto stato per filtrare solo i prodotti visibili nella dashboard principale
  const [showOnlyVisible, setShowOnlyVisible] = useState(true);

  // MODIFICA: Modificato il reset del form per la creazione: "visible" è blindato a true di default
  const openAddForm = () => {
    setEditingProduct(null);
    setFormData({ name: '', price: 0, category: '', color: '#3b82f6', visible: true, print_destination: 'both' });
    setShowForm(true);
  };

  const openEditForm = (p) => {
    setEditingProduct(p);
    setFormData({ name: p.name || '', price: p.price ?? 0, category: p.category || '', color: p.color || '#3b82f6', visible: p.visible ?? true, print_destination: p.print_destination || 'both', stock_enabled: p.stock_enabled ?? false, stock: p.stock ?? '' });
    setShowForm(true);
  };

  useEffect(() => {
    if (showForm) { const t = setTimeout(() => setPopupVisible(true), 20); return () => clearTimeout(t); }
    else setPopupVisible(false);
  }, [showForm]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'price' ? parseFloat(value) || 0 : value)
    }));
  };

  // Usato dal Combobox (categoria/nome), che non emette un vero evento input.
  // Mantiene la stessa automazione colore già presente prima.
  const setField = (name, value) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'category' && value.trim() !== '') {
        const existingProductWithSameCat = products.find(
          p => p.category && p.category.toLowerCase() === value.trim().toLowerCase()
        );
        if (existingProductWithSameCat && existingProductWithSameCat.color) {
          updated.color = existingProductWithSameCat.color;
        }
      }
      return updated;
    });
  };

  // Toggle visibilità per singolo prodotto istantaneo
  const handleToggleSingleVisibility = async (product) => {
    const updatedStatus = !product.visible;
    try {
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...product, visible: updatedStatus }),
      });
      if (!res.ok) throw new Error();

      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, visible: updatedStatus } : p));
    } catch (err) { console.error("Errore cambio visibilità", err); }
  };

  const handleSelectProduct = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkVisibilityChange = async (visibleStatus) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch(`${API_URL}/products/bulk-visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: selectedIds, visible: visibleStatus }),
      });
      if (!res.ok) throw new Error();

      setProducts(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, visible: visibleStatus } : p));
      setSelectedIds([]);
      setIsBulkMode(false);
    } catch (err) { console.error(err); }
  };

  const doSubmit = async () => {
    try {
      const res = await fetch(editingProduct ? `${API_URL}/products/${editingProduct.id}` : `${API_URL}/products`, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Errore");

      const updatedProduct = await res.json();

      if (formData.stock_enabled !== undefined) {
        const stockRes = await fetch(`${API_URL}/products/${updatedProduct.id}/stock`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            stock: formData.stock !== '' ? parseInt(formData.stock) : null,
            stock_enabled: !!formData.stock_enabled
          })
        });
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          Object.assign(updatedProduct, { stock: stockData.stock, stock_enabled: stockData.stock_enabled });
        }
      }

      const parsedProduct = { ...updatedProduct, price: parseFloat(updatedProduct.price) };

      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === parsedProduct.id ? parsedProduct : p));
      } else {
        setProducts(prev => [...prev, parsedProduct]);
      }

      setShowForm(false);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const nameNorm = formData.name.trim().toLowerCase();
    const catNorm = (formData.category || '').trim().toLowerCase();

    const exactDuplicate = products.find(p =>
      p.name.trim().toLowerCase() === nameNorm &&
      (p.category || '').trim().toLowerCase() === catNorm &&
      (!editingProduct || p.id !== editingProduct.id)
    );
    if (exactDuplicate) {
      setDuplicateConflict({ product: exactDuplicate, sameCategory: true });
      return;
    }

    const crossCategoryConflict = products.find(p =>
      p.name.trim().toLowerCase() === nameNorm &&
      (p.category || '').trim().toLowerCase() !== catNorm &&
      (!editingProduct || p.id !== editingProduct.id)
    );
    if (crossCategoryConflict) {
      setDuplicateConflict({ product: crossCategoryConflict, sameCategory: false });
      return;
    }

    doSubmit();
  };

  const useExistingCategory = () => {
    setField('category', duplicateConflict.product.category);
    setDuplicateConflict(null);
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = async () => {
    try {
      const res = await fetch(`${API_URL}/products/${deleteTarget.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();

      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Restringe i suggerimenti nome alla categoria selezionata, se esiste già;
  // altrimenti (categoria vuota o non ancora esistente) mostra tutti i prodotti.
  const productNamesForCategory = (() => {
    const catNorm = (formData.category || '').trim().toLowerCase();
    const categoryExists = categories.some(c => c.toLowerCase() === catNorm);
    const pool = catNorm && categoryExists
      ? products.filter(p => (p.category || '').trim().toLowerCase() === catNorm)
      : products;
    return [...new Set(pool.map(p => p.name).filter(Boolean))];
  })();

  // MODIFICA: Aggiornata la logica di filtraggio per includere il controllo "showOnlyVisible"
  const filteredGroups = categories
    .filter(c => filterCategory === 'all' || c === filterCategory)
    .map(c => ({
      category: c,
      items: products.filter(p =>
        p.category === c &&
        (!searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (!showOnlyVisible || p.visible !== false)
      )
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-[var(--text-main)]">MENU</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Gestione prodotti</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowOnlyVisible(!showOnlyVisible)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border cursor-pointer ${showOnlyVisible
              ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
              : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-card-2)] hover:border-gray-400'
              }`}
          >
            {showOnlyVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            {showOnlyVisible ? 'Solo Visibili' : 'Tutti i Prodotti'}
          </button>

          <button
            onClick={() => { setIsBulkMode(!isBulkMode); setSelectedIds([]); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${isBulkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-card-2)]'}`}
          >
            {isBulkMode ? 'Annulla Selezione' : 'Selezione Multipla'}
          </button>

          <button onClick={openAddForm} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer">
            <Plus size={16} /> Aggiungi
          </button>
        </div>
      </div>

      {isBulkMode && (
        <div className="flex items-center justify-between p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
          <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">{selectedIds.length} Prodotti Selezionati</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkVisibilityChange(true)}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 disabled:opacity-40 hover:bg-green-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
            >
              <Eye size={14} /> Mostra nel Listino
            </button>
            <button
              onClick={() => handleBulkVisibilityChange(false)}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 disabled:opacity-40 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
            >
              <EyeOff size={14} /> Nascondi nel Listino
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-10 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm font-bold text-[var(--text-main)] outline-none">
          <option value="all">Tutte le categorie</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
          <Search size={14} className="text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cerca prodotto" className="bg-transparent outline-none text-sm font-medium text-[var(--text-main)] w-40" />
        </div>
      </div>

      <div className="space-y-6">
        {filteredGroups.map(group => (
          <div key={group.category}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">{group.category}</p>
            <div className="space-y-2">
              {group.items.map(product => (
                <div
                  key={product.id}
                  onClick={() => isBulkMode && handleSelectProduct(product.id)}
                  className={`flex justify-between items-center p-4 bg-[var(--bg-card)] rounded-2xl border-l-4 border border-[var(--border)] transition-all ${isBulkMode ? 'cursor-pointer select-none hover:bg-[var(--bg-card-2)]' : ''} ${product.visible === false ? 'opacity-50' : ''}`}
                  style={{ borderLeftColor: product.color || '#3b82f6' }}
                >
                  <div className="flex items-center gap-4">
                    {isBulkMode && (
                      <div className="text-blue-500">
                        {selectedIds.includes(product.id) ? <CheckSquare size={20} /> : <Square size={20} className="text-gray-500" />}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm uppercase tracking-tight text-[var(--text-main)]">{product.name}</p>
                        {product.visible === false && <span className="bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider border border-red-500/20">Nascosto</span>}
                        {product.print_destination === 'bar' && <span className="bg-blue-500/10 text-blue-400 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider border border-blue-500/20">Bar</span>}
                        {product.print_destination === 'kitchen' && <span className="bg-green-500/10 text-green-400 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider border border-green-500/20">Cucina</span>}
                      </div>
                      <p className="text-xs font-bold" style={{ color: product.color || '#3b82f6' }}>{(product.price || 0).toFixed(2)} €</p>
                    </div>
                  </div>

                  {!isBulkMode && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleSingleVisibility(product)}
                        title={product.visible !== false ? "Nascondi dal menu rapido" : "Mostra nel menu rapido"}
                        className={`p-2 rounded-xl transition-colors ${product.visible !== false ? 'text-green-500 hover:bg-green-500/10' : 'text-gray-500 hover:bg-gray-500/10'}`}
                      >
                        {product.visible !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>

                      <div className="flex gap-1 border-l border-[var(--border)] pl-2">
                        <button onClick={() => openEditForm(product)} className="p-2 rounded-xl hover:bg-[var(--bg-card-2)] transition-colors"><Edit size={16} className="text-gray-500" /></button>
                        <button onClick={() => setDeleteTarget(product)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={16} className="text-red-500" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl border border-[var(--border)] transform transition-all duration-300 ${popupVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} overflow-hidden`}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-base font-black tracking-tight uppercase text-[var(--text-main)]">{editingProduct ? 'Modifica prodotto' : 'Nuovo prodotto'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-[var(--bg-card-2)] transition-colors"><X size={16} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <Combobox
                    name="category"
                    value={formData.category}
                    onChange={(v) => setField('category', v)}
                    options={categories}
                    placeholder="Categoria (es. Pizze)"
                  />
                </div>
                <div className="col-span-2">
                  <Combobox
                    name="name"
                    value={formData.name}
                    onChange={(v) => setField('name', v)}
                    options={productNamesForCategory}
                    placeholder="Nome prodotto"
                  />
                </div>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  placeholder="Prezzo (es. 8.50)"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] font-medium text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] col-span-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Colore</span>
                    <input type="color" name="color" value={formData.color} onChange={handleInputChange} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                  </div>

                  {products.length > 0 && (
                    <div className="pt-1.5 border-t border-[var(--border)]/40">
                      <div className="flex flex-wrap gap-1.5">
                        {[...new Map(products.filter(p => p.category && p.color).map(p => [p.category.toLowerCase(), p])).values()].map(p => (
                          <button
                            key={p.id}
                            type="button"
                            title={p.category}
                            onClick={() => setFormData(prev => ({ ...prev, color: p.color, category: prev.category || p.category }))}
                            className="w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                            style={{
                              backgroundColor: p.color,
                              borderColor: formData.color.toLowerCase() === p.color.toLowerCase() ? 'var(--text-main)' : 'transparent'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Stampa</span>
                  <div className="flex gap-1.5">
                    {[
                      { value: 'both', label: 'Tutti', desc: 'Bar + Cucina' },
                      { value: 'bar', label: 'Solo Bar', desc: 'Ritiro Bar' },
                      { value: 'kitchen', label: 'Solo Cucina', desc: 'Gastronomia' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, print_destination: opt.value }))}
                        className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${formData.print_destination === opt.value
                          ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                          : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                          }`}
                      >
                        <div>{opt.label}</div>
                        <div className="text-[9px] font-medium opacity-70 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {editingProduct && (
                  <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] flex items-center gap-3">
                    <input type="checkbox" id="visible" name="visible" checked={formData.visible} onChange={handleInputChange} className="w-4 h-4 rounded" />
                    <label htmlFor="visible" className="text-xs font-bold text-[var(--text-main)] cursor-pointer">Visibile nel listino</label>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="stock_enabled" name="stock_enabled" checked={formData.stock_enabled || false}
                      onChange={handleInputChange} className="w-4 h-4 rounded" />
                    <label htmlFor="stock_enabled" className="text-xs font-bold text-[var(--text-main)] cursor-pointer">Disponibilità limitata</label>
                  </div>
                  {formData.stock_enabled && (
                    <input type="number" name="stock" min="0" value={formData.stock} onChange={handleInputChange} placeholder="Quantità disponibile"
                      className="w-full p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                  )}
                </div>

              </div>{/* fine grid */}
              <button type="submit" className="w-full mt-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-black text-sm uppercase tracking-widest transition-all">
                {editingProduct ? 'Salva modifiche' : 'Aggiungi prodotto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {duplicateConflict && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setDuplicateConflict(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="font-black text-[var(--text-main)] mb-2 text-center">Prodotto già esistente</p>
            {duplicateConflict.sameCategory ? (
              <p className="text-xs text-[var(--text-muted)] mb-4 text-center">
                <b>"{duplicateConflict.product.name}"</b> esiste già in <b>"{duplicateConflict.product.category}"</b>.
                Non puoi creare due prodotti identici nella stessa categoria.
              </p>
            ) : (
              <p className="text-xs text-[var(--text-muted)] mb-4 text-center">
                <b>"{duplicateConflict.product.name}"</b> esiste già nella categoria <b>"{duplicateConflict.product.category}"</b>.
                Non puoi creare due prodotti con lo stesso nome in categorie diverse.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {!duplicateConflict.sameCategory && (
                <button onClick={useExistingCategory} className="w-full h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer">
                  Usa quella categoria
                </button>
              )}
              <button onClick={() => setDuplicateConflict(null)} className="w-full h-10 rounded-xl border border-[var(--border)] text-[var(--text-main)] font-black text-xs uppercase tracking-widest hover:bg-[var(--bg-card-2)] transition-all cursor-pointer">
                {duplicateConflict.sameCategory ? 'Ho capito' : 'Annulla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="font-black text-[var(--text-main)] mb-2 text-center">Eliminare il prodotto "{deleteTarget.name}"?</p>
            <p className="text-xs text-[var(--text-muted)] mb-4 text-center">L'azione è irreversibile!</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[var(--text-main)] font-black text-xs uppercase tracking-widest hover:bg-[var(--bg-card-2)] transition-all cursor-pointer">
                Annulla
              </button>
              <button onClick={confirmDelete} className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer">
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductConfig;
