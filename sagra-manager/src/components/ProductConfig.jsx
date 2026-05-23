import { useState, useEffect } from 'react';
import { X, Edit, Trash2, Search, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const ProductConfig = () => {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: 0, category: '', color: '#3b82f6' });
  const [showForm, setShowForm] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadProducts = () => {
    fetch(`${API_URL}/products`).then(res => res.json()).then(data => setProducts(data.map(p => ({ ...p, price: parseFloat(p.price) })))).catch(console.error);
  };
  useEffect(() => { loadProducts(); }, []);

  const openAddForm = () => { setEditingProduct(null); setFormData({ name: '', price: 0, category: '', color: '#3b82f6' }); setShowForm(true); };
  const openEditForm = (p) => { setEditingProduct(p); setFormData({ name: p.name || '', price: p.price ?? 0, category: p.category || '', color: p.color || '#3b82f6' }); setShowForm(true); };

  useEffect(() => {
    if (showForm) { const t = setTimeout(() => setPopupVisible(true), 20); return () => clearTimeout(t); }
    else setPopupVisible(false);
  }, [showForm]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      const res = await fetch(editingProduct ? `${API_URL}/products/${editingProduct.id}` : `${API_URL}/products`, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Errore");
      loadProducts();
      setShowForm(false);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminare questo prodotto?")) return;
    try {
      const res = await fetch(`${API_URL}/products/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      loadProducts();
    } catch (err) { console.error(err); }
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredGroups = categories
    .filter(c => filterCategory === 'all' || c === filterCategory)
    .map(c => ({ category: c, items: products.filter(p => p.category === c && (!searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-gray-100">MENU</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Gestione prodotti</p>
        </div>
        <button onClick={openAddForm} className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/30 transition-all">
          <Plus size={16} /> Aggiungi
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-10 px-4 rounded-xl bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300">
          <option value="all">Tutte le categorie</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-2 h-10 px-4 rounded-xl bg-white dark:bg-[#1c1f26] border border-gray-200 dark:border-gray-700">
          <Search size={14} className="text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cerca prodotto" className="bg-transparent outline-none text-sm font-medium text-gray-700 dark:text-gray-300 w-40" />
        </div>
      </div>

      <div className="space-y-6">
        {filteredGroups.map(group => (
          <div key={group.category}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">{group.category}</p>
            <div className="space-y-2">
              {group.items.map(product => (
                <div key={product.id} className="flex justify-between items-center p-4 bg-white dark:bg-[#1c1f26] rounded-2xl border-l-4 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all" style={{ borderLeftColor: product.color || '#3b82f6' }}>
                  <div>
                    <p className="font-black text-sm uppercase tracking-tight text-gray-900 dark:text-gray-100">{product.name}</p>
                    <p className="text-xs font-bold" style={{ color: product.color || '#3b82f6' }}>{(product.price || 0).toFixed(2)} €</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditForm(product)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Edit size={16} className="text-gray-500" /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={16} className="text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`bg-white dark:bg-[#16181d] rounded-3xl shadow-2xl p-8 w-full max-w-md border border-gray-100 dark:border-gray-800 transform transition-all duration-300 ${popupVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-gray-100">{editingProduct ? 'MODIFICA' : 'NUOVO PRODOTTO'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { name: 'name', placeholder: 'Nome prodotto', type: 'text', maxLength: 20 },
                { name: 'price', placeholder: 'Prezzo (es. 8.50)', type: 'number', step: '0.01' },
                { name: 'category', placeholder: 'Categoria (es. Pizze)', type: 'text' },
              ].map(f => (
                <input key={f.name} {...f} value={formData[f.name]} onChange={handleInputChange} required={f.name !== 'category'} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-medium text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              ))}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Colore categoria</span>
                <input type="color" name="color" value={formData.color} onChange={handleInputChange} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
              </div>
              <button type="submit" className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-500/30 transition-all">
                {editingProduct ? 'Salva modifiche' : 'Aggiungi prodotto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductConfig;