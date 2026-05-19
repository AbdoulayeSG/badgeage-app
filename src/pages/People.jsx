// src/pages/People.jsx
// Manage people in a group. Generates unique QR codes, shows presence status, allows QR download.
import { useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, addDoc, deleteDoc,
  doc, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  UserPlus, Trash2, Download, X, Check, CheckCircle, XCircle,
  ArrowLeft, UserCheck,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Helper: today as YYYY-MM-DD
const today = () => new Date().toISOString().slice(0, 10);

export default function People() {
  const { currentUser } = useAuth();
  const [params]        = useSearchParams();
  const navigate        = useNavigate();

  const groupId   = params.get('groupId');
  const groupName = params.get('groupName') || 'Groupe';

  const [people, setPeople]     = useState([]);
  const [present, setPresent]   = useState(new Set()); // personIds present today
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);

  // Form state
  const [lastName,  setLast]    = useState('');
  const [firstName, setFirst]   = useState('');
  const [phone,     setPhone]   = useState('');
  const [email,     setEmail]   = useState('');

  // Load people + presence status
  const load = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'people'),
        where('userId', '==', currentUser.uid),
        ...(groupId ? [where('groupId', '==', groupId)] : []),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch today's presence
      const logsSnap = await getDocs(
        query(
          collection(db, 'attendanceLogs'),
          where('userId', '==', currentUser.uid),
          where('date', '==', today()),
          where('status', '==', 'arrived')
        )
      );
      const presentSet = new Set(logsSnap.docs.map(d => d.data().personId));

      setPeople(list);
      setPresent(presentSet);
    } catch (e) {
      console.error(e);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  // Add a new person
  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const qrString = uuidv4(); // unique identifier for QR code
      await addDoc(collection(db, 'people'), {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phone:     phone.trim(),
        email:     email.trim(),
        groupId:   groupId || null,
        userId:    currentUser.uid,
        qrString,
        createdAt: serverTimestamp(),
      });
      toast.success('Personne ajoutée !');
      setModal(false);
      setFirst(''); setLast(''); setPhone(''); setEmail('');
      load();
    } catch (err) {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  // Delete a person
  const handleDelete = async (person) => {
    if (!window.confirm(`Supprimer ${person.firstName} ${person.lastName} ?`)) return;
    try {
      await deleteDoc(doc(db, 'people', person.id));
      toast.success('Personne supprimée');
      load();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Download QR code as PNG image
  const downloadQR = (person) => {
    const canvas = document.getElementById(`qr-${person.id}`);
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `QR-${person.firstName}-${person.lastName}.png`;
    a.click();
  };

  return (
    <div className="fade-up space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {groupId && (
            <button onClick={() => navigate('/groups')}
                    className="btn btn-secondary" style={{ padding: '0.4rem 0.7rem' }}>
              <ArrowLeft size={15} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
              {groupId ? groupName : 'Toutes les personnes'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {people.length} personne{people.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={() => setModal(true)} className="btn btn-primary">
          <UserPlus size={16} /> Ajouter
        </button>
      </div>

      {/* People list */}
      {loading ? (
        <div className="flex justify-center py-20"><span className="spinner" /></div>
      ) : people.length === 0 ? (
        <div className="card flex flex-col items-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
          <UserCheck size={48} style={{ opacity: 0.3 }} />
          <p>Aucune personne dans ce groupe</p>
          <button onClick={() => setModal(true)} className="btn btn-primary mt-2">
            <UserPlus size={16} /> Ajouter la 1ère personne
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Contact</th>
                <th>Statut</th>
                <th>QR Code</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {people.map(person => {
                const isPresent = present.has(person.id);
                return (
                  <tr key={person.id}>
                    {/* Name */}
                    <td>
                      <div className="font-medium" style={{ color: 'var(--text-main)' }}>
                        {person.firstName} {person.lastName}
                      </div>
                    </td>
                    {/* Contact */}
                    <td style={{ color: 'var(--text-muted)' }}>
                      <div className="text-xs">{person.email || '—'}</div>
                      <div className="text-xs">{person.phone || ''}</div>
                    </td>
                    {/* Status badge */}
                    <td>
                      <span className={`badge ${isPresent ? 'badge-green' : 'badge-red'}`}>
                        {isPresent
                          ? <><CheckCircle size={11} style={{ marginRight: 4 }} />Présent</>
                          : <><XCircle size={11} style={{ marginRight: 4 }} />Absent</>
                        }
                      </span>
                    </td>
                    {/* QR canvas (hidden, used for download) + visible QR */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ background: 'white', borderRadius: 8, padding: 4 }}>
                          <QRCodeCanvas
                            id={`qr-${person.id}`}
                            value={person.qrString}
                            size={48}
                            level="M"
                          />
                        </div>
                        <button
                          onClick={() => downloadQR(person)}
                          className="btn btn-secondary"
                          title="Télécharger QR code (PNG)"
                          style={{ padding: '0.35rem 0.6rem' }}>
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                    {/* Actions */}
                    <td>
                      <button
                        onClick={() => handleDelete(person)}
                        className="btn btn-danger"
                        title="Supprimer"
                        style={{ padding: '0.35rem 0.6rem' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Person Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setModal(false)} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
            }}>
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--text-main)' }}>
              Ajouter une personne
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Prénom *</label>
                  <input className="form-input" placeholder="Jean" value={firstName}
                         onChange={e => setFirst(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="form-label">Nom *</label>
                  <input className="form-input" placeholder="Dupont" value={lastName}
                         onChange={e => setLast(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="form-label">Email (optionnel)</label>
                <input className="form-input" type="email" placeholder="jean@exemple.com"
                       value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Téléphone (optionnel)</label>
                <input className="form-input" type="tel" placeholder="+33 6 00 00 00 00"
                       value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn btn-secondary flex-1 justify-center">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                  {saving
                    ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    : <><Check size={15} /> Ajouter</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
