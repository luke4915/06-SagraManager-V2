import { useState } from 'react';

const ProductForm = ({ saveProduct, editingProduct }) => {
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    category: '',
    color: '#4f46e5', // Colore primario aggiornato di default
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveProduct(newProduct);
    setNewProduct({ name: '', price: 0, category: '', color: '#4f46e5' });
  };

  return (
    <div className="bg-white dark:bg-[#1c1f26] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
      <h2 className="text-xl font-black tracking-tighter mb-6 text-gray-950 dark:text-gray-50 uppercase">
        {editingProduct ? 'Modifica Prodotto' : 'Aggiungi un Prodotto'}
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400 dark:text-gray-500">Nome Prodotto</label>
          <input
            type="text"
            name="name"
            value={newProduct.name}
            onChange={handleInputChange}
            placeholder="Es. Pizza Margherita"
            required
            className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all text-gray-900 dark:text-gray-100 outline-none"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400 dark:text-gray-500">Prezzo (€)</label>
          <input
            type="number"
            name="price"
            value={newProduct.price}
            onChange={handleInputChange}
            placeholder="Es. 8.50"
            step="0.01"
            required
            className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all text-gray-900 dark:text-gray-100 outline-none"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400 dark:text-gray-500">Categoria</label>
          <input
            type="text"
            name="category"
            value={newProduct.category}
            onChange={handleInputChange}
            placeholder="Es. Pizze, Bevande"
            className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all text-gray-900 dark:text-gray-100 outline-none"
          />
        </div>

        <div className="flex flex-col md:col-span-2 lg:col-span-3">
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400 dark:text-gray-500">Colore Pulsante</label>
          <input
            type="color"
            name="color"
            value={newProduct.color}
            onChange={handleInputChange}
            className="p-1 h-12 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer"
          />
        </div>

        <button
          type="submit"
          className="mt-4 px-6 py-3 col-span-1 md:col-span-2 lg:col-span-3 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all duration-200 transform active:scale-95 shadow-md shadow-indigo-500/10"
          style={{ backgroundColor: editingProduct ? '#4f46e5' : '#10b981' }}
        >
          {editingProduct ? 'Salva Modifiche' : 'Aggiungi Prodotto'}
        </button>
      </form>
    </div>
  );
};

export default ProductForm;