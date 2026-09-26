import React, { useState, useMemo, useRef, useCallback } from 'react';
import QuickEditProductModal from './modals/QuickEditProductModal';

const LONG_PRESS_MS = 1500;
const VISIBLE_THRESHOLD_PCT = 10; // sotto questa soglia il bordo resta invisibile: evita il "flash" su un click veloce

const ProductList = ({ products, addToCart, cart, lowStockThreshold = 10, setProducts }) => {
  const [activeCategory, setActiveCategory] = useState('TUTTI');
  const [progressById, setProgressById] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);

  const timers = useRef({}); // { [productId]: { raf, startTime, triggered } }

  const categories = useMemo(() => {
    const visible = products.filter(p => p.visible !== false);
    return ['TUTTI', ...new Set(visible.map(p => p.category || 'Generico'))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const visible = products.filter(p => p.visible !== false);
    if (activeCategory === 'TUTTI') return visible;
    return visible.filter(p => (p.category || 'Generico') === activeCategory);
  }, [products, activeCategory]);

  const clearPress = useCallback((id) => {
    const t = timers.current[id];
    if (t?.raf) cancelAnimationFrame(t.raf);
    delete timers.current[id];
    setProgressById(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const startPress = useCallback((product) => {
    const id = product.id;
    if (timers.current[id]) return; // già in corso
    const state = { startTime: performance.now(), triggered: false, exceededThreshold: false, raf: null };
    timers.current[id] = state;

    const tick = () => {
      const elapsed = performance.now() - state.startTime;
      const pct = Math.min(100, (elapsed / LONG_PRESS_MS) * 100);
      setProgressById(prev => ({ ...prev, [id]: pct }));
      if (pct > VISIBLE_THRESHOLD_PCT) state.exceededThreshold = true;

      if (pct >= 100) {
        state.triggered = true;
        setEditingProduct(product);
        clearPress(id);
        return;
      }
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }, [clearPress]);

  const endPress = useCallback((id) => {
    const t = timers.current[id];
    const shouldBlockClick = !!(t?.triggered || t?.exceededThreshold);
    clearPress(id);
    return shouldBlockClick;
  }, [clearPress]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab categorie */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`
              shrink-0 h-9 px-4 rounded-xl font-black text-[10px] tracking-widest uppercase whitespace-nowrap border cursor-pointer hover:bg-[var(--accent-hover)] transition-all duration-150
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

              const cartQty = cart?.filter(i => i.id === product.id).reduce((sum, i) => sum + i.quantity, 0) || 0;
              const remainingStock = product.stock_enabled && product.stock !== null
                ? product.stock - cartQty
                : null;
              const showStockBadge = remainingStock !== null && remainingStock <= lowStockThreshold;

              const progress = progressById[product.id] || 0;

              return (
                <button
                  key={product.id}
                  onClick={() => { if (!endPress(product.id)) addToCart(product); }}
                  onMouseDown={() => startPress(product)}
                  onMouseLeave={() => clearPress(product.id)}
                  onTouchStart={() => startPress(product)}
                  onTouchCancel={() => clearPress(product.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseEnter={(e) => e.currentTarget.style.setProperty('--bg-opacity', '12%')}
                  className="product-card relative flex flex-col rounded-xl pt-4 px-3 pb-2 border-l-4 bg-[var(--bg-card-2)] cursor-pointer border border-[var(--border)] hover:border-[var(--text-muted)]/30 active:scale-95 transition-all duration-150 text-left overflow-hidden select-none"
                  style={{
                    borderLeftColor: color,
                    backgroundColor: `color-mix(in srgb, ${color} var(--bg-opacity, 6%), var(--bg-card-2))`
                  }}
                >
                  {/* Brush orizzontale long-press: si riempie da sx verso dx, stesso accent della tile */}
                  {progress > VISIBLE_THRESHOLD_PCT && (
                    <div
                      className="absolute inset-y-0 left-0 pointer-events-none z-20"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: color,
                        opacity: 0.22,
                      }}
                    />
                  )}

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

                  <h3 className={`${nameSizeClass} font-black text-[var(--text-main)] uppercase tracking-tighter mb-2 leading-tight pr-14`}>
                    {product.name}
                  </h3>

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

      <QuickEditProductModal
        key={editingProduct?.id}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSaved={(updated) => setProducts?.(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
      />
    </div>
  );
};

export default ProductList;