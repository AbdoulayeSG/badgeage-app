// src/pages/Scanner.jsx
// QR code scanner page using the browser camera.
// On scan: records arrival if not yet present, or departure if already arrived.
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { QrCode, CheckCircle, XCircle, Camera } from 'lucide-react';

// Format time HH:MM:SS
const timeStr = () => new Date().toLocaleTimeString('fr-FR');
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Scanner() {
  const { currentUser } = useAuth();
  const [scanning, setScanning]   = useState(false);
  const [lastResult, setResult]   = useState(null); // { person, action, time }
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef(null);
  const html5Ref   = useRef(null);

  // Start camera scanner
  const startScanner = async () => {
    setScanning(true);
    try {
      const html5 = new Html5Qrcode('reader');
      html5Ref.current = html5;
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScan,
        (err) => { /* ignore scan frame errors */ }
      );
    } catch (err) {
      toast.error('Impossible d\'accéder à la caméra : ' + err.message);
      setScanning(false);
    }
  };

  // Stop scanner
  const stopScanner = async () => {
    if (html5Ref.current) {
      try { await html5Ref.current.stop(); } catch {}
      html5Ref.current = null;
    }
    setScanning(false);
  };

  // Called when a QR code is detected
  const onScan = async (decoded) => {
    if (processing) return;
    setProcessing(true);

    try {
      // Look up person by qrString - load all people for user, filter by qrString
      const pSnap = await getDocs(
        query(
          collection(db, 'people'),
          where('userId', '==', currentUser.uid)
        )
      );
      
      const personDoc = pSnap.docs.find(d => d.data().qrString === decoded);
      if (!personDoc) {
        toast.error('QR code inconnu ou ne vous appartient pas.');
        setProcessing(false);
        return;
      }

      const person    = { id: personDoc.id, ...personDoc.data() };
      const today     = todayStr();

      // Check if already has logs today for this person
      const logSnap = await getDocs(
        query(
          collection(db, 'attendanceLogs'),
          where('personId', '==', person.id),
          where('date', '==', today)
        )
      );
      
      // Find if there's an "arrived" status log
      const arrivedLog = logSnap.docs.find(d => d.data().status === 'arrived');

      if (!arrivedLog) {
        // First scan today → record arrival
        await addDoc(collection(db, 'attendanceLogs'), {
          personId:  person.id,
          userId:    currentUser.uid,
          date:      today,
          arrivalTime: timeStr(),
          departureTime: null,
          status:    'arrived',
          createdAt: serverTimestamp(),
        });
        setResult({ person, action: 'arrived', time: timeStr() });
        toast.success(`✅ Arrivée enregistrée : ${person.firstName} ${person.lastName}`);
      } else {
        // Already arrived → record departure
        const logDoc = arrivedLog;
        await updateDoc(doc(db, 'attendanceLogs', logDoc.id), {
          departureTime: timeStr(),
          status: 'departed',
        });
        setResult({ person, action: 'departed', time: timeStr() });
        toast.success(`🚪 Départ enregistré : ${person.firstName} ${person.lastName}`);
      }
    } catch (err) {
      console.error('Scanner error:', err);
      toast.error('Erreur lors du traitement du QR code: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="fade-up space-y-6" style={{ maxWidth: 600 }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Scanner QR</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Pointez la caméra sur le QR code d'une personne
        </p>
      </div>

      {/* Scanner box */}
      <div className="card flex flex-col items-center gap-4">
        {/* Camera viewfinder */}
        <div
          id="reader"
          style={{
            width: '100%',
            maxWidth: 400,
            minHeight: scanning ? 300 : 0,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#000',
          }}
        />

        {!scanning && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Camera size={36} style={{ color: 'var(--primary)' }} />
            </div>
            <p style={{ color: 'var(--text-muted)' }}>La caméra est inactive</p>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={scanning ? stopScanner : startScanner}
          disabled={processing}
          className={`btn ${scanning ? 'btn-danger' : 'btn-primary'}`}
          style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          {scanning ? (
            <><XCircle size={18} /> Arrêter le scan</>
          ) : (
            <><QrCode size={18} /> Démarrer le scan</>
          )}
        </button>

        {processing && (
          <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Traitement en cours…
          </div>
        )}
      </div>

      {/* Last scan result */}
      {lastResult && (
        <div
          className="card flex items-center gap-4"
          style={{
            borderColor: lastResult.action === 'arrived'
              ? 'rgba(34,197,94,0.4)'
              : 'rgba(239,68,68,0.4)',
            background: lastResult.action === 'arrived'
              ? 'rgba(34,197,94,0.05)'
              : 'rgba(239,68,68,0.05)',
          }}>
          {lastResult.action === 'arrived'
            ? <CheckCircle size={36} style={{ color: '#22c55e', flexShrink: 0 }} />
            : <XCircle size={36} style={{ color: '#ef4444', flexShrink: 0 }} />
          }
          <div>
            <p className="font-semibold text-lg" style={{ color: 'var(--text-main)' }}>
              {lastResult.person.firstName} {lastResult.person.lastName}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {lastResult.action === 'arrived' ? '✅ Arrivée' : '🚪 Départ'} enregistré à{' '}
              <strong style={{ color: 'var(--text-main)' }}>{lastResult.time}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}>
        <h3 className="font-medium mb-2" style={{ color: 'var(--text-main)' }}>
          ℹ️ Comment ça fonctionne
        </h3>
        <ul className="space-y-1" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <li>• <strong>1er scan du jour</strong> → enregistre l'heure d'arrivée 🟢</li>
          <li>• <strong>2e scan du jour</strong> → enregistre l'heure de départ 🔴</li>
          <li>• Les QR codes sont uniques par personne</li>
          <li>• Les données sont sauvegardées instantanément dans Firestore</li>
        </ul>
      </div>
    </div>
  );
}
