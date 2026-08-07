import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, School, UserCheck, Users, Sparkles, AlertCircle } from 'lucide-react';
import { ClasseScolaire, SalleConfig, MembrePersonnel, AnneeScolaireConfig } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classData: Partial<ClasseScolaire>) => Promise<void>;
  initialData?: ClasseScolaire | null;
  salles: SalleConfig[];
  teachers: MembrePersonnel[];
  schoolYears: AnneeScolaireConfig[];
  activeSchoolYearId?: string;
}

const cycleOptions: SelectOption[] = [
  { value: 'MATERNELLE', label: 'École Maternelle & Éveil' },
  { value: 'PRIMAIRE', label: 'Éducation de Base (1ère - 6ème Primaire)' },
  { value: 'SECONDAIRE_CTEB', label: 'Cycle Terminal d\'Éducation de Base (7ème & 8ème CTEB)' },
  { value: 'HUMANITES', label: 'Humanités Générales, Sci. & Techniques (1ère - 4ème)' },
];

const optionCodeList: SelectOption[] = [
  { value: 'TRONC_COMMUN', label: 'Tronc Commun / Sans Option' },
  { value: 'Math-Physique', label: 'Mathématiques & Physique (Math-Phys)' },
  { value: 'Biologie-Chimie', label: 'Biologie & Chimie (Bio-Chim)' },
  { value: 'Commerciale', label: 'Commerciale & Gestion' },
  { value: 'Pédagogie', label: 'Pédagogie Générale' },
  { value: 'Littéraire', label: 'Littéraire & Latin-Philosophie' },
  { value: 'Electricite', label: 'Électricité Industrielle & Technique' },
  { value: 'Mecanique', label: 'Mécanique Générale' },
];

