import React, { useState } from 'react';
import { Scan, Upload, FileText, Image as ImageIcon, FolderPlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { DocumentScolaire } from '../../types';

interface DocumentScanToolProps {
  entityId: string;
  entityType?: 'STUDENT' | 'STAFF';
  category?: string;
  onDocumentAdded?: (doc: DocumentScolaire) => void;
  onMultipleAdded?: (docs: DocumentScolaire[]) => void;
  className?: string;
}

export const DocumentScanTool: React.FC<DocumentScanToolProps> = ({
  entityId,
  entityType = 'STAFF',
  category = 'DOSSIER_ADMINISTRATIF',
  onDocumentAdded,
  onMultipleAdded,
  className = '',
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  // 1. Scan WIA Matériel (Windows / Electron)
  const handleWiaScan = async () => {
    setIsScanning(true);
    setStatusMessage({ text: 'Numérisation WIA en cours via le scanner configuré...', type: 'info' });

    try {
      if ((window as any).electronAPI?.platform !== 'win32') {
        throw new Error('La numérisation directe par scanner WIA est disponible uniquement sous Windows avec Electron.');
      }

      const res = await LocalDatabaseService.wiaScan(entityId, category, entityType);
      if (!res || res.canceled) {
        setStatusMessage(null);
        return;
      }
      if (!res.success || !res.base64) {
        throw new Error(res.error || 'Échec de l’acquisition de l’image scanner.');
      }

      const dataUrl = `data:${res.mimeType || 'image/jpeg'};base64,${res.base64}`;
      const fileName = `scan_fiches_${entityType}_${entityId}_${new Date().toISOString().slice(0, 10)}.jpg`;

      let newDoc: DocumentScolaire | null = null;
      if (entityType === 'STAFF') {
        newDoc = await LocalDatabaseService.importStaffImage(entityId, fileName, dataUrl);
      } else {
        newDoc = await LocalDatabaseService.importStudentImage(entityId, fileName, dataUrl);
      }

      if (newDoc) {
        setStatusMessage({ text: 'Document numérisé et rattaché avec succès !', type: 'success' });
        if (onDocumentAdded) onDocumentAdded(newDoc);
      }
    } catch (err: any) {
      console.error('[DocumentScanTool] Erreur numérisation WIA :', err);
      setStatusMessage({ text: err?.message || 'Erreur lors de la numérisation scanner WIA.', type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Téléversement de fichier image/PDF local
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setStatusMessage({ text: 'Importation des pièces jointes...', type: 'info' });

    try {
      const addedDocs: DocumentScolaire[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let doc: DocumentScolaire | null = null;
        if (entityType === 'STAFF') {
          doc = await LocalDatabaseService.importStaffImage(entityId, file.name, dataUrl);
        } else {
          doc = await LocalDatabaseService.importStudentImage(entityId, file.name, dataUrl);
        }
        if (doc) addedDocs.push(doc);
      }

      if (addedDocs.length > 0) {
        setStatusMessage({ text: `${addedDocs.length} document(s) FST rattaché(s) !`, type: 'success' });
        if (onMultipleAdded) onMultipleAdded(addedDocs);
        if (onDocumentAdded && addedDocs[0]) onDocumentAdded(addedDocs[0]);
      }
    } catch (err: any) {
      console.error('[DocumentScanTool] Erreur téléversement :', err);
      setStatusMessage({ text: 'Échec de l’importation du fichier.', type: 'error' });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Bouton Numériser WIA */}
        <button
          type="button"
          onClick={handleWiaScan}
          disabled={isScanning || isImporting}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-500/40"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Scan className="w-4 h-4 text-white" />
          )}
          <span>Numériser via Scanner WIA</span>
        </button>

        {/* Bouton Importer Fichier */}
        <label className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-emerald-500/40">
          {isImporting ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Upload className="w-4 h-4 text-white" />
          )}
          <span>Joindre un Fichier (PDF / Image)</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            disabled={isScanning || isImporting}
          />
        </label>
      </div>

      {/* Message de statut */}
      {statusMessage && (
        <div
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
              : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-indigo-600" />
            )}
            {statusMessage.text}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[10px] uppercase font-bold hover:underline"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
};
