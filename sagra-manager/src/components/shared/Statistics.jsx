import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, X, CheckSquare, Square } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text-main)',
  fontSize: 12,
};

const StatCard = ({ label, value, sub }) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{label}</p>
    <p className="text-2xl font-black tracking-tighter text-[var(--text-main)]">{value}</p>
    {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border)]">
    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">{title}</p>
    {children}
  </div>
);

const formatEuro = (v) => Number(v || 0).toFixed(2) + ' €';
const formatMin = (v) => Number(v || 0).toFixed(1) + ' min';

const empty = {
  totaleSerata: 0, importoMedio: 0, prodottoPiuVenduto: '',
  numeroTotaleOrdini: 0, incassoPerCategoria: [],
  ordiniPerFasciaOraria: [], prezzoMedioPerFasciaOraria: [],
  topProdotti: [], andamentoFatturato: [],
  tempiCompletamento: [], tempoMedioCompletamento: 0,
  confrontoSerate: [],
  unrealizedGiftRevenue: 0, topGiftProducts: []
};

const Statistics = () => {
  const [orders, setOrders] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resO, resS, resP] = await Promise.all([
          fetch(`${API_URL}/orders`, { credentials: 'include' }),
          fetch(`${API_URL}/sessions`, { credentials: 'include' }),
          fetch(`${API_URL}/products`, { credentials: 'include' }),
        ]);
        if (!resO.ok || !resS.ok || !resP.ok) throw new Error('Errore nel caricamento dati');

        const [ordersData, sessionsData, productsData] = await Promise.all([
          resO.json(),
          resS.json(),
          resP.json(),
        ]);

        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleSession = (id) => {
    const sid = String(id);
    setSelectedSessionIds(prev =>
      prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]
    );
  };

  const [h2hProduct, setH2hProduct] = useState('');
  const [h2hSessionA, setH2hSessionA] = useState('');
  const [h2hSessionB, setH2hSessionB] = useState('');

  const getOrdersBySession = (sessionId) => {
    const s = sessions.find(x => String(x.id) === String(sessionId));
    if (!s) return [];
    return orders.filter(o => o.status === 'completed' &&
      new Date(o.created_at) >= new Date(s.start_time) &&
      new Date(o.created_at) <= (s.end_time ? new Date(s.end_time) : new Date()));
  };

  const availableProducts = useMemo(() => {
    // Finché non sono state scelte entrambe le serate, mostra tutti i prodotti disponibili
    if (!h2hSessionA || !h2hSessionB) {
      return [...new Set(orders.flatMap(o => o.items?.map(i => i.name).filter(Boolean) || []))].sort();
    }
    // Con entrambe le serate selezionate, mostra solo i prodotti venduti in ENTRAMBE (intersezione)
    const productsA = new Set(
      getOrdersBySession(h2hSessionA).flatMap(o => o.items?.map(i => i.name).filter(Boolean) || [])
    );
    const productsB = new Set(
      getOrdersBySession(h2hSessionB).flatMap(o => o.items?.map(i => i.name).filter(Boolean) || [])
    );
    return [...productsA].filter(p => productsB.has(p)).sort();
  }, [orders, sessions, h2hSessionA, h2hSessionB]);

  useEffect(() => {
    if (h2hProduct && !availableProducts.includes(h2hProduct)) {
      setH2hProduct('');
    }
  }, [availableProducts, h2hProduct]);

  const h2hData = useMemo(() => {
    if (!h2hProduct || !h2hSessionA || !h2hSessionB) return null;
    const calculate = (sessionId) => {
      let qty = 0, revenue = 0;
      getOrdersBySession(sessionId).forEach(o => o.items?.forEach(i => {
        if (i.name === h2hProduct) {
          qty += Number(i.quantity || 0);
          revenue += Number(i.price || 0) * Number(i.quantity || 0);
        }
      }));
      return { qty, revenue: parseFloat(revenue.toFixed(2)) };
    };
    const a = calculate(h2hSessionA);
    const b = calculate(h2hSessionB);
    return [
      { metric: 'Quantità venduta', A: a.qty, B: b.qty },
      { metric: 'Incasso (€)', A: a.revenue, B: b.revenue },
    ];
  }, [h2hProduct, h2hSessionA, h2hSessionB, orders, sessions]);

  const sessionAName = sessions.find(s => String(s.id) === String(h2hSessionA))?.name || 'Serata A';
  const sessionBName = sessions.find(s => String(s.id) === String(h2hSessionB))?.name || 'Serata B';

  const stats = useMemo(() => {
    if (!orders.length) return empty;

    let filtered = orders.filter(o => o.status === 'completed');
    if (selectedSessionIds.length > 0 && sessions.length > 0) {
      filtered = filtered.filter(o => sessions.some(s => {
        if (!selectedSessionIds.includes(String(s.id))) return false;
        const d = new Date(o.created_at);
        return d >= new Date(s.start_time) && d <= (s.end_time ? new Date(s.end_time) : new Date());
      }));
    }
    if (!filtered.length) return empty;

    const totaleSerata = filtered.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const importoMedio = totaleSerata / filtered.length;

    // Prodotti + categorie
    const priceMap = {};
    products.forEach(p => { priceMap[p.id] = Number(p.price || 0); });
    let unrealizedGiftRevenue = 0;
    const giftRevenueByProduct = {};

    const productCount = {};
    const categoryIncome = {};
    filtered.forEach(o => o.items?.forEach(i => {
      if (!i.name) return;
      productCount[i.name] = (productCount[i.name] || 0) + Number(i.quantity || 0);
      const cat = i.category || 'Altro';
      categoryIncome[cat] = (categoryIncome[cat] || 0) + Number(i.price || 0) * Number(i.quantity || 0);

      // Item sold at 0€ but with a catalog price > 0 -> it's a gift/comp
      const actualPrice = Number(i.price || 0);
      const catalogPrice = priceMap[i.id] ?? actualPrice;
      if (actualPrice === 0 && catalogPrice > 0) {
        const missedRevenue = catalogPrice * Number(i.quantity || 0);
        unrealizedGiftRevenue += missedRevenue;
        giftRevenueByProduct[i.name] = (giftRevenueByProduct[i.name] || 0) + missedRevenue;
      }
    }));

    const topGiftProducts = Object.entries(giftRevenueByProduct)
      .map(([product, missedRevenue]) => ({ product, missedRevenue: parseFloat(missedRevenue.toFixed(2)) }))
      .sort((a, b) => b.missedRevenue - a.missedRevenue).slice(0, 10);

    const prodottoPiuVenduto = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const topProdotti = Object.entries(productCount)
      .map(([name, count]) => ({ prodotto: name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 12);

    const incassoPerCategoria = Object.entries(categoryIncome)
      .map(([categoria, totale]) => ({ categoria, totale: parseFloat(totale.toFixed(2)) }))
      .sort((a, b) => b.totale - a.totale);

    // Fasce orarie
    const ordiniPerFasciaOraria = Array.from({ length: 24 }, (_, h) => ({ ora: `${h}:00`, count: 0 }));
    const prezzoPerFascia = Array.from({ length: 24 }, (_, h) => ({ ora: `${h}:00`, total: 0, count: 0 }));
    filtered.forEach(o => {
      const h = new Date(o.created_at).getHours();
      ordiniPerFasciaOraria[h].count += 1;
      prezzoPerFascia[h].total += Number(o.total || 0);
      prezzoPerFascia[h].count += 1;
    });
    const prezzoMedioPerFasciaOraria = prezzoPerFascia.map(f => ({
      ora: f.ora, prezzoMedio: f.count > 0 ? parseFloat((f.total / f.count).toFixed(2)) : 0,
    }));

    // Andamento cumulativo
    const andamentoFatturato = Array.from({ length: 24 }, (_, h) => ({ ora: `${h}:00`, totale: 0 }));
    let cumulative = 0;
    [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).forEach(o => {
      const h = new Date(o.created_at).getHours();
      cumulative += Number(o.total || 0);
      andamentoFatturato[h].totale = parseFloat(cumulative.toFixed(2));
    });

    // Tempi completamento
    const tempi = [];
    filtered.forEach(o => {
      if (o.created_at && o.completed_at) {
        const diff = (new Date(o.completed_at) - new Date(o.created_at)) / 60000;
        if (diff >= 0 && diff < 180) tempi.push({ ora: new Date(o.created_at).getHours(), diff });
      }
    });
    const tempoMedioCompletamento = tempi.length > 0
      ? tempi.reduce((sum, t) => sum + t.diff, 0) / tempi.length : 0;
    const tempiCompletamento = Array.from({ length: 24 }, (_, h) => ({ ora: `${h}:00`, media: 0, count: 0 }));
    tempi.forEach(t => { tempiCompletamento[t.ora].media += t.diff; tempiCompletamento[t.ora].count += 1; });
    tempiCompletamento.forEach(t => { if (t.count > 0) t.media = parseFloat((t.media / t.count).toFixed(1)); });

    // Confronto serate
    const confrontoSerate = sessions.map(s => {
      const so = orders.filter(o => {
        if (o.status !== 'completed') return false;
        const d = new Date(o.created_at);
        return d >= new Date(s.start_time) && d <= (s.end_time ? new Date(s.end_time) : new Date());
      });
      const totale = so.reduce((sum, o) => sum + Number(o.total || 0), 0);
      return {
        id: s.id,
        name: s.name || new Date(s.start_time).toLocaleDateString('it-IT'),
        totale: parseFloat(totale.toFixed(2)),
        numero: so.length,
        medio: so.length > 0 ? parseFloat((totale / so.length).toFixed(2)) : 0,
      };
    });

    return {
      totaleSerata, importoMedio, prodottoPiuVenduto,
      numeroTotaleOrdini: filtered.length, incassoPerCategoria,
      ordiniPerFasciaOraria, prezzoMedioPerFasciaOraria,
      topProdotti, andamentoFatturato,
      tempiCompletamento, tempoMedioCompletamento, confrontoSerate,
      unrealizedGiftRevenue: parseFloat(unrealizedGiftRevenue.toFixed(2)),
      topGiftProducts
    };
  }, [orders, sessions, selectedSessionIds, products]);

  const handleExportCSV = async (session) => {
    try {
      const res = await fetch(`${API_URL}/exports/session/${session.id}/csv`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const blob = new Blob([await res.text()], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${(session.name || `sessione_${session.id}`).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch {
      alert('Impossibile scaricare il CSV.');
    }
  };

  // Filtra le ore con dati per grafici più puliti
  const activeHours = (data, key) => data.filter(d => d[key] > 0);
  // La mezzanotte (00:00) è la fine della serata precedente, non l'inizio: la spostiamo in fondo
  const reorderHours = (data) => [...data.slice(1), data[0]];

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
      <p className="font-black uppercase tracking-widest text-xs">Caricamento...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-500">
      <p className="font-black uppercase tracking-widest text-xs">{error}</p>
    </div>
  );

  const closedSessions = sessions.filter(s => !!s.end_time);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-[var(--text-main)]">STATISTICHE</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">
            {selectedSessionIds.length > 0 ? `${selectedSessionIds.length} sessioni selezionate` : 'Tutte le sessioni'}
          </p>
        </div>
        <button onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all">
          <Download size={14} /> Esporta CSV
        </button>
      </div>

      {/* Filtro sessioni — checkbox */}
      {sessions.length > 0 && (
        <ChartCard title="Filtra per sessione">
          <div className="flex flex-wrap gap-2">
            {sessions.map(s => {
              const selected = selectedSessionIds.includes(String(s.id));
              return (
                <button key={s.id} onClick={() => toggleSession(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${selected
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'bg-[var(--bg-card-2)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/50'
                    }`}>
                  {selected ? <CheckSquare size={13} /> : <Square size={13} />}
                  {s.name || new Date(s.start_time).toLocaleDateString('it-IT')}
                  {!s.end_time && <span className="text-[9px] opacity-70">(in corso)</span>}
                </button>
              );
            })}
            {selectedSessionIds.length > 0 && (
              <button onClick={() => setSelectedSessionIds([])}
                className="px-3 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/30 transition-all">
                Rimuovi filtri
              </button>
            )}
          </div>
        </ChartCard>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Totale serata" value={formatEuro(stats.totaleSerata)} />
        <StatCard label="Importo medio" value={formatEuro(stats.importoMedio)} />
        <StatCard label="Totale ordini" value={stats.numeroTotaleOrdini} />
        <StatCard label="Top prodotto" value={stats.prodottoPiuVenduto || '—'} />
        <StatCard label="Guadagno non realizzato (omaggi)" value={formatEuro(stats.unrealizedGiftRevenue)} sub="Prodotti regalati a prezzo di listino" />
      </div>

      {stats.numeroTotaleOrdini === 0 ? (
        <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
          <p className="font-black uppercase tracking-widest text-xs">Nessun dato disponibile</p>
        </div>
      ) : (
        <>
          {/* Incasso per categoria */}
          {stats.incassoPerCategoria.length > 0 && (
            <ChartCard title="Incasso per categoria">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.incassoPerCategoria}>
                  <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatEuro(v)} />
                  <Bar dataKey="totale" fill="var(--accent)" name="Incasso" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Ordini per fascia oraria */}
          <ChartCard title="Ordini per fascia oraria">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activeHours(reorderHours(stats.ordiniPerFasciaOraria), 'count')}>
                <XAxis dataKey="ora" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--accent)" name="Ordini" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top 10 prodotti */}
          <ChartCard title="Top 10 prodotti">
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={stats.topProdotti} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="prodotto" tick={{ fontSize: 11 }} width={180} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--accent)" name="Quantità" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Confronto prodotto tra serate (head to head) */}
          {sessions.length > 1 && (
            <ChartCard title="Confronto prodotto tra serate (head to head)">
              <div className="flex flex-wrap gap-2 mb-4">
                <select value={h2hSessionA} onChange={e => setH2hSessionA(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card-2)] text-xs font-bold text-[var(--text-main)]">
                  <option value="">Serata A…</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name || new Date(s.start_time).toLocaleDateString('it-IT')}</option>)}
                </select>
                <select value={h2hSessionB} onChange={e => setH2hSessionB(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card-2)] text-xs font-bold text-[var(--text-main)]">
                  <option value="">Serata B…</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name || new Date(s.start_time).toLocaleDateString('it-IT')}</option>)}
                </select>
                <select value={h2hProduct} onChange={e => setH2hProduct(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card-2)] text-xs font-bold text-[var(--text-main)]">
                  <option value="">Seleziona prodotto…</option>
                  {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {h2hData ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={h2hData}>
                    <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="A" name={sessionAName} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="B" name={sessionBName} fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-8">
                  Seleziona un prodotto e due serate da confrontare.
                </p>
              )}
            </ChartCard>
          )}

          {/* Prezzo medio per fascia oraria */}
          <ChartCard title="Prezzo medio ordine per fascia oraria">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activeHours(reorderHours(stats.prezzoMedioPerFasciaOraria), 'prezzoMedio')}>
                <XAxis dataKey="ora" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatEuro(v)} />
                <Bar dataKey="prezzoMedio" fill="var(--accent)" name="Prezzo medio" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Andamento fatturato cumulativo */}
          <ChartCard title="Andamento fatturato cumulativo">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={activeHours(reorderHours(stats.andamentoFatturato), 'totale')}>
                <XAxis dataKey="ora" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatEuro(v)} />
                <Line type="monotone" dataKey="totale" stroke="var(--accent)" name="Fatturato" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {stats.topGiftProducts.length > 0 && (
            <ChartCard title="Mancato incasso per omaggi (per prodotto)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topGiftProducts} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="product" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatEuro(v)} />
                  <Bar dataKey="missedRevenue" fill="var(--accent)" name="Mancato incasso" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}


          {/* Tempo medio completamento */}
          <ChartCard title={`Tempo medio completamento ordini — ${formatMin(stats.tempoMedioCompletamento)}`}>
            {stats.tempoMedioCompletamento === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">
                Nessun ordine con tempo di completamento registrato.
                {' '}I tempi vengono registrati solo in modalità ordini avanzata.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activeHours(reorderHours(stats.tempiCompletamento), 'media')}>
                  <XAxis dataKey="ora" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMin(v)} />
                  <Bar dataKey="media" fill="var(--accent)" name="Tempo medio (min)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Confronto serate */}
          {stats.confrontoSerate.length > 1 && (
            <ChartCard title="Confronto serate">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Sessione', 'Totale', 'Ordini', 'Medio'].map(h => (
                      <th key={h} className="text-left p-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.confrontoSerate.map(s => (
                    <tr key={s.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-2)] transition-colors">
                      <td className="p-2 font-bold text-[var(--text-main)]">{s.name}</td>
                      <td className="p-2 font-black text-[var(--accent)]">{formatEuro(s.totale)}</td>
                      <td className="p-2 text-[var(--text-muted)]">{s.numero}</td>
                      <td className="p-2 text-[var(--text-muted)]">{formatEuro(s.medio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ChartCard>
          )}
        </>
      )}

      {/* Modale export CSV */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">Esporta Report CSV</h3>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Solo sessioni concluse</p>
              </div>
              <button onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-input)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto space-y-2 no-scrollbar">
              {closedSessions.length === 0 ? (
                <p className="text-xs text-center text-[var(--text-muted)] py-6 italic">Nessuna sessione conclusa disponibile.</p>
              ) : closedSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-2)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-bold text-[var(--text-main)] truncate">{s.name || `Sessione ${s.id}`}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Chiusa il {new Date(s.end_time).toLocaleDateString('it-IT')} alle {new Date(s.end_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => handleExportCSV(s)}
                    className="p-2 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-white transition-all shrink-0">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
