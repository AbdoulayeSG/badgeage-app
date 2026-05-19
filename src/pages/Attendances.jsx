// src/pages/Attendances.jsx
// Complete attendance report: list all people with their arrival/departure times by group
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { Users, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Attendances() {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [people, setPeople] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));

  // Load groups and people
  const loadGroups = async () => {
    try {
      const gSnap = await getDocs(
        query(collection(db, 'groups'), where('userId', '==', currentUser.uid))
      );
      const groupList = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(groupList);
      
      // Select first group by default
      if (groupList.length > 0 && !selectedGroup) {
        setSelectedGroup(groupList[0].id);
      }
    } catch (e) {
      console.error('Load groups error:', e);
      toast.error('Erreur lors du chargement des groupes');
    }
  };

  // Load people and attendances for selected group
  const loadData = async () => {
    if (!selectedGroup) return;
    setLoading(true);
    
    try {
      // Load all people
      const pSnap = await getDocs(
        query(collection(db, 'people'), where('userId', '==', currentUser.uid))
      );
      const allPeople = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter by selected group
      const groupPeople = allPeople.filter(p => p.groupId === selectedGroup);
      setPeople(groupPeople);

      // Load all attendance logs
      const aSnap = await getDocs(
        query(collection(db, 'attendanceLogs'), where('userId', '==', currentUser.uid))
      );
      const allLogs = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter by date and group people
      const groupPersonIds = new Set(groupPeople.map(p => p.id));
      const filteredLogs = allLogs.filter(log => 
        log.date === dateFilter && groupPersonIds.has(log.personId)
      );
      
      setAttendances(filteredLogs);
    } catch (e) {
      console.error('Load data error:', e);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, [currentUser]);
  useEffect(() => { loadData(); }, [selectedGroup, dateFilter]);

  // Get attendance for a person
  const getAttendance = (personId) => {
    return attendances.find(a => a.personId === personId);
  };

  // Get group name
  const getGroupName = (groupId) => {
    const g = groups.find(gr => gr.id === groupId);
    return g?.name || 'Groupe inconnu';
  };

  return (
    <div className="fade-up space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
          Présences Détaillées
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Liste complète avec heures d'arrivée et départ
        </p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
        {/* Date filter */}
        <div>
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Date
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="mt-1 px-3 py-2 rounded-lg border"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        {/* Group filter */}
        <div className="flex-1">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Groupe
          </label>
          <select
            value={selectedGroup || ''}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
            }}
          >
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="spinner" />
        </div>
      ) : people.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center" style={{ color: 'var(--text-muted)' }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>Aucune personne dans ce groupe</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Prénom</th>
                <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Nom</th>
                <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Email</th>
                <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Téléphone</th>
                <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Heure Arrivée</th>
                <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Heure Départ</th>
                <th className="text-left px-4 py-3" style={{ color: 'var(--text-muted)' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const att = getAttendance(person.id);
                const isPresent = att?.status === 'arrived';
                
                return (
                  <tr key={person.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-main)' }}>
                      {person.firstName}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-main)' }}>
                      {person.lastName}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {person.email || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {person.phone || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-main)' }}>
                      {att?.arrivalTime || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-main)' }}>
                      {att?.departureTime || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: isPresent ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: isPresent ? '#22c55e' : '#ef4444',
                        }}
                      >
                        {isPresent ? '✅ Présent' : '❌ Absent'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {!loading && people.length > 0 && (
        <div className="card">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total personnes</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                {people.length}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Présentes</p>
              <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                {attendances.filter(a => a.status === 'arrived').length}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Absentes</p>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                {people.length - attendances.filter(a => a.status === 'arrived').length}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Taux présence</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                {people.length ? Math.round((attendances.filter(a => a.status === 'arrived').length / people.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
