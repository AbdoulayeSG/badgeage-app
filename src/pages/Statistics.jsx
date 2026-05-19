// src/pages/Statistics.jsx
// Attendance statistics: bar chart of daily presence counts + summary table
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, getDocs, orderBy,
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { BarChart2, Calendar } from 'lucide-react';

export default function Statistics() {
  const { currentUser } = useAuth();
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState(30); // days to show

  const load = async () => {
    setLoading(true);
    try {
      // Build last N days
      const days = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }

      const startDate = days[0];
      const endDate   = days[days.length - 1];

      // Fetch logs in range
      const snap = await getDocs(
        query(
          collection(db, 'attendanceLogs'),
          where('userId', '==', currentUser.uid),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'asc')
        )
      );

      // Group by date, count arrivals
      const counts = {};
      days.forEach(d => { counts[d] = { arrivals: 0, departures: 0 }; });
      snap.forEach(doc => {
        const l = doc.data();
        if (!counts[l.date]) counts[l.date] = { arrivals: 0, departures: 0 };
        if (l.status === 'arrived' || l.arrivalTime) counts[l.date].arrivals++;
        if (l.status === 'departed' || l.departureTime) counts[l.date].departures++;
      });

      // Format for Recharts
      const chartData = days.map(d => ({
        date:     d.slice(5),        // MM-DD
        présents: counts[d].arrivals,
        départs:  counts[d].departures,
      }));

      setData(chartData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [range]);

  const total      = data.reduce((s, d) => s + d.présents, 0);
  const peak       = Math.max(...data.map(d => d.présents));
  const peakDay    = data.find(d => d.présents === peak)?.date || '—';
  const avg        = data.length ? (total / data.length).toFixed(1) : 0;

  return (
    <div className="fade-up space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Statistiques</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Fréquentation et tendances de présence
          </p>
        </div>
        {/* Range selector */}
        <div className="flex gap-2">
          {[7, 14, 30].map(r => (
            <button key={r} onClick={() => setRange(r)}
                    className={`btn ${range === r ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              {r}j
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total présences', value: total },
          { label: 'Pic du jour',     value: `${peak} (${peakDay})` },
          { label: 'Moyenne / jour',  value: avg },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{loading ? '—' : value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={18} style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-main)' }}>
            Présences par jour — {range} derniers jours
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><span className="spinner" /></div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval={range > 14 ? 2 : 0}
              />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-main)',
                }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="présents" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="départs"  fill="#0ea5e9" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Data table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: 'var(--primary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--text-main)' }}>
              Détail par date
            </h3>
          </div>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Arrivées</th>
                <th>Départs</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map(row => (
                <tr key={row.date}>
                  <td style={{ color: 'var(--text-main)' }}>{row.date}</td>
                  <td>
                    <span className="badge badge-green">{row.présents}</span>
                  </td>
                  <td>
                    <span className="badge badge-red">{row.départs}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
