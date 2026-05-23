import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

const StatCard = ({ label, value }) => (
  <div className="bg-white dark:bg-[#1c1f26] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
    <p className="text-2xl font-black tracking-tighter text-gray-900 dark:text-gray-100">{value}</p>
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

  const formatEuro = (v) => Number(v || 0).toFixed(2) + ' €';
  const formatMin = (v) => Number(v || 0).toFixed(1) + ' min';
  const tooltipStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid #333', borderRadius: 12, color: 'var(--text-main)' };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-gray-100">STATISTICHE</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Analisi sessioni e vendite</p>
      </div>

      <div className="bg-white dark:bg-[#1c1f26] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Filtra per sessione</label>
        <select
          multiple
          value={selectedSessionIds}
          onChange={(e) => setSelectedSessionIds(Array.from(e.target.selectedOptions, o => o.value))}
          className="w-full rounded-xl p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium"
        >
          {sessions.map(s => (
            <option key={s.id} value={String(s.id)}>
              {s.name || new Date(s.start_time).toLocaleDateString()} {s.end_time ? '— chiusa' : '(in corso)'}
            </option>
          ))}
        </select>
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
        <div key={title} className="bg-white dark:bg-[#1c1f26] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
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

      <div className="bg-white dark:bg-[#1c1f26] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
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

      <div className="bg-white dark:bg-[#1c1f26] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
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

      <div className="bg-white dark:bg-[#1c1f26] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Confronto serate</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {['Data', 'Totale', 'Ordini', 'Medio'].map(h => (
                <th key={h} className="text-left p-2 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.confrontoSerate.map(s => (
              <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="p-2 font-bold text-gray-900 dark:text-gray-100">{s.data}</td>
                <td className="p-2 font-black text-orange-500">{formatEuro(s.totale)}</td>
                <td className="p-2 text-gray-600 dark:text-gray-400">{s.numero}</td>
                <td className="p-2 text-gray-600 dark:text-gray-400">{formatEuro(s.medio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Statistics;