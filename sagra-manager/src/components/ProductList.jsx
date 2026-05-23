import React, { useState, useMemo } from 'react';

const ProductList = ({ products, addToCart }) => {
  const [activeCategory, setActiveCategory] = useState('TUTTI');

  const categories = useMemo(() => {
    return ['TUTTI', ...new Set(products.map(p => p.category || 'Generico'))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'TUTTI') return products;
    return products.filter(p => (p.category || 'Generico') === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="sticky top-0 z-30 pb-4 pt-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center justify-center h-10 px-6 rounded-full font-black text-[10px] tracking-widest transition-all uppercase whitespace-nowrap border
                ${activeCategory === cat
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-white dark:bg-[#1c1f26] border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-indigo-500 hover:text-indigo-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10">
        {filteredProducts.map(product => {
          const nameLen = product.name.length;
          const nameSizeClass = nameLen > 14 ? 'text-sm' : nameLen > 9 ? 'text-base' : 'text-lg';
          const color = product.color || '#4f46e5';
          return (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="group flex flex-col rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 bg-white dark:bg-[#1c1f26]"
              style={{ borderLeftColor: color, boxShadow: `inset 0 0 0 9999px ${color}08` }}
            >
              <h3 className={`${nameSizeClass} font-black text-gray-900 dark:text-gray-50 uppercase tracking-tighter mb-4 text-left leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors`}>
                {product.name}
              </h3>
              <div className="mt-auto text-left">
                <span className="text-base font-black tracking-tight" style={{ color }}>{product.price.toFixed(2)}€</span>
              </div>
            </button>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <p className="font-black uppercase tracking-widest text-xs">Nessun prodotto in questa categoria</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;