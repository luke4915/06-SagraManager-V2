// ProductConfig.jsx
import { useState, useEffect } from 'react';
import { X, Edit, Trash2, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const ProductConfig = () => {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: '',
    color: '#3b82f6'
  });
  const [showForm, setShowForm] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Caricamento prodotti da backend ---
  const loadProducts = () => {
    fetch(`${API_URL}/products`)
      .then(res => res.json())
      .then(data => setProducts(data.map(p => ({ ...p, price: parseFloat(p.price) }))))
      .catch(err => console.error("Errore caricamento prodotti:", err));
  };

  useEffect(() => { loadProducts(); }, []);

  const openAddForm = () => {
    setEditingProduct(null);
    setFormData({ name: '', price: 0, category: '', color: '#3b82f6' });
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product?.name || '',
      price: product?.price ?? 0,
      category: product?.category || '',
      color: product?.color || '#3b82f6'
    });
    setShowForm(true);
  };

  useEffect(() => {
    if (showForm) {
      const timer = setTimeout(() => setPopupVisible(true), 20);
      return () => clearTimeout(timer);
    } else {
      setPopupVisible(false);
    }
  }, [showForm]);

  const closeForm = () => setShowForm(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      // Se stiamo modificando usiamo PUT, se nuovo usiamo POST
      const method = editingProduct ? "PUT" : "POST";

      // Se stiamo modificando, aggiungiamo l'ID all'URL come previsto dal backend REST
      const url = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}/products`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Errore salvataggio prodotto");
      }

      loadProducts();
      closeForm();
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      // Qui potresti aggiungere un toast per avvisare l'utente dell'errore
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo prodotto?")) return;
    try {
      const res = await fetch(`${API_URL}/products/${productId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Errore eliminazione prodotto");
      loadProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const groupedProducts = categories.map(cat => ({
    category: cat,
    items: products.filter(p => p.category === cat)
  }));

  const filteredGroupedProducts = groupedProducts
    .filter(g => filterCategory === 'all' || g.category === filterCategory)
    .map(g => ({
      ...g,
      items: g.items.filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="relative overflow-y-auto">
      {/* Header con titolo, aggiungi, filtro e ricerca */}
      <div className="flex justify-between items-center mb-6 gap-2 flex-wrap p-4 bg-gray-100 dark:bg-gray-900 rounded-xl shadow-sm max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Configurazione Prodotti
        </h2>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Bottone aggiungi */}
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 px-4 h-10 bg-green-500 hover:bg-green-600 text-white font-semibold rounded transition-colors"
          >
            Aggiungi Prodotto
          </button>

          {/* Dropdown filtro */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 h-10 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">Tutte le categorie</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          {/* Campo ricerca */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded px-2 dark:bg-gray-700 h-10">
            <Search className="w-4 h-4 text-gray-500 mr-1" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca prodotto"
              className="bg-transparent outline-none flex-1 text-sm dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Lista prodotti raggruppata per categoria */}
      <div className="space-y-4 max-w-5xl mx-auto px-4">
        {filteredGroupedProducts.map(group => (
          <div key={group.category}>
            <div className="text-lg font-semibold mb-2">{group.category}</div>
            <div className="space-y-2">
              {group.items.map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded shadow hover:shadow-md transition-shadow w-full">
                  <div className="flex-1">
                    <div className="font-semibold">{product.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      Prezzo: {(product.price || 0).toFixed(2)} €
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditForm(product)}
                      className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors flex items-center justify-center"
                    >
                      <Edit className="w-5 h-5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Popup aggiungi/modifica */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all duration-300 ${popupVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {editingProduct ? 'Modifica Prodotto' : 'Aggiungi Prodotto'}
              </h2>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Es. Pizza Margherita"
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              />
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                placeholder="Es. 8.50"
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              />
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Categoria (es. Pizze, Bevande)"
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Colore:</label>
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="w-16 h-12 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
              </div>

              <button type="submit" className="w-full py-3 rounded-full bg-green-500 text-white font-semibold hover:bg-green-600 transition-all">
                {editingProduct ? 'Salva Modifiche' : 'Aggiungi Prodotto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductConfig;
