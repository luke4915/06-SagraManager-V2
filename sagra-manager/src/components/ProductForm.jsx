import { useState } from 'react';

const ProductForm = ({ saveProduct, editingProduct }) => {
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    category: '',
    color: '#3b82f6',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveProduct(newProduct);
    setNewProduct({ name: '', price: 0, category: '', color: '#3b82f6' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        {editingProduct ? 'Modifica Prodotto' : 'Aggiungi un Prodotto'}
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Nome Prodotto</label>
          <input
            type="text"
            name="name"
            value={newProduct.name}
            onChange={handleInputChange}
            placeholder="Es. Pizza Margherita"
            required
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Prezzo (€)</label>
          <input
            type="number"
            name="price"
            value={newProduct.price}
            onChange={handleInputChange}
            placeholder="Es. 8.50"
            step="0.01"
            required
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Categoria</label>
          <input
            type="text"
            name="category"
            value={newProduct.category}
            onChange={handleInputChange}
            placeholder="Es. Pizze, Bevande"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Colore Pulsante</label>
          <input
            type="color"
            name="color"
            value={newProduct.color}
            onChange={handleInputChange}
            className="p-1 h-12 w-full border border-gray-300 rounded-lg cursor-pointer dark:border-gray-600"
          />
        </div>

        <button
          type="submit"
          className="mt-6 px-6 py-3 col-span-1 md:col-span-2 lg:col-span-3 rounded-full text-white font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md"
          style={{ backgroundColor: editingProduct ? '#f97316' : '#22c55e' }}
        >
          {editingProduct ? 'Salva Modifiche' : 'Aggiungi Prodotto'}
        </button>
      </form>
    </div>
  );
};

export default ProductForm;
