import React from 'react';
import { ShoppingCart, Check, Printer, MessageSquare, Gift } from 'lucide-react';

const CartDesktopView = ({
    // Props passate dal Container padre
    cart,
    mergedCart,
    cartKey,
    total,
    amountReceived,
    setAmountReceived,
    change,
    sessionActive,
    wsConnected,
    handleSendOrder,
    setSelectedItem,
    setIsQRScanModalOpen,
    setIsReprintModalOpen,
    setIsClearModalOpen,
    toggleOrderType,
    isAllGift,
    children
}) => {
    return (
        <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">

            {/* Header */}
            <div className="px-5 py-3 flex justify-between items-center border-b border-[var(--border)]">
                <div>
                    <h2 className="text-base font-black tracking-tighter uppercase text-[var(--text-main)]">Carrello</h2>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${sessionActive ? 'text-green-500' : 'text-red-400'}`}>
                        {sessionActive ? '● Sessione attiva' : '● Sessione non attiva'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => toggleOrderType(v => !v)}
                        title={isAllGift ? "Disattiva omaggio" : "Segna come omaggio (totale €0)"}
                        className={`p-2 rounded-xl border transition-all ${isAllGift ? 'bg-purple-500 border-purple-500 text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-purple-500 hover:border-purple-500/50'}`}>
                        <Gift size={16} />
                    </button>
                    <button onClick={() => setIsQRScanModalOpen(true)} title="Importa ordine da QR"
                        className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.875 15.75a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0ZM19.5 13.5a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0ZM13.5 19.5a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM19.5 19.5a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Z" />
                        </svg>
                    </button>
                    <button onClick={() => setIsReprintModalOpen(true)} title="Ristampa scontrini recenti"
                        className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all">
                        <Printer size={16} />
                    </button>
                </div>
            </div>

            {/* Lista articoli */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 no-scrollbar">
                {mergedCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-30">
                        <ShoppingCart size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2">Vuoto</p>
                    </div>
                ) : mergedCart.map(item => (
                    <div key={cartKey(item)} onClick={() => setSelectedItem(item)}
                        className="px-3 py-2 rounded-xl cursor-pointer border border-gray-300 dark:border-[var(--border)] bg-[var(--bg-card-2)] hover:border-[var(--accent)]/60 active:scale-[0.99] transition-all">
                        <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="bg-[var(--accent)] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded shrink-0">{item.quantity}</span>
                                <span className="font-bold text-xs uppercase text-[var(--text-main)] leading-tight truncate">{item.name}</span>
                            </div>
                            <span className="font-black text-xs tabular-nums text-[var(--text-main)] shrink-0">{(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                        {item.note && (
                            <div className="ml-7 mt-1.5 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1">
                                <MessageSquare size={9} className="text-yellow-500 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-wide text-yellow-500 truncate">{item.note}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Cassa Desktop */}
            <div className="px-4 py-3 border-t border-[var(--border)] space-y-2 bg-[var(--bg-card-2)]">
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Ricevuti</span>
                        <input type="text" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} placeholder="0.00"
                            className="w-full bg-transparent outline-none font-black text-base text-[var(--text-main)] tabular-nums text-right" />
                    </div>
                    <div className="bg-[var(--bg-card)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Resto</span>
                        <span className={`text-base font-black tabular-nums block text-right ${change < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {change >= 0 ? change.toFixed(2) : '0.00'} €
                        </span>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Totale</span>
                        {isAllGift && <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-500 border border-purple-500/30 px-2 py-0.5 rounded-full">Omaggio</span>}
                    </div>
                    {isAllGift ? (
                        <div className="flex items-baseline gap-2">
                            <span className="text-base font-black line-through text-[var(--text-muted)] tabular-nums">{total.toFixed(2)} €</span>
                            <span className="text-2xl font-black tracking-tighter text-purple-500 tabular-nums">0.00 €</span>
                        </div>
                    ) : (
                        <span className="text-2xl font-black tracking-tighter text-[var(--text-main)] tabular-nums">{total.toFixed(2)} €</span>
                    )}
                </div>

                <button onClick={handleSendOrder}
                    disabled={cart.length === 0 || !sessionActive || !wsConnected}
                    className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-input)] disabled:text-[var(--text-muted)] text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-[0.99] transition-all flex items-center justify-center gap-2">
                    <Check size={15} /> Invia Ordine
                </button>

                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => cart.length > 0 && setIsClearModalOpen(true)} disabled={cart.length === 0}
                        className="h-9 border border-red-300 dark:border-red-900/40 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30">
                        Svuota
                    </button>
                    {children && (
                        <div className="[&>*]:w-full [&>*]:h-9 [&>*]:rounded-xl [&>*]:font-black [&>*]:text-[10px] [&>*]:uppercase [&>*]:tracking-widest [&>*]:transition-all [&>*]:flex [&>*]:items-center [&>*]:justify-center [&>*]:gap-1">
                            {children}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default CartDesktopView;