export const ClassFormModal: React.FC<ClassFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  salles,
  teachers,
  schoolYears,
  activeSchoolYearId,
}) => {
  const [nom, setNom] = useState('');
  const [cycleId, setCycleId] = useState('HUMANITES');
  const [optionCode, setOptionCode] = useState('Math-Physique');
  const [salle, setSalle] = useState('');
  const [salleCode, setSalleCode] = useState('');
  const [professeurTitulaire, setProfesseurTitulaire] = useState('');
  const [capacite, setCapacite] = useState<number>(45);
  const [schoolYearId, setSchoolYearId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setNom(initialData.nom || '');
      setCycleId(initialData.cycleId || 'HUMANITES');
      setOptionCode(initialData.optionCode || 'TRONC_COMMUN');
      setSalle(initialData.salle || '');
      setSalleCode(initialData.salleCode || '');
      setProfesseurTitulaire(initialData.professeurTitulaire || '');
      setCapacite(initialData.capacite || 45);
      setSchoolYearId(initialData.schoolYearId || activeSchoolYearId || (schoolYears[0]?.id || ''));
    } else {
      setNom('');
      setCycleId('HUMANITES');
      setOptionCode('Math-Physique');
      setSalle(salles[0]?.nomSalle || 'Salle D-01');
      setSalleCode(salles[0]?.codeSalle || 'SALLE-D01');
      setProfesseurTitulaire(teachers.length > 0 ? `${teachers[0].prenom} ${teachers[0].nom}` : 'Prof. À désigner');
      setCapacite(45);
      setSchoolYearId(activeSchoolYearId || (schoolYears[0]?.id || ''));
    }
    setError(null);
  }, [initialData, isOpen, salles, teachers, activeSchoolYearId, schoolYears]);

  if (!isOpen) return null;

  // Options pour CustomSelect salles
  const salleSelectOptions: SelectOption[] = salles.map((s) => ({
    value: s.codeSalle,
    label: `${s.nomSalle} (${s.batiment || 'Bâtiment Princ.'} - Cap: ${s.capacite})`,
  }));
  if (salleSelectOptions.length === 0) {
    salleSelectOptions.push({ value: 'SALLE-DEFAULT', label: 'Salle Générale (Par défaut)' });
  }

  // Options pour CustomSelect professeurs titulaires
  const teacherSelectOptions: SelectOption[] = teachers.map((t) => ({
    value: `${t.prenom} ${t.nom}`,
    label: `${t.prenom} ${t.nom} (${t.qualification || t.role})`,
  }));
  teacherSelectOptions.unshift({ value: 'Non Attribué', label: 'Aucun titulaire (À désigner)' });

  // Options pour CustomSelect année scolaire
  const yearSelectOptions: SelectOption[] = schoolYears.map((sy) => ({
    value: sy.id,
    label: `Année ${sy.nom} (${sy.statut})`,
  }));

  const handleSalleChange = (val: string) => {
    setSalleCode(val);
    const found = salles.find((s) => s.codeSalle === val);
    if (found) {
      setSalle(found.nomSalle);
      if (found.capacite) setCapacite(found.capacite);
    } else {
      setSalle(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setError('Veuillez saisir le nom de la classe.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        ...(initialData ? { id: initialData.id } : {}),
        nom: nom.trim(),
        cycleId,
        optionCode,
        salle: salle || salleCode || 'Salle d\'étude',
        salleCode,
        professeurTitulaire: professeurTitulaire || 'Non Attribué',
        capacite: Number(capacite) || 45,
        nombreEleves: initialData?.nombreEleves || 0,
        schoolYearId: schoolYearId || activeSchoolYearId,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'enregistrement de la classe.');
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
        className="w-full max-w-xl rounded-2xl border-0 shadow-2xl shadow-slate-950/60 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300"
        style={{ background: 'var(--bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 border-0 shadow-xs flex items-center justify-between gap-3 shrink-0"
          style={{ background: 'var(--bg-sunken)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {initialData ? 'Modifier la Classe / Promotion' : 'Créer une Nouvelle Classe'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Structure académique EPST RDC · Affectation local & professeur titulaire
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

          {/* Intitulé de la classe */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Intitulé Officiel de la Classe <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ex: 7ème CTEB A, 3ème Math-Physique B, 1ère Primaire C..."
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          {/* Cycle & Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Cycle Scolaire EPST
              </label>
              <CustomSelect
                options={cycleOptions}
                value={cycleId}
                onChange={(val) => setCycleId(val)}
                placeholder="Sélectionner un cycle"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Option / Section
              </label>
              <CustomSelect
                options={optionCodeList}
                value={optionCode}
                onChange={(val) => setOptionCode(val)}
                placeholder="Sélectionner une option"
              />
            </div>
          </div>

          {/* Salle Physique & Prof Titulaire */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Local / Salle d'Étude Physique
              </label>
              <CustomSelect
                options={salleSelectOptions}
                value={salleCode || (salleSelectOptions[0]?.value ?? '')}
                onChange={handleSalleChange}
                placeholder="Attribuer une salle"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Professeur Titulaire
              </label>
              <CustomSelect
                options={teacherSelectOptions}
                value={professeurTitulaire}
                onChange={(val) => setProfesseurTitulaire(val)}
                placeholder="Désigner un titulaire"
              />
            </div>
          </div>

          {/* Capacité & Année Scolaire */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Capacité Max (Places Assises)
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={capacite}
                onChange={(e) => setCapacite(parseInt(e.target.value) || 45)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            {schoolYears.length > 0 && (
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Année Scolaire Rattachée
                </label>
                <CustomSelect
                  options={yearSelectOptions}
                  value={schoolYearId}
                  onChange={(val) => setSchoolYearId(val)}
                  placeholder="Année scolaire"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-500/10 active:scale-[0.97] cursor-pointer transition-all duration-200 shadow-xs"
              style={{ color: 'var(--text-primary)' }}
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300 icon-animated" />
              <span>{loading ? 'Sauvegarde...' : initialData ? 'Enregistrer les Modifications' : 'Créer la Classe'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
