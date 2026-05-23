import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download } from 'lucide-react'; // Importiamo l'icona per il download

const API_URL = import.meta.env.VITE_API_URL;

const StatCard = ({ label, value }) => (
  <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
    <p className="text-2xl font-black tracking-tighter text-[var(--text-main)]">{value}</p>
  </div>
);

const empty = {
  totaleSerata: 0, importoMedio: 0, prodottoPiuVenduto: '',
  ordiniPerFasciaOraria: [], prezzoMedioPerFasciaOraria: [],
  numeroTotaleOrdini: 0, topProdotti: [], andamentoFatturato: [],
  tempiCompletamento: [], tempoMedioCompletamento: 0, confrontoSerate: []
};

const Statistics = () => {
  const [stats, setStats] = useState(empty);
  const [orders, setOrders] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resO, resS] = await Promise.all([
          fetch(`${API_URL}/orders`),
          fetch(`${API_URL}/sessions`)
        ]);
        const ordersData = await resO.json();
        const sessionsData = await resS.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!orders.length) { setStats(empty); return; }

    let filtered = orders.filter(o => o.status === "completed");
    if (selectedSessionIds.length > 0 && sessions.length > 0) {
      filtered = filtered.filter(o => sessions.some(s => {
        if (!selectedSessionIds.includes(String(s.id))) return false;
        const d = new Date(o.created_at);
        return d >= new Date(s.start_time) && d <= (s.end_time ? new Date(s.end_time) : new Date());
      }));
    }
    if (!filtered.length) { setStats(empty); return; }

    const totaleSerata = filtered.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const importoMedio = totaleSerata / filtered.length;

    const productCount = {};
    filtered.forEach(o => o.items?.forEach(i => {
      if (i.name) productCount[i.name] = (productCount[i.name] || 0) + Number(i.quantity || 0);
    }));
    const prodottoPiuVenduto = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const ordiniPerFasciaOraria = Array.from({ length: 24 }, (_, h) => ({ ora: h, count: 0 }));
    filtered.forEach(o => { ordiniPerFasciaOraria[new Date(o.created_at).getHours()].count += 1; });

    const prezzoPerFascia = Array.from({ length: 24 }, (_, h) => ({ ora: h, total: 0, count: 0 }));
    filtered.forEach(o => {
      const h = new Date(o.created_at).getHours();
      prezzoPerFascia[h].total += Number(o.total || 0);
      prezzoPerFascia[h].count += 1;
    });
    const prezzoMedioPerFasciaOraria = prezzoPerFascia.map(f => ({
      ora: f.ora, prezzoMedio: f.count > 0 ? f.total / f.count : 0
    }));

    const andamentoFatturato = Array.from({ length: 24 }, (_, h) => ({ ora: h, totale: 0 }));
    let cumulative = 0;
    [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).forEach(o => {
      const h = new Date(o.created_at).getHours();
      cumulative += Number(o.total || 0);
      andamentoFatturato[h].totale = cumulative;
    });

    const tempi = [];
    filtered.forEach(o => {
      if (o.created_at && o.completed_at) {
        const diff = (new Date(o.completed_at) - new Date(o.created_at)) / 60000;
        if (diff >= 0) tempi.push({ ora: new Date(o.created_at).getHours(), diff });
      }
    });
    const tempoMedioCompletamento = tempi.length > 0
      ? tempi.reduce((sum, t) => sum + t.diff, 0) / tempi.length : 0;
    const tempiCompletamento = Array.from({ length: 24 }, (_, h) => ({ ora: h, media: 0, count: 0 }));
    tempi.forEach(t => { tempiCompletamento[t.ora].media += t.diff; tempiCompletamento[t.ora].count += 1; });
    tempiCompletamento.forEach(t => { if (t.count > 0) t.media = t.media / t.count; });

    const confrontoSerate = sessions.map(s => {
      const so = orders.filter(o => {
        if (o.status !== "completed") return false;
        const d = new Date(o.created_at);
        return d >= new Date(s.start_time) && d <= (s.end_time ? new Date(s.end_time) : new Date());
      });
      const totale = so.reduce((sum, o) => sum + Number(o.total || 0), 0);
      return { id: s.id, data: new Date(s.start_time).toLocaleDateString(), totale, numero: so.length, medio: so.length > 0 ? totale / so.length : 0 };
    });

    const topProdotti = Object.entries(productCount)
      .map(([name, count]) => ({ prodotto: name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    setStats({
      totaleSerata, importoMedio, prodottoPiuVenduto,
      ordiniPerFasciaOraria, prezzoMedioPerFasciaOraria,
      numeroTotaleOrdini: filtered.length, topProdotti,
      andamentoFatturato, tempiCompletamento, tempoMedioCompletamento, confrontoSerate
    });
  }, [orders, sessions, selectedSessionIds]);

  // Logica nativa di esportazione CSV dei dati d'ordine relativi a una singola sessione chiusa
  const handleExportSessionCSV = (session) => {
    if (!session.end_time) return;

    // Filtriamo gli ordini completati della sessione specifica
    const sessionOrders = orders.filter(o => {
      if (o.status !== "completed") return false;
      const d = new Date(o.created_at);
      return d >= new Date(session.start_time) && d <= new Date(session.end_time);
    });

    // Intestazioni del file CSV (formato standard internazionale compatibile con Excel)
    const headers = ["ID Ordine", "Data/Ora Creazione", "Prodotto", "Categoria", "Quantita", "Prezzo Unitario", "Prezzo Totale Riga", "Note Prodotto", "Totale Intero Ordine"];

    const rows = [];
    sessionOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const quantity = Number(item.quantity || 0);
          const price = Number(item.price || 0);
          rows.push([
            order.id,
            new Date(order.created_at).toLocaleString(),
            `"${(item.name || '').replace(/"/g, '""')}"`, // Sanitizzazione virgolette
            `"${(item.category || 'Generico').replace(/"/g, '""')}"`,
            quantity,
            price.toFixed(2),
            (quantity * price).toFixed(2),
            `"${(item.note || '').replace(/"/g, '""')}"`,
            Number(order.total || 0).toFixed(2)
          ]);
        });
      }
    });

    // Creazione della stringa CSV unendo intestazioni e righe
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    // Generazione del file ed esecuzione del download nativo nel browser
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const sanitizedSessionName = (session.name || `Sessione_${session.id}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `export_${sanitizedSessionName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatEuro = (v) => Number(v || 0).toFixed(2) + ' €';
  const formatMin = (v) => Number(v || 0).toFixed(1) + ' min';
  const tooltipStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid #333', borderRadius: 12, color: 'var(--text-main)' };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-black tracking-tighter text-[var(--text-main)]">STATISTICHE</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Analisi sessioni e vendite</p>
      </div>

      <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)]">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Filtra per sessione</label>
        <select
          multiple
          value={selectedSessionIds}
          onChange={(e) => setSelectedSessionIds(Array.from(e.target.selectedOptions, o => o.value))}
          className="w-full rounded-xl p-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm font-medium mb-4"
        >
          {sessions.map(s => (
            <option key={s.id} value={String(s.id)}>
              {s.name || new Date(s.start_time).toLocaleDateString()} {s.end_time ? '— chiusa' : '(in corso)'}
            </option>
          ))}
        </select>

        {/* Nuova sezione nativa: Esporta dati delle sessioni chiuse */}
        <div className="pt-4 border-t border-dashed border-[var(--border)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Scarica dati grezzi CSV (Solo sessioni chiuse)</p>
          <div className="flex flex-wrap gap-2">
            {sessions.map(s => {
              const isClosed = !!s.end_time;
              return (
                <button
                  key={s.id}
                  disabled={!isClosed}
                  onClick={() => handleExportSessionCSV(s)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border
                    ${isClosed
                      ? 'bg-[var(--bg-card-2)] border-[var(--border)] text-[var(--text-main)] hover:border-orange-500 hover:text-orange-500 cursor-pointer'
                      : 'bg-gray-500/5 border-gray-500/10 text-gray-500 opacity-40 cursor-not-allowed'}`}
                  title={isClosed ? `Scarica CSV per ${s.name || 'questa sessione'}` : "La sessione deve essere chiusa per esportare i dati"}
                >
                  <Download size={14} />
                  <span>{s.name || new Date(s.start_time).toLocaleDateString()}</span>
                </button>
              );
            })}
            {sessions.length === 0 && <p className="text-xs text-gray-500 italic">Nessuna sessione presente nel sistema.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Totale serata" value={formatEuro(stats.totaleSerata)} />
        <StatCard label="Importo medio" value={formatEuro(stats.importoMedio)} />
        <StatCard label="Totale ordini" value={stats.numeroTotaleOrdini} />
        <StatCard label="Top prodotto" value={stats.prodottoPiuVenduto || '—'} />
      </div>

      {[
        { title: 'Ordini per fascia oraria', data: stats.ordiniPerFasciaOraria, key: 'count', color: '#f97316', label: 'Ordini', xKey: 'ora' },
        { title: 'Prezzo medio per fascia oraria', data: stats.prezzoMedioPerFasciaOraria, key: 'prezzoMedio', color: '#10b981', label: 'Prezzo medio', xKey: 'ora', fmt: formatEuro },
        { title: 'Top 10 prodotti', data: stats.topProdotti, key: 'count', color: '#f59e0b', label: 'Quantità', xKey: 'prodotto', height: 280 },
      ].map(({ title, data, key, color, label, xKey = 'ora', fmt, height = 200 }) => (
        <div key={title} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{title}</p>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} angle={xKey === 'prodotto' ? -35 : 0} textAnchor={xKey === 'prodotto' ? 'end' : 'middle'} height={xKey === 'prodotto' ? 70 : 30} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={fmt ? (v) => fmt(v) : undefined} />
              <Bar dataKey={key} fill={color} name={label} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}

      <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)]">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Andamento fatturato cumulativo</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.andamentoFatturato}>
            <XAxis dataKey="ora" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatEuro(v)} />
            <Line type="monotone" dataKey="totale" stroke="#f97316" name="Fatturato" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)]">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Tempo medio completamento ordini: <span className="text-orange-500">{formatMin(stats.tempoMedioCompletamento)}</span></p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.tempiCompletamento}>
            <XAxis dataKey="ora" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMin(v)} />
            <Bar dataKey="media" fill="#ef4444" name="Tempo medio (min)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)]">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Confronto serate</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Data', 'Totale', 'Ordini', 'Medio'].map(h => (
                <th key={h} className="text-left p-2 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.confrontoSerate.map(s => (
              <tr key={s.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-2)] transition-colors">
                <td className="p-2 font-bold text-[var(--text-main)]">{s.data}</td>
                <td className="p-2 font-black text-orange-500">{formatEuro(s.totale)}</td>
                <td className="p-2 text-[var(--text-muted)]">{s.numero}</td>
                <td className="p-2 text-[var(--text-muted)]">{formatEuro(s.medio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Statistics;