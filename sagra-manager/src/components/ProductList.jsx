import React, { useState, useMemo } from 'react';

const ProductList = ({ products, addToCart }) => {
  const [activeCategory, setActiveCategory] = useState('TUTTI');

  // Estrae le categorie uniche
  const categories = useMemo(() => {
    return ['TUTTI', ...new Set(products.map(p => p.category || 'Generico'))];
  }, [products]);

  // Filtra i prodotti in base alla categoria selezionata
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'TUTTI') return products;
    return products.filter(p => (p.category || 'Generico') === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Categorie Sticky: Sempre visibili allo scroll */}
      <div className="sticky top-0 z-30 bg-[var(--bg-main)]/90 backdrop-blur-md pb-6 pt-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center justify-center h-10 px-6 rounded-full font-black text-[10px] tracking-widest transition-all uppercase whitespace-nowrap border
                ${activeCategory === cat
                  ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-orange-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Prodotti: Più densa per mostrare più roba */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10">
        {filteredProducts.map(product => (
          <button
            key={product.id}
            onClick={() => addToCart(product)}
            className="group flex flex-col bg-white dark:bg-[#1c1f26] rounded-4xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-orange-500/20"
          >
            <div className="w-10 h-1.5 rounded-full mb-4 shadow-inner" style={{ backgroundColor: product.color || '#3b82f6' }} />

            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter mb-6 text-left h-10 overflow-hidden leading-tight group-hover:text-orange-500 transition-colors">
              {product.name}
            </h3>

            <div className="flex items-center justify-between mt-auto">
              <span className="text-xl font-black">{product.price.toFixed(2)}€</span>
              <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                <span className="text-2xl font-light leading-none">+</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="font-black uppercase tracking-widest text-xs">Nessun prodotto in questa categoria</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;