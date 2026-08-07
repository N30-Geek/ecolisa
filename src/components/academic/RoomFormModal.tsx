import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, School, Building, AlertCircle, Sparkles } from 'lucide-react';
import { SalleConfig } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roomData: Partial<SalleConfig>) => Promise<void>;
  initialData?: SalleConfig | null;
}

const cycleOptions: SelectOption[] = [
  { value: 'MATERNELLE', label: 'Cycle Maternelle' },
  { value: 'PRIMAIRE', label: 'Cycle Primaire' },
  { value: 'SECONDAIRE_CTEB', label: 'Cycle Terminal (CTEB 7e-8e)' },
  { value: 'HUMANITES', label: 'Cycle Humanités & Technique' },
];

const statusOptions: SelectOption[] = [
  { value: 'DISPONIBLE', label: 'Disponible (Opérationnelle)', badge: 'DISPONIBLE' },
  { value: 'OCCUPEE', label: 'Occupée (Attribuée)' },
  { value: 'MAINTENANCE', label: 'En Maintenance / Réparation' },
];

const batimentOptions: SelectOption[] = [
  { value: 'Pavillon Éveil A', label: 'Pavillon Éveil A (Maternelle)' },
  { value: 'Bloc Primaire B', label: 'Bloc Primaire B' },
  { value: 'Bâtiment Central C', label: 'Bâtiment Central C (CTEB)' },
  { value: 'Pavillon Humanités D', label: 'Pavillon Humanités D' },
  { value: 'Pavillon Humanités E', label: 'Pavillon Humanités E' },
  { value: 'Pavillon Humanités F', label: 'Pavillon Humanités F' },
  { value: 'Bloc Scientifique & Labo', label: 'Bloc Scientifique & Laboratoires' },
  { value: 'Autre Bâtiment', label: 'Autre Bâtiment / Annexe' },
];

export const RoomFormModal: React.FC<RoomFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [codeSalle, setCodeSalle] = useState('');
  const [nomSalle, setNomSalle] = useState('');
  const [capacite, setCapacite] = useState<number>(45);
  const [cycleCode, setCycleCode] = useState<'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES'>('HUMANITES');
  const [batiment, setBatiment] = useState('Pavillon Humanités D');
  const [statut, setStatut] = useState<'DISPONIBLE' | 'OCCUPEE' | 'MAINTENANCE'>('DISPONIBLE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCodeSalle(initialData.codeSalle || '');
      setNomSalle(initialData.nomSalle || '');
      setCapacite(initialData.capacite || 45);
      setCycleCode(initialData.cycleCode || 'HUMANITES');
      setBatiment(initialData.batiment || 'Pavillon Humanités D');
      setStatut(initialData.statut || 'DISPONIBLE');
    } else {
      setCodeSalle('');
      setNomSalle('');
      setCapacite(45);
      setCycleCode('HUMANITES');
      setBatiment('Pavillon Humanités D');
      setStatut('DISPONIBLE');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomSalle.trim()) {
      setError('Veuillez renseigner le nom de la salle.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const generatedCode = codeSalle.trim() || `SALLE-${nomSalle.trim().replace(/\s+/g, '-').toUpperCase()}`;
      await onSave({
        ...(initialData ? { id: initialData.id } : {}),
        codeSalle: generatedCode,
        nomSalle: nomSalle.trim(),
        capacite: Number(capacite) || 45,
        cycleCode,
        batiment,
        statut,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'enregistrement du local.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-xs overflow-hidden flex flex-col max-h-[90vh] transition-all"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {initialData ? 'Modifier le Local / Salle Physiques' : 'Ajouter un Nouveau Local d\'Étude'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestion du patrimoine immobilier et attribution des capacités
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 sidebar-scroll">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Nom & Code Salle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Nom du Local / Salle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="ex: Salle D-01, Labo Info, Salle A-02..."
                value={nomSalle}
                onChange={(e) => setNomSalle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Code Unique (Identifiant)
              </label>
              <input
                type="text"
                placeholder="ex: SALLE-D01"
                value={codeSalle}
                onChange={(e) => setCodeSalle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Bâtiment & Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Bâtiment / Bloc Physique
              </label>
              <CustomSelect
                options={batimentOptions}
                value={batiment}
                onChange={(val) => setBatiment(val)}
                placeholder="Sélectionner le bâtiment"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Cycle Principal Affecté
              </label>
              <CustomSelect
                options={cycleOptions}
                value={cycleCode}
                onChange={(val) => setCycleCode(val as any)}
                placeholder="Sélectionner le cycle"
              />
            </div>
          </div>

          {/* Capacité & Statut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Capacité d'Élèves (Places Assises)
              </label>
              <input
                type="number"
                min={10}
                max={150}
                value={capacite}
                onChange={(e) => setCapacite(parseInt(e.target.value) || 45)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Statut du Local
              </label>
              <CustomSelect
                options={statusOptions}
                value={statut}
                onChange={(val) => setStatut(val as any)}
                placeholder="Statut de la salle"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="pt-4 mt-4 border-t flex items-center justify-end gap-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border font-bold text-xs hover:bg-slate-500/10 cursor-pointer transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-500/40 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{loading ? 'Sauvegarde...' : initialData ? 'Enregistrer les Modifications' : 'Ajouter le Local'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
