// src/pages/Calendar.jsx
// Shows attendance logs per person with date, arrival, departure, and status
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';

// Days in a month utility
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Get day-of-week offset (Mon=0)
const startOffset = (year, month) => {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7; // Convert Sun=0 to Mon=0
};

const MON = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

export default function CalendarPage() {
  const { currentUser } = useAuth();
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [logs,  setLogs]  = useState([]);           // all logs for this month
  const [people, setPeople] = useState({});          // id -> name
  const [selected, setSelected] = useState(null);   // selected date string YYYY-MM-DD
  const [loading, setLoading]   = useState(true);

  // Build date string
  const dateStr = (d) => {
    const m = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${m}-${dd}`;
  };

  const load = async () => {
    setLoading(true);
    try {
      // All people for display names
      const pSnap = await getDocs(
        query(collection(db, 'people'), where('userId', '==', currentUser.uid))
      );
      const pMap = {};
      pSnap.forEach(d => { pMap[d.id] = d.data(); });
      setPeople(pMap);

      // Logs for the selected month
      const start = `${year}-${String(month+1).padStart(2,'0')}-01`;
      const end   = `${year}-${String(month+1).padStart(2,'0')}-${daysInMonth(year, month)}`;

      const lSnap = await getDocs(
        query(
          collection(db, 'attendanceLogs'),
          where('userId', '==', currentUser.uid),
          where('date', '>=', start),
          where('date', '<=', end)
        )
      );
      const logs = lSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by date ascending
      logs.sort((a, b) => a.date.localeCompare(b.date));
      setLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [year, month]);

  // Navigate months
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  // Logs for a specific date
  const logsForDate = (d) => logs.filter(l => l.date === dateStr(d));

  // Days that have logs (for highlighting)
  const activeDays = new Set(logs.map(l => parseInt(l.date.slice(8))));

  const days = daysInMonth(year, month);
  const offset = startOffset(year, month);

  const selectedLogs = selected ? logs.filter(l => l.date === selected) : [];

  return (
    <div className="fade-up space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Calendrier de présence</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Cliquez sur un jour pour voir les présences
        </p>
      </div>

      <div className="card">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }}>
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--text-main)' }}>
            {MONTHS_FR[month]} {year}
          </h2>
          <button onClick={nextMonth} className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {MON.map(d => (
            <div key={d} className="text-center text-xs font-semibold py-1"
                 style={{ color: 'var(--text-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Offset empty cells */}
          {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
          {/* Day cells */}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1;
            const ds = dateStr(d);
            const hasLogs = activeDays.has(d);
            const isToday = ds === new Date().toISOString().slice(0, 10);
            const isSel   = ds === selected;
            return (
              <button
                key={d}
                onClick={() => setSelected(ds === selected ? null : ds)}
                style={{
                  borderRadius: 8,
                  padding: '0.5rem 0.25rem',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  fontWeight: isToday ? 700 : 400,
                  border: isSel
                    ? '1px solid var(--primary)'
                    : '1px solid transparent',
                  background: isSel
                    ? 'rgba(99,102,241,0.2)'
                    : isToday
                    ? 'rgba(99,102,241,0.08)'
                    : 'transparent',
                  color: isToday ? 'var(--primary)' : 'var(--text-main)',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                {d}
                {hasLogs && (
                  <span style={{
                    display: 'block',
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#22c55e',
                    margin: '2px auto 0',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day details */}
      {selected && (
        <div className="card fade-up">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
            📅 {new Date(selected + 'T12:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </h3>
          {loading ? (
            <div className="flex justify-center py-6"><span className="spinner" /></div>
          ) : selectedLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Aucune présence enregistrée ce jour.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Personne</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {selectedLogs.map(log => {
                  const p = people[log.personId];
                  const name = p ? `${p.firstName} ${p.lastName}` : log.personId;
                  return (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>{name}</td>
                      <td style={{ color: '#22c55e' }}>{log.arrivalTime || '—'}</td>
                      <td style={{ color: '#ef4444' }}>{log.departureTime || '—'}</td>
                      <td>
                        <span className={`badge ${log.status === 'arrived' ? 'badge-green' : 'badge-red'}`}>
                          {log.status === 'arrived' ? 'Présent' : 'Parti'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
