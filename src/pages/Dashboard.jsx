// src/pages/Dashboard.jsx
// Dashboard page showing general statistics and attendance chart
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, UserCheck, UserX, FolderOpen, TrendingUp, Clock,
} from 'lucide-react';

// Format date as YYYY-MM-DD
const toDateStr = (date) => date.toISOString().slice(0, 10);

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats]     = useState({ groups: 0, people: 0, present: 0, absent: 0 });
  const [chartData, setChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadStats();
  }, [currentUser]);

  const loadStats = async () => {
    setLoading(true);
    const today = toDateStr(new Date());

    try {
      // Count groups
      const gSnap = await getDocs(
        query(collection(db, 'groups'), where('userId', '==', currentUser.uid))
      );

      // Count people
      const pSnap = await getDocs(
        query(collection(db, 'people'), where('userId', '==', currentUser.uid))
      );

      // Presence logs for today
      const logsToday = await getDocs(
        query(
          collection(db, 'attendanceLogs'),
          where('userId', '==', currentUser.uid),
          where('date', '==', today)
        )
      );

      // Build a set of personIds present today (status === 'arrived')
      const presentIds = new Set();
      logsToday.forEach(doc => {
        const d = doc.data();
        if (d.status === 'arrived') presentIds.add(d.personId);
      });

      // Chart: presence count for the last 7 days
      const chartDays = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        chartDays.push(toDateStr(d));
      }

      const chartPromises = chartDays.map(d =>
        getDocs(
          query(
            collection(db, 'attendanceLogs'),
            where('userId', '==', currentUser.uid),
            where('date', '==', d),
            where('status', '==', 'arrived')
          )
        ).then(snap => ({
          date: d.slice(5),     // MM-DD
          présents: snap.size,
        }))
      );

      const chartVals = await Promise.all(chartPromises);

      const totalPeople = pSnap.size;
      const presentCount = presentIds.size;

      setStats({
        groups:  gSnap.size,
        people:  totalPeople,
        present: presentCount,
        absent:  totalPeople - presentCount,
      });
      setChart(chartVals);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ label, value, icon: Icon, color, bg }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
           style={{ background: bg }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <p className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
          {loading ? '—' : value}
        </p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );

  return (
    <div className="fade-up space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
          Tableau de bord
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Vue d'ensemble de vos présences
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Groupes"   value={stats.groups}  icon={FolderOpen} color="#6366f1" bg="rgba(99,102,241,0.15)" />
        <StatCard label="Personnes" value={stats.people}  icon={Users}      color="#0ea5e9" bg="rgba(14,165,233,0.15)"  />
        <StatCard label="Présents"  value={stats.present} icon={UserCheck}  color="#22c55e" bg="rgba(34,197,94,0.15)"   />
        <StatCard label="Absents"   value={stats.absent}  icon={UserX}      color="#ef4444" bg="rgba(239,68,68,0.15)"   />
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-main)' }}>
            Fréquentation — 7 derniers jours
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="spinner" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-main)',
                }}
              />
              <Area
                type="monotone"
                dataKey="présents"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#cg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Today's time */}
      <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <Clock size={14} />
        <span className="text-xs">
          Données du {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
