import React, { useState, useMemo } from 'react';

const ProductList = ({ products, addToCart }) => {
  const [activeCategory, setActiveCategory] = useState('TUTTI');

  const categories = useMemo(() => {
    const visible = products.filter(p => p.visible !== false);
    return ['TUTTI', ...new Set(visible.map(p => p.category || 'Generico'))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const visible = products.filter(p => p.visible !== false);
    if (activeCategory === 'TUTTI') return visible;
    return visible.filter(p => (p.category || 'Generico') === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Tab categorie */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`
              shrink-0 h-9 px-4 rounded-xl font-black text-[10px] tracking-widest uppercase whitespace-nowrap border transition-all duration-150
              ${activeCategory === cat
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-md shadow-[var(--accent-shadow)]'
                : 'bg-[var(--bg-card-2)] border-[var(--border)] text-[var(--text-muted)]'}
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Griglia prodotti */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[var(--text-muted)]">
            <p className="font-black uppercase tracking-widest text-xs">Nessun prodotto disponibile</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => {
              const nameLen = product.name.length;
              const nameSizeClass = nameLen > 14 ? 'text-sm' : nameLen > 9 ? 'text-base' : 'text-lg';
              const color = product.color || '#3b82f6';
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex flex-col rounded-xl p-4 border-l-4 bg-[var(--bg-card-2)] border border-[var(--border)] active:scale-95 transition-all duration-150 text-left"
                  style={{
                    borderLeftColor: color,
                    backgroundColor: `color-mix(in srgb, ${color} 6%, var(--bg-card-2))`
                  }}
                >
                  <h3 className={`${nameSizeClass} font-black text-[var(--text-main)] uppercase tracking-tighter mb-3 leading-tight`}>
                    {product.name}
                  </h3>
                  <div className="mt-auto pt-2 border-t border-[var(--border)] flex justify-between items-center">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Prezzo</span>
                    <span className="text-sm font-black tabular-nums" style={{ color }}>
                      {product.price.toFixed(2)}€
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;