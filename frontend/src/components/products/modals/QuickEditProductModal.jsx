import { useState } from 'react';
import { Check } from 'lucide-react';
import { API_URL } from '../../../config/api';

const QuickEditProductModal = ({ product, onClose, onSaved }) => {
  const [price, setPrice] = useState(product?.price ?? 0);
  const [stockEnabled, setStockEnabled] = useState(product?.stock_enabled ?? false);
  const [stock, setStock] = useState(product?.stock ?? '');
  const [saving, setSaving] = useState(false);

  if (!product) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...product, price: parseFloat(price) || 0 }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();

      const stockRes = await fetch(`${API_URL}/products/${product.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          stock: stockEnabled && stock !== '' ? parseInt(stock) : null,
          stock_enabled: !!stockEnabled,
        }),
      });
      const stockData = stockRes.ok ? await stockRes.json() : {};

      onSaved({ ...updated, price: parseFloat(updated.price), stock: stockData.stock ?? null, stock_enabled: !!stockData.stock_enabled });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-black uppercase tracking-tight text-[var(--text-main)] mb-4">{product.name}</h3>

        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Prezzo</label>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] font-medium text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] mb-4"
        />

        <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="qe_stock_enabled"
              checked={stockEnabled}
              onChange={(e) => setStockEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="qe_stock_enabled" className="text-xs font-bold text-[var(--text-main)] cursor-pointer">Disponibilità limitata</label>
          </div>
          {stockEnabled && (
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Quantità disponibile"
              className="w-full p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-red-500/30 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 transition-all cursor-pointer"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check size={16} /> {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickEditProductModal;