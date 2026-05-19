// src/pages/Groups.jsx
// CRUD page for managing groups of people
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, Pencil, Trash2, Users, X, Check } from 'lucide-react';

export default function Groups() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | 'edit'
  const [editTarget, setEdit] = useState(null); // group doc for editing
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [saving, setSaving]   = useState(false);

  // Load groups belonging to current user
  const load = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'groups'),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by createdAt descending
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setGroups(data);
    } catch (e) {
      console.error('Groups load error:', e);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Open create modal
  const openCreate = () => {
    setName(''); setDesc('');
    setModal('create');
  };

  // Open edit modal
  const openEdit = (group) => {
    setEdit(group);
    setName(group.name);
    setDesc(group.description || '');
    setModal('edit');
  };

  // Create group
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        description: desc.trim(),
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      toast.success('Groupe créé !');
      setModal(null);
      load();
    } catch (err) {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  // Update group
  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'groups', editTarget.id), {
        name: name.trim(),
        description: desc.trim(),
      });
      toast.success('Groupe mis à jour');
      setModal(null);
      load();
    } catch (err) {
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  // Delete group
  const handleDelete = async (group) => {
    if (!window.confirm(`Supprimer le groupe "${group.name}" ?`)) return;
    try {
      await deleteDoc(doc(db, 'groups', group.id));
      toast.success('Groupe supprimé');
      load();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression: ' + err.message);
    }
  };

  const closeModal = () => setModal(null);

  return (
    <div className="fade-up space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Groupes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {groups.length} groupe{groups.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={16} /> Créer un groupe
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><span className="spinner" /></div>
      ) : groups.length === 0 ? (
        <div className="card flex flex-col items-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
          <FolderOpen size={48} style={{ opacity: 0.3 }} />
          <p>Aucun groupe pour l'instant</p>
          <button onClick={openCreate} className="btn btn-primary mt-2">
            <Plus size={16} /> Créer mon premier groupe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map(group => (
            <div key={group.id} className="card"
                 style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                       style={{ background: 'rgba(99,102,241,0.15)' }}>
                    <FolderOpen size={20} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-main)' }}>
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                {/* View people */}
                <button
                  onClick={() => navigate(`/people?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}>
                  <Users size={14} /> Voir les membres
                </button>
                <button onClick={() => openEdit(group)} className="btn btn-secondary" title="Modifier">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(group)} className="btn btn-danger" title="Supprimer">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={closeModal} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
            }}>
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--text-main)' }}>
              {modal === 'create' ? 'Nouveau groupe' : 'Modifier le groupe'}
            </h2>
            <form onSubmit={modal === 'create' ? handleCreate : handleEdit} className="space-y-4">
              <div>
                <label className="form-label">Nom du groupe *</label>
                <input
                  className="form-input"
                  placeholder="Ex: Équipe Marketing"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required autoFocus
                />
              </div>
              <div>
                <label className="form-label">Description (optionnel)</label>
                <input
                  className="form-input"
                  placeholder="Description courte"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1 justify-center">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                  {saving
                    ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    : <><Check size={15} /> {modal === 'create' ? 'Créer' : 'Enregistrer'}</>
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
