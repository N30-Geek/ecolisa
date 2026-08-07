import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Plus,
  Folder,
  FileText,
  Archive,
  Camera,
  Eye,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  ScanLine,
  RotateCcw,
  FolderOpen,
  Download,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Eleve, MembrePersonnel, DocumentScolaire } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';

interface StudentDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Eleve;
  staff?: MembrePersonnel;
  mode?: 'student' | 'staff';
}

const formatBytes = (bytes = 0) => {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (d?: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

export const StudentDocumentsModal: React.FC<StudentDocumentsModalProps> = ({
  isOpen,
  onClose,
  student,
  staff,
  mode = 'student',
}) => {
  const [documents, setDocuments] = useState<DocumentScolaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'idle' | 'importing' | 'compressing' | 'renaming' | 'scanning'>('idle');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [scanOpen, setScanOpen] = useState(false);
  const [scanStream, setScanStream] = useState<MediaStream | null>(null);
  const [scanCaptured, setScanCaptured] = useState<string | null>(null);
  const [scanName, setScanName] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanDevices, setScanDevices] = useState<MediaDeviceInfo[]>([]);
  const [scanDeviceId, setScanDeviceId] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<DocumentScolaire | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ownerType = mode === 'staff' && staff ? 'staff' : 'student';
  const owner = ownerType === 'staff' ? staff! : student!;

  const docApi = useMemo(() => {
    if (ownerType === 'staff') {
      return {
        getDocuments: (id: string) => LocalDatabaseService.getStaffDocuments(id),
        importDocuments: (id: string) => LocalDatabaseService.importStaffDocuments(id),
        importFolder: (id: string) => LocalDatabaseService.importStaffFolder(id),
        importImage: (id: string, name: string, base64: string) => LocalDatabaseService.importStaffImage(id, name, base64),
        compressDocuments: (id: string, ids: string[]) => LocalDatabaseService.compressStaffDocuments(id, ids),
        deleteDocument: (id: string) => LocalDatabaseService.deleteStaffDocument(owner.id, id),
        readDocument: (id: string) => LocalDatabaseService.readStaffDocument(id),
        renameDocument: (id: string, newName: string) => LocalDatabaseService.renameStaffDocument(id, newName),
      };
    }
    return {
      getDocuments: (id: string) => LocalDatabaseService.getStudentDocuments(id),
      importDocuments: (id: string) => LocalDatabaseService.importStudentDocuments(id),
      importFolder: (id: string) => LocalDatabaseService.importStudentFolder(id),
      importImage: (id: string, name: string, base64: string) => LocalDatabaseService.importStudentImage(id, name, base64),
      compressDocuments: (id: string, ids: string[]) => LocalDatabaseService.compressStudentDocuments(id, ids),
      deleteDocument: (id: string) => LocalDatabaseService.deleteStudentDocument(id),
      readDocument: (id: string) => LocalDatabaseService.readStudentDocument(id),
      renameDocument: (id: string, newName: string) => LocalDatabaseService.renameStudentDocument(id, newName),
    };
  }, [ownerType, owner.id]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await docApi.getDocuments(owner.id);
      setDocuments(docs);
    } catch (err) {
      console.error('[StudentDocumentsModal] Erreur chargement documents :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setQuery('');
      setRenamingId(null);
      setShowAddMenu(false);
      return;
    }
    loadDocuments();
  }, [isOpen, owner.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(d =>
      d.originalName.toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q) ||
      (d.mimeType || '').toLowerCase().includes(q)
    );
  }, [documents, query]);

  const allSelected = filtered.length > 0 && filtered.every(d => selectedIds.has(d.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const n = new Set(prev);
        filtered.forEach(d => n.delete(d.id));
        return n;
      });
    } else {
      setSelectedIds(prev => {
        const n = new Set(prev);
        filtered.forEach(d => n.add(d.id));
        return n;
      });
    }
  };

  const handleImportFiles = async () => {
    setAction('importing');
    setShowAddMenu(false);
    try {
      const added = await docApi.importDocuments(owner.id);
      if (added && added.length) setDocuments(prev => [...added, ...prev]);
    } catch (err) {
      console.error('[Documents] Erreur import fichiers :', err);
    } finally {
      setAction('idle');
    }
  };

  const handleImportFolder = async () => {
    setShowAddMenu(false);
    setAction('importing');
    try {
      const added = await docApi.importFolder(owner.id);
      if (Array.isArray(added)) {
        setDocuments(prev => [...added, ...prev]);
      } else if (added) {
        setDocuments(prev => [added, ...prev]);
      }
    } catch (err) {
      console.error('[Documents] Erreur import dossier :', err);
    } finally {
      setAction('idle');
    }
  };

  const handleWiaScan = async () => {
    if ((window as any).electronAPI?.platform !== 'win32') {
      window.alert('Le scanner matériel WIA est uniquement disponible sur Windows.');
      setShowAddMenu(false);
      return;
    }
    setShowAddMenu(false);
    setAction('scanning');
    try {
      const res = await LocalDatabaseService.wiaScan(owner.id, 'DOSSIER_INSCRIPTION', ownerType === 'staff' ? 'STAFF' : 'STUDENT');
      if (!res || res.canceled || !res.success || !res.base64) {
        throw new Error(res?.error || 'Scan annulé');
      }
      const dataUrl = `data:${res.mimeType || 'image/jpeg'};base64,${res.base64}`;
      const fileName = `scan_wia_${owner.prenom}_${owner.nom}_${new Date().toISOString().slice(0, 10)}`.replace(/\s+/g, '_');
      const added = await docApi.importImage(owner.id, `${fileName}.jpg`, dataUrl);
      if (added) setDocuments(prev => [added, ...prev]);
    } catch (err: any) {
      console.error('[WIA] Erreur scan :', err);
      if (err?.message && err.message !== 'Scan annulé') {
        window.alert(err.message);
      }
    } finally {
      setAction('idle');
    }
  };

  const handleCompress = async () => {
    if (selectedIds.size === 0) return;
    setAction('compressing');
    try {
      const archive = await docApi.compressDocuments(owner.id, Array.from(selectedIds));
      if (archive && 'id' in archive) {
        setDocuments(prev => [archive as DocumentScolaire, ...prev]);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error('[Documents] Erreur compression :', err);
    } finally {
      setAction('idle');
    }
  };

  const handleDelete = async (doc: DocumentScolaire) => {
    if (!confirm(`Supprimer « ${doc.originalName} » ?`)) return;
    try {
      await docApi.deleteDocument(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(doc.id); return n; });
    } catch (err) {
      console.error('[Documents] Erreur suppression :', err);
    }
  };

  const openView = async (doc: DocumentScolaire) => {
    setViewerOpen(true);
    setViewerDoc(doc);
    setViewerUrl(null);
    setViewerLoading(true);
    setViewerError(null);
    setZoom(1);
    setPanning(false);
    try {
      const res = await docApi.readDocument(doc.id);
      if (!res) throw new Error('Fichier introuvable');
      const blob = await fetch(`data:${res.mimeType};base64,${res.data}`).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      setViewerUrl(url);
    } catch (err) {
      console.error('[Documents] Visualiseur :', err);
      setViewerError('Impossible de charger ce document.');
    } finally {
      setViewerLoading(false);
    }
  };

  const closeView = () => {
    setViewerOpen(false);
    setViewerDoc(null);
    setViewerError(null);
    setZoom(1);
    setPanning(false);
  };

  const handleDownload = () => {
    if (!viewerDoc || !viewerUrl) return;
    const a = document.createElement('a');
    a.href = viewerUrl;
    a.download = viewerDoc.originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  useEffect(() => {
    return () => { if (viewerUrl) URL.revokeObjectURL(viewerUrl); };
  }, [viewerUrl]);

  const startRename = (doc: DocumentScolaire) => {
    setRenamingId(doc.id);
    setRenameValue(doc.originalName);
  };

  const saveRename = async (id: string) => {
    if (!renameValue.trim()) return;
    setAction('renaming');
    try {
      const updated = await docApi.renameDocument(id, renameValue.trim());
      if (updated) {
        setDocuments(prev => prev.map(d => (d.id === id ? updated : d)));
      }
    } catch (err) {
      console.error('[Documents] Erreur renommage :', err);
    } finally {
      setRenamingId(null);
      setRenameValue('');
      setAction('idle');
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  // ── SCANNER / APPAREIL PHOTO ─────────────────────────────────────────────
  const enumerateScanDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setScanDevices(videoDevices);
      if (videoDevices.length && !scanDeviceId) {
        setScanDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('[Scanner] Énumération des périphériques :', err);
    }
  };

  const startScan = async (deviceId?: string | null) => {
    setScanOpen(true);
    setScanName(`scan_${owner.prenom}_${owner.nom}_${new Date().toISOString().slice(0, 10)}`.replace(/\s+/g, '_'));
    setScanCaptured(null);
    setScanError(null);
    setShowAddMenu(false);

    if (scanStream) {
      scanStream.getTracks().forEach(t => t.stop());
    }

    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' } },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setScanStream(stream);
      await enumerateScanDevices();
      const active = stream.getVideoTracks()[0];
      if (active?.getSettings().deviceId) {
        setScanDeviceId(active.getSettings().deviceId!);
      }
    } catch (err) {
      console.error('[Scanner] Accès caméra refusé :', err);
      setScanError('Accès à la source impossible. Vérifiez la permission ou choisissez une autre source.');
    }
  };

  useEffect(() => {
    if (scanStream && videoRef.current) {
      videoRef.current.srcObject = scanStream;
      videoRef.current.play().catch(() => {});
    }
  }, [scanStream, scanOpen]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png', 0.95);
    setScanCaptured(dataUrl);
    if (scanStream) {
      scanStream.getTracks().forEach(t => t.stop());
      setScanStream(null);
    }
  };

  const saveScan = async () => {
    if (!scanCaptured) return;
    setAction('scanning');
    try {
      const added = await docApi.importImage(owner.id, scanName, scanCaptured);
      if (added) {
        setDocuments(prev => [added, ...prev]);
        closeScan();
      }
    } catch (err) {
      console.error('[Scanner] Erreur sauvegarde :', err);
    } finally {
      setAction('idle');
    }
  };

  const closeScan = () => {
    if (scanStream) {
      scanStream.getTracks().forEach(t => t.stop());
    }
    setScanStream(null);
    setScanCaptured(null);
    setScanError(null);
    setScanOpen(false);
  };

  useEffect(() => {
    return () => {
      if (scanStream) scanStream.getTracks().forEach(t => t.stop());
    };
  }, [scanStream]);

  if (!isOpen) return null;

  let viewerContent: React.ReactNode = null;
  if (viewerLoading) {
    viewerContent = <p className="text-sm font-semibold text-slate-400">Chargement du document...</p>;
  } else if (viewerError) {
    viewerContent = (
      <div className="text-center">
        <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-200">{viewerError}</p>
      </div>
    );
  } else if (!viewerUrl || !viewerDoc) {
    viewerContent = null;
  } else if (viewerDoc.isArchive) {
    viewerContent = (
      <div className="text-center">
        <Archive className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-200 mb-1">Archive ZIP</p>
        <p className="text-xs text-slate-400 mb-4">Téléchargez l'archive pour l'ouvrir.</p>
        <button
          onClick={handleDownload}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" /> Télécharger
        </button>
      </div>
    );
  } else if (viewerDoc.mimeType?.startsWith('image/')) {
    viewerContent = (
      <img
        src={viewerUrl}
        alt={viewerDoc.originalName}
        draggable={false}
        className="rounded-xl shadow-2xl"
        style={{ width: `${zoom * 100}%`, height: 'auto', maxWidth: 'none', objectFit: 'contain' }}
      />
    );
  } else if (viewerUrl) {
    viewerContent = (
      <iframe
        src={viewerUrl}
        title={viewerDoc.originalName || 'Document'}
        className="rounded-xl"
        style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%`, background: '#ffffff', minWidth: '100%' }}
      />
    );
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> {ownerType === 'staff' ? 'Dossier Documents du Personnel' : 'Dossier Documents Scolaires'}
            </h2>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {owner.prenom} {owner.nom} · {documents.length} fichier{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un document..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-semibold border outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Ajouter dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(v => !v)}
                  disabled={action !== 'idle'}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/60 text-white text-xs font-black flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" /> Ajouter <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showAddMenu && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setShowAddMenu(false)} />
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-2xl border shadow-xl py-1 z-10"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                    >
                      <button
                        onClick={handleImportFiles}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 hover:bg-slate-500/5 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <FileText className="w-4 h-4 text-indigo-500" /> Choisir un fichier
                      </button>
                      <button
                        onClick={handleImportFolder}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 hover:bg-slate-500/5 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Folder className="w-4 h-4 text-amber-500" /> Choisir un dossier
                      </button>
                      <button
                        onClick={() => startScan()}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 hover:bg-slate-500/5 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Camera className="w-4 h-4 text-emerald-500" /> Caméra / Photo
                      </button>
                      <button
                        onClick={handleWiaScan}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 hover:bg-slate-500/5 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <ScanLine className="w-4 h-4 text-blue-500" /> Scanner matériel (WIA)
                      </button>
                    </div>
                  </>
                )}
              </div>

              {selectedIds.size > 0 && (
                <button
                  onClick={handleCompress}
                  disabled={action === 'compressing'}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/60 text-white text-xs font-black flex items-center gap-2 transition-all"
                >
                  <Archive className="w-4 h-4" />
                  {action === 'compressing' ? 'Compression...' : `Compresser (${selectedIds.size})`}
                </button>
              )}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <Check className="w-3.5 h-3.5" />
              {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''} sélectionné
            </div>
          )}
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chargement des documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div
              className="p-10 text-center rounded-2xl border"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
            >
              <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aucun document</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Joignez un fichier, un dossier ou utilisez le scanner.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Aucun résultat pour « {query} »</p>
            </div>
          ) : (
            <>
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                <button
                  onClick={toggleAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400 dark:border-slate-500'}`}
                >
                  {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
                <span className="flex-1">Nom</span>
                <span className="w-20 text-right hidden sm:block">Taille</span>
                <span className="w-28 text-right hidden md:block">Date</span>
                <span className="w-24 text-right">Actions</span>
              </div>

              {filtered.map(doc => {
                const isSelected = selectedIds.has(doc.id);
                const isImg = doc.mimeType?.startsWith('image/') || doc.category === 'Scan';
                const isArchive = doc.isArchive;
                const isRenaming = renamingId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className={`group flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'hover:bg-slate-500/5'}`}
                    style={{ borderColor: isSelected ? undefined : 'var(--border)' }}
                  >
                    <button
                      onClick={() => toggleSelect(doc.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400 dark:border-slate-500 bg-transparent'}`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>

                    <div className="shrink-0">
                      {isArchive ? (
                        <Archive className="w-5 h-5 text-amber-500" />
                      ) : doc.category === 'Scan' || isImg ? (
                        <Camera className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-indigo-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveRename(doc.id); if (e.key === 'Escape') cancelRename(); }}
                            autoFocus
                            className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          />
                          <button onClick={() => saveRename(doc.id)} className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelRename} className="p-1 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }} title={doc.originalName}>
                            {doc.originalName}
                          </p>
                          <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {doc.category || 'Document'}
                            {doc.isArchive ? ` · ${doc.archiveCount} fichier${doc.archiveCount !== 1 ? 's' : ''}` : ''}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="w-20 text-right text-[10px] font-bold hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                      {formatBytes(doc.sizeBytes)}
                    </div>

                    <div className="w-28 text-right text-[10px] font-bold hidden md:block" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(doc.createdAt)}
                    </div>

                    <div className="w-24 flex items-center justify-end gap-1">
                      <button
                        onClick={() => openView(doc)}
                        className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-colors"
                        title="Ouvrir"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => startRename(doc)}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
                        title="Renommer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
            {selectedIds.size > 0 ? `${selectedIds.size} sélectionné${selectedIds.size !== 1 ? 's' : ''}` : 'Sélectionnez des documents pour les compresser'}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-black border hover:bg-slate-500/5 transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Fermer
          </button>
        </div>

        {/* SCANNER OVERLAY */}
        {scanOpen && (
          <div className="fixed inset-0 z-[10000] bg-slate-950/95 flex flex-col p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-500 flex items-center gap-2 mb-2">
                  <ScanLine className="w-4 h-4" /> Scanner un document
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={scanDeviceId ?? ''}
                    onChange={e => {
                      const id = e.target.value || null;
                      setScanDeviceId(id);
                      if (id) startScan(id);
                    }}
                    className="w-full max-w-[320px] px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-slate-900 border-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                    disabled={!!scanCaptured}
                  >
                    <option value="">Source par défaut</option>
                    {scanDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Caméra / scanner ${d.deviceId.slice(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => startScan(scanDeviceId)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                    title="Actualiser la source"
                    disabled={!!scanCaptured}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <button
                onClick={closeScan}
                className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative rounded-2xl overflow-hidden bg-black border border-slate-800">
              {scanCaptured ? (
                <img src={scanCaptured} alt="Document scanné" className="w-full h-full object-contain" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {scanError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6" style={{ background: 'rgba(2,6,23,0.9)' }}>
                      <Camera className="w-12 h-12 text-slate-500 mb-3" />
                      <p className="text-sm font-bold text-white mb-1">Source indisponible</p>
                      <p className="text-xs text-slate-400 mb-4">{scanError}</p>
                      <button
                        onClick={() => { setScanError(null); startScan(scanDeviceId); }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Réessayer
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              {scanCaptured ? (
                <>
                  <input
                    type="text"
                    value={scanName}
                    onChange={e => setScanName(e.target.value)}
                    placeholder="Nom du document"
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border bg-slate-900 border-slate-700 text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button
                    onClick={() => { setScanCaptured(null); startScan(scanDeviceId); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-200 text-xs font-black hover:bg-slate-800 transition-all"
                  >
                    Reprendre
                  </button>
                  <button
                    onClick={saveScan}
                    disabled={action === 'scanning' || !scanName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white text-xs font-black transition-all"
                  >
                    {action === 'scanning' ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </>
              ) : (
                <button
                  onClick={captureImage}
                  disabled={!!scanError}
                  className="mx-auto w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Camera className="w-7 h-7 text-white" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* VIEWER OVERLAY */}
        {viewerOpen && (
          <div className="absolute inset-0 z-30 flex flex-col" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Visualiseur
                </h3>
                <p className="text-[11px] font-semibold mt-0.5 truncate max-w-[200px] sm:max-w-sm" style={{ color: 'var(--text-muted)' }}>
                  {viewerDoc?.originalName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!viewerUrl || viewerLoading}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white text-xs font-black flex items-center gap-2 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </button>
                <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setZoom(z => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))}
                    disabled={!viewerUrl || viewerLoading || viewerDoc?.isArchive || !!viewerError || zoom <= 0.25}
                    className="p-1.5 rounded-lg hover:bg-slate-500/10 disabled:opacity-40 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="Zoom arrière"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-black w-9 text-center" style={{ color: 'var(--text-primary)' }}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(z => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
                    disabled={!viewerUrl || viewerLoading || viewerDoc?.isArchive || !!viewerError || zoom >= 4}
                    className="p-1.5 rounded-lg hover:bg-slate-500/10 disabled:opacity-40 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    disabled={!viewerUrl || viewerLoading || viewerDoc?.isArchive || !!viewerError || zoom === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-500/10 disabled:opacity-40 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="Taille réelle"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={closeView}
                  className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              className={`flex-1 relative overflow-auto bg-slate-950/95 flex items-center justify-center p-4 select-none ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={e => { setPanning(true); e.preventDefault(); }}
              onMouseMove={e => {
                if (!panning || !e.currentTarget) return;
                e.currentTarget.scrollLeft -= e.movementX;
                e.currentTarget.scrollTop -= e.movementY;
              }}
              onMouseUp={() => setPanning(false)}
              onMouseLeave={() => setPanning(false)}
              onTouchStart={() => setPanning(true)}
              onTouchMove={e => {
                if (!panning || !e.currentTarget) return;
                const touch = e.touches[0];
                const prevTouch = (e as any).previousTouch;
                if (prevTouch) {
                  e.currentTarget.scrollLeft -= touch.clientX - prevTouch.clientX;
                  e.currentTarget.scrollTop -= touch.clientY - prevTouch.clientY;
                }
                (e as any).previousTouch = touch;
              }}
              onTouchEnd={() => setPanning(false)}
            >
              {viewerContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
