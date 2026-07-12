import React, { useState, useMemo } from 'react';

const ProductList = ({ products, addToCart, cart, lowStockThreshold = 10 }) => {
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
              const color = product.color || 'var(--accent)';

              // Calcola quanti di questo prodotto specifico sono già nel carrello
              const cartQty = cart?.filter(i => i.id === product.id).reduce((sum, i) => sum + i.quantity, 0) || 0;

              // Calcola lo stock rimanente in tempo reale
              const remainingStock = product.stock_enabled && product.stock !== null
                ? product.stock - cartQty
                : null;

              // Mostra il badge se lo stock rimanente è sotto la soglia (incluso quando scende a 0)
              const showStockBadge = remainingStock !== null && remainingStock <= lowStockThreshold;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  onMouseEnter={(e) => e.currentTarget.style.setProperty('--bg-opacity', '12%')}
                  onMouseLeave={(e) => e.currentTarget.style.setProperty('--bg-opacity', '6%')}
                  className="relative flex flex-col rounded-xl pt-4 px-3 pb-2 border-l-4 bg-[var(--bg-card-2)] cursor-pointer border border-[var(--border)] hover:border-[var(--text-muted)]/30 active:scale-95 transition-all duration-150 text-left overflow-hidden"
                  style={{
                    borderLeftColor: color,
                    backgroundColor: `color-mix(in srgb, ${color} var(--bg-opacity, 6%), var(--bg-card-2))`
                  }}
                >
                  {/* BADGE STOCK DINAMICO IN TINTA */}
                  {showStockBadge && (
                    <div
                      className={`absolute top-2 right-2 text-white px-2 py-0.5 rounded-lg shadow-sm border flex items-center gap-1.5 z-10 backdrop-blur-md transition-colors ${remainingStock === 0 ? 'bg-red-500 border-red-400' : 'border-white/20'}`}
                      style={remainingStock > 0 ? { backgroundColor: color } : {}}
                    >
                      {remainingStock > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]"></span>
                      )}
                      <span className="text-[9px] font-black uppercase tracking-widest mt-px">
                        {remainingStock === 0
                          ? 'Esaurito'
                          : remainingStock === 1
                            ? 'Ultimo!'
                            : `Ultimi ${remainingStock}`
                        }
                      </span>
                    </div>
                  )}

                  {/* NOME PRODOTTO */}
                  <h3 className={`${nameSizeClass} font-black text-[var(--text-main)] uppercase tracking-tighter mb-2 leading-tight pr-14`}>
                    {product.name}
                  </h3>

                  {/* SEZIONE PREZZO OTTIMIZZATA */}
                  <div className="w-full mt-auto pt-1 border-t border-[var(--border)] flex justify-between items-center">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase leading-none">
                      Prezzo
                    </span>
                    <span className="text-sm font-black tabular-nums leading-none" style={{ color }}>
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