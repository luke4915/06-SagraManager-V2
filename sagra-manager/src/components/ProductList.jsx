import React, { useState, useMemo } from 'react';

const ProductList = ({ products, addToCart }) => {
  const [activeCategory, setActiveCategory] = useState('TUTTI');

  // 1. Consideriamo solo i prodotti con visible !== false per generare le categorie attive
  const categories = useMemo(() => {
    const visibleProducts = products.filter(p => p.visible !== false);
    return ['TUTTI', ...new Set(visibleProducts.map(p => p.category || 'Generico'))];
  }, [products]);

  // 2. Filtriamo applicando sia il controllo di categoria sia l'obbligo di visibilità
  const filteredProducts = useMemo(() => {
    // Escludiamo a monte tutto ciò che è stato nascosto da ProductConfig
    const visibleProducts = products.filter(p => p.visible !== false);

    if (activeCategory === 'TUTTI') return visibleProducts;
    return visibleProducts.filter(p => (p.category || 'Generico') === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 relative overflow-hidden shadow-xl">
      <div className="sticky top-0 z-30 pb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center justify-center h-11 px-6 rounded-2xl font-black text-xs tracking-widest transition-all uppercase whitespace-nowrap border
                ${activeCategory === cat
                  ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:border-orange-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredProducts.map(product => {
            const nameLen = product.name.length;
            const nameSizeClass = nameLen > 14 ? 'text-sm' : nameLen > 9 ? 'text-base' : 'text-lg';
            const color = product.color || '#3b82f6';
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="group flex flex-col rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 bg-[var(--bg-card-2)]"
                style={{ borderLeftColor: color, boxShadow: `inset 0 0 0 9999px ${color}12` }}
              >
                <h3 className={`${nameSizeClass} font-black text-[var(--text-main)] uppercase tracking-tighter mb-4 text-left leading-tight group-hover:text-orange-500 transition-colors`}>
                  {product.name}
                </h3>
                <div className="mt-auto pt-2 border-t border-dashed border-[var(--border)] flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prezzo</span>
                  <span className="text-base font-black tabular-nums" style={{ color }}>{product.price.toFixed(2)}€</span>
                </div>
              </button>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="font-black uppercase tracking-widest text-xs">Nessun prodotto disponibile</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;