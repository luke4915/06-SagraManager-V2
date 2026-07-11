import React, { useState, useMemo } from 'react';
import { Plus, Minus, X } from 'lucide-react';

const ProductList = ({ products, addToCart, cart, lowStockThreshold = 10, onUpdateStock }) => {
  const [activeCategory, setActiveCategory] = useState('TUTTI');
  // Stato per il menu contestuale
  const [contextMenu, setContextMenu] = useState(null);

  // Gestione del click destro
  const handleContextMenu = (e, product) => {
    e.preventDefault(); // Blocca il menu standard di sistema

    // Calcola una posizione sicura per non uscire dallo schermo
    const menuWidth = 220;
    const menuHeight = 250;
    const x = e.clientX + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 20 : e.clientX;
    const y = e.clientY + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 20 : e.clientY;

    setContextMenu({ x, y, product });
  };

  const closeContextMenu = () => setContextMenu(null);

  // Funzione rapida per aggiornare lo stock dal menu
  const quickUpdate = (newStock) => {
    if (contextMenu?.product) {
      onUpdateStock(contextMenu.product.id, Math.max(0, newStock));
    }
    closeContextMenu();
  };

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
    <>
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
                    // Aggiungiamo l'evento qui:
                    onContextMenu={(e) => handleContextMenu(e, product)}
                    className="relative flex flex-col rounded-xl p-4 border-l-4 bg-[var(--bg-card-2)] border border-[var(--border)] active:scale-95 transition-all duration-150 text-left overflow-hidden"
                    style={{
                      borderLeftColor: color,
                      backgroundColor: `color-mix(in srgb, ${color} 6%, var(--bg-card-2))`
                    }}
                  >
                    {/* BADGE STOCK DINAMICO IN TINTA */}
                    {showStockBadge && (
                      <div
                        className={`absolute top-2 right-2 text-white px-2 py-0.5 rounded-lg shadow-sm border flex items-center gap-1.5 z-10 backdrop-blur-md transition-colors ${remainingStock === 0 ? 'bg-red-500 border-red-400' : 'border-white/20'
                          }`}
                        style={remainingStock > 0 ? { backgroundColor: color } : {}}
                      >
                        {remainingStock > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]"></span>
                        )}
                        <span className="text-[9px] font-black uppercase tracking-widest mt-px">
                          {remainingStock === 0 ? 'Esaurito' : `Ultimi ${remainingStock}`}
                        </span>
                      </div>
                    )}
                    <h3 className={`${nameSizeClass} font-black text-[var(--text-main)] uppercase tracking-tighter mb-3 leading-tight pr-14`}>
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

      {/* OVERLAY E MENU CONTESTUALE */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={closeContextMenu}
          onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
        >
          <div
            className="fixed bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
            style={{ top: contextMenu.y, left: contextMenu.x, width: '220px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Menu */}
            <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-card-2)] flex justify-between items-start">
              <div className="pr-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Stock Rapido</p>
                <p className="font-bold text-xs text-[var(--text-main)] truncate">{contextMenu.product.name}</p>
                <p className="text-[10px] text-[var(--accent)] font-black mt-1">
                  Attuale: {contextMenu.product.stock !== null ? contextMenu.product.stock : '∞'}
                </p>
              </div>
              <button onClick={closeContextMenu} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Azioni Rapide */}
            <div className="p-2 space-y-1">
              <button
                onClick={() => quickUpdate(0)}
                className="w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center"
              >
                Imposta Esaurito (0)
              </button>

              <div className="flex gap-1 pt-1">
                <button
                  onClick={() => quickUpdate((contextMenu.product.stock || 0) - 5)}
                  className="flex-1 py-2 bg-[var(--bg-card-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-main)] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Minus size={12} /> 5
                </button>
                <button
                  onClick={() => quickUpdate((contextMenu.product.stock || 0) + 5)}
                  className="flex-1 py-2 bg-[var(--bg-card-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-main)] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={12} /> 5
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => quickUpdate((contextMenu.product.stock || 0) - 10)}
                  className="flex-1 py-2 bg-[var(--bg-card-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-main)] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Minus size={12} /> 10
                </button>
                <button
                  onClick={() => quickUpdate((contextMenu.product.stock || 0) + 10)}
                  className="flex-1 py-2 bg-[var(--bg-card-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-main)] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={12} /> 10
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductList;