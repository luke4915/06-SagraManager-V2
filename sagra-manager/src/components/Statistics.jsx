// Statistics.jsx
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

const Statistics = () => {
  const [stats, setStats] = useState({
    totaleSerata: 0,
    importoMedio: 0,
    prodottoPiuVenduto: '',
    ordiniPerFasciaOraria: [],
    prezzoMedioPerFasciaOraria: [],
    numeroTotaleOrdini: 0,
    ordiniPerProdotto: {},
    topProdotti: [],
    andamentoFatturato: [],
    tempiCompletamento: [],
    tempoMedioCompletamento: 0,
    confrontoSerate: []
  });

  const [orders, setOrders] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resOrders = await fetch(`${API_URL}/orders`);
        if (!resOrders.ok) throw new Error('Errore caricamento ordini');
        const ordersData = await resOrders.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);

        const resSessions = await fetch(`${API_URL}/sessions`);
        if (!resSessions.ok) throw new Error('Errore caricamento sessioni');
        const sessionsData = await resSessions.json();
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!orders.length) {
      setStats(prev => ({ ...prev,
        totaleSerata: 0,
        importoMedio: 0,
        prodottoPiuVenduto: '',
        ordiniPerFasciaOraria: [],
        prezzoMedioPerFasciaOraria: [],
        numeroTotaleOrdini: 0,
        ordiniPerProdotto: {},
        topProdotti: [],
        andamentoFatturato: [],
        tempiCompletamento: [],
        tempoMedioCompletamento: 0,
        confrontoSerate: []
      }));
      return;
    }

    let filtered = orders.filter(o => o.status === "completed");

    if (selectedSessionIds.length > 0 && sessions.length > 0) {
      filtered = filtered.filter(o => {
        return sessions.some(s => {
          if (!selectedSessionIds.includes(String(s.id))) return false;
          const start = new Date(s.start_time);
          const end = s.end_time ? new Date(s.end_time) : new Date();
          const d = new Date(o.created_at);
          return d >= start && d <= end;
        });
      });
    }

    if (filtered.length === 0) {
      setStats(prev => ({ ...prev,
        totaleSerata: 0,
        importoMedio: 0,
        prodottoPiuVenduto: '',
        ordiniPerFasciaOraria: [],
        prezzoMedioPerFasciaOraria: [],
        numeroTotaleOrdini: 0,
        ordiniPerProdotto: {},
        topProdotti: [],
        andamentoFatturato: [],
        tempiCompletamento: [],
        tempoMedioCompletamento: 0,
        confrontoSerate: []
      }));
      return;
    }

    const totaleSerata = filtered.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const importoMedio = totaleSerata / filtered.length;
    const numeroTotaleOrdini = filtered.length;

    const productCount = {};
    filtered.forEach(o => o.items?.forEach(i => {
      if (!i.name) return;
      productCount[i.name] = (productCount[i.name] || 0) + Number(i.quantity || 0);
    }));

    const prodottoPiuVenduto = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const ordiniPerFasciaOraria = Array.from({ length: 24 }, (_, h) => ({ ora: h, count: 0 }));
    filtered.forEach(o => {
      const h = new Date(o.created_at).getHours();
      ordiniPerFasciaOraria[h].count += 1;
    });

    const prezzoPerFascia = Array.from({ length: 24 }, (_, h) => ({ ora: h, total: 0, count: 0 }));
    filtered.forEach(o => {
      const h = new Date(o.created_at).getHours();
      prezzoPerFascia[h].total += Number(o.total || 0);
      prezzoPerFascia[h].count += 1;
    });
    const prezzoMedioPerFasciaOraria = prezzoPerFascia.map(f => ({
      ora: f.ora,
      prezzoMedio: f.count > 0 ? f.total / f.count : 0
    }));

    // 🔹 Andamento temporale del fatturato (cumulativo per ora)
    const andamentoFatturato = Array.from({ length: 24 }, (_, h) => ({ ora: h, totale: 0 }));
    let cumulative = 0;
    filtered
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .forEach(o => {
        const h = new Date(o.created_at).getHours();
        cumulative += Number(o.total || 0);
        andamentoFatturato[h].totale = cumulative;
      });

    // 🔹 Tempo medio di completamento ordini
    let tempi = [];
    filtered.forEach(o => {
      if (o.created_at && o.completed_at) {
        const diff = (new Date(o.completed_at) - new Date(o.created_at)) / 60000; // in minuti
        if (diff >= 0) tempi.push({ ora: new Date(o.created_at).getHours(), diff });
      }
    });
    const tempoMedioCompletamento = tempi.length > 0
      ? tempi.reduce((sum, t) => sum + t.diff, 0) / tempi.length
      : 0;

    const tempiCompletamento = Array.from({ length: 24 }, (_, h) => ({ ora: h, media: 0, count: 0 }));
    tempi.forEach(t => {
      tempiCompletamento[t.ora].media += t.diff;
      tempiCompletamento[t.ora].count += 1;
    });
    tempiCompletamento.forEach(t => {
      if (t.count > 0) t.media = t.media / t.count;
    });

    // 🔹 Confronto tra serate
    const confrontoSerate = sessions.map(s => {
      const sessionOrders = orders.filter(o => {
        if (o.status !== "completed") return false;
        const d = new Date(o.created_at);
        const start = new Date(s.start_time);
        const end = s.end_time ? new Date(s.end_time) : new Date();
        return d >= start && d <= end;
      });
      const totale = sessionOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const numero = sessionOrders.length;
      return {
        id: s.id,
        data: new Date(s.start_time).toLocaleDateString(),
        totale,
        numero,
        medio: numero > 0 ? totale / numero : 0
      };
    });

    // Top 10 prodotti
    const prodottiData = Object.entries(productCount)
      .map(([name, count]) => ({ prodotto: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setStats({
      totaleSerata,
      importoMedio,
      prodottoPiuVenduto,
      ordiniPerFasciaOraria,
      prezzoMedioPerFasciaOraria,
      numeroTotaleOrdini,
      ordiniPerProdotto: productCount,
      topProdotti: prodottiData,
      andamentoFatturato,
      tempiCompletamento,
      tempoMedioCompletamento,
      confrontoSerate
    });
  }, [orders, sessions, selectedSessionIds]);

  const formatEuro = (value) => Number(value || 0).toFixed(2) + ' €';
  const formatMin = (value) => Number(value || 0).toFixed(1) + ' min';

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg min-h-[400px] mt-2 flex flex-col gap-6 overflow-y-auto">
      <h2 className="text-xl font-bold mb-2">Statistiche sessioni</h2>

      {/* Dropdown sessioni */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Seleziona sessione/i</label>
        <select
          multiple
          value={selectedSessionIds}
          onChange={(e) => {
            const values = Array.from(e.target.selectedOptions, opt => opt.value);
            setSelectedSessionIds(values);
          }}
          className="w-full border rounded-lg p-4 dark:bg-gray-700 dark:text-white"
        >
          {sessions.map(s => (
            <option key={s.id} value={String(s.id)}>
              {new Date(s.start_time).toLocaleDateString()}{" "}
              {s.end_time ? "- chiusa" : "(in corso)"}
            </option>
          ))}
        </select>
      </div>

      {/* Totale, importo medio e numero ordini */}
      <div className="flex gap-6 flex-wrap">
        <div>
          <p className="text-gray-500">Totale serata</p>
          <p className="text-2xl font-bold">{formatEuro(stats.totaleSerata)}</p>
        </div>
        <div>
          <p className="text-gray-500">Importo medio per ordine</p>
          <p className="text-2xl font-bold">{formatEuro(stats.importoMedio)}</p>
        </div>
        <div>
          <p className="text-gray-500">Numero totale ordini</p>
          <p className="text-2xl font-bold">{stats.numeroTotaleOrdini}</p>
        </div>
        <div>
          <p className="text-gray-500">Prodotto più venduto</p>
          <p className="text-2xl font-bold">{stats.prodottoPiuVenduto || '-'}</p>
        </div>
      </div>

      {/* Grafico ordini per fascia oraria */}
      <div>
        <p className="text-gray-500 mb-2">Ordini per fascia oraria</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.ordiniPerFasciaOraria}>
            <XAxis dataKey="ora" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" name="Numero ordini" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Grafico prezzo medio per fascia oraria */}
      <div>
        <p className="text-gray-500 mb-2">Prezzo medio ordini per fascia oraria</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.prezzoMedioPerFasciaOraria}>
            <XAxis dataKey="ora" />
            <YAxis />
            <Tooltip formatter={(val) => formatEuro(val)} />
            <Legend />
            <Bar dataKey="prezzoMedio" fill="#10b981" name="Prezzo medio" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Grafico top 10 prodotti più venduti */}
      <div>
        <p className="text-gray-500 mb-2">Top 10 Prodotti più venduti</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.topProdotti || []}>
            <XAxis 
              dataKey="prodotto" 
              angle={-45} 
              textAnchor="end" 
              interval={0} 
              height={80} 
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#f59e0b" name="Quantità venduta" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Andamento temporale del fatturato */}
      <div>
        <p className="text-gray-500 mb-2">Andamento temporale del fatturato</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={stats.andamentoFatturato}>
            <XAxis dataKey="ora" />
            <YAxis />
            <Tooltip formatter={(val) => formatEuro(val)} />
            <Legend />
            <Line type="monotone" dataKey="totale" stroke="#6366f1" name="Fatturato cumulativo" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Tempo medio di completamento ordini */}
      <div>
        <p className="text-gray-500 mb-2">Tempo medio completamento ordini: <b>{formatMin(stats.tempoMedioCompletamento)}</b></p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.tempiCompletamento}>
            <XAxis dataKey="ora" />
            <YAxis />
            <Tooltip formatter={(val) => formatMin(val)} />
            <Legend />
            <Bar dataKey="media" fill="#ef4444" name="Tempo medio (min)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Confronto tra serate */}
      <div>
        <p className="text-gray-500 mb-2">Confronto tra serate</p>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2">Data</th>
              <th className="p-2">Totale</th>
              <th className="p-2">Ordini</th>
              <th className="p-2">Medio</th>
            </tr>
          </thead>
          <tbody>
            {stats.confrontoSerate.map(s => (
              <tr key={s.id} className="border-b">
                <td className="p-2">{s.data}</td>
                <td className="p-2">{formatEuro(s.totale)}</td>
                <td className="p-2">{s.numero}</td>
                <td className="p-2">{formatEuro(s.medio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Statistics;
