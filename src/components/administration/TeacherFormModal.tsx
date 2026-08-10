import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Briefcase, FileText, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { MembrePersonnel, GradeEnseignant, TypeContratPersonnel } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { NumberInput } from '../common/NumberInput';

// ── Types ────────────────────────────────────────────────────────────────────

interface TeacherFormModalProps {
  isOpen: boolean;
  teacher: MembrePersonnel | null; // null = création
  onClose: () => void;
  onSave: (data: Omit<MembrePersonnel, 'id'> & { id?: string }) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type FormData = Omit<MembrePersonnel, 'id'> & { id?: string };

const emptyForm = (): FormData => ({
  prenom: '',
  postnom: '',
  nom: '',
  genre: 'M',
  dateNaissance: '',
  lieuNaissance: '',
  nationalite: 'Congolaise',
  adresse: '',
  telephone: '',
  telephoneSecondaire: '',
  email: '',
  role: 'ENSEIGNANT',
  grade: 'LICENCIE',
  diplome: '',
  specialite: '',
  disciplines: [],
  classesAssignees: [],
  typeContrat: 'PERMANENT',
  dateEmbauche: '',
  dateFinContrat: '',
  salaireBase: 0,
  devise: 'USD',
  numeroMatriculeEPST: '',
  numeroINSS: '',
  statut: 'ACTIF',
  notesBiographiques: '',
  creeLe: new Date().toISOString().split('T')[0],
});

// ── Step indicator ────────────────────────────────────────────────────────────

const steps = [
  { id: 1, label: 'Identité', icon: User },
  { id: 2, label: 'Professionnel', icon: Briefcase },
  { id: 3, label: 'Contractuel', icon: FileText },
];

// ── Component ─────────────────────────────────────────────────────────────────

export const TeacherFormModal: React.FC<TeacherFormModalProps> = ({
  isOpen,
  teacher,
  onClose,
  onSave,
}) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [disciplineInput, setDisciplineInput] = useState('');

  const isEdit = !!teacher;

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    if (teacher) {
      setForm({ ...emptyForm(), ...teacher });
    } else {
      setForm(emptyForm());
    }
    setDisciplineInput('');
  }, [isOpen, teacher]);

  const set = (key: keyof FormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addDiscipline = () => {
    const d = disciplineInput.trim();
    if (!d) return;
    const current = form.disciplines || [];
    if (!current.includes(d)) set('disciplines', [...current, d]);
    setDisciplineInput('');
  };

  const removeDiscipline = (d: string) =>
    set('disciplines', (form.disciplines || []).filter(x => x !== d));

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ ...form, id: teacher?.id });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // ── Input style ─────────────────────────────────────────────────────────────
  const inputCls =
    'w-full px-3 py-2 rounded-lg text-sm border transition-all outline-none focus:ring-2 focus:ring-indigo-500/30';
  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-sunken)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  };
  const labelCls = 'block text-xs font-bold mb-1.5';
  const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)' };

  // ── Step contents ──────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {/* Prénom */}
        <div>
          <label className={labelCls} style={labelStyle}>Prénom <span className="text-red-500">*</span></label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.prenom}
            onChange={e => set('prenom', e.target.value)}
            placeholder="ex: Jean-Pierre"
          />
        </div>
        {/* Postnom */}
        <div>
          <label className={labelCls} style={labelStyle}>Post-nom</label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.postnom || ''}
            onChange={e => set('postnom', e.target.value)}
            placeholder="ex: Mutombo"
          />
        </div>
        {/* Nom */}
        <div>
          <label className={labelCls} style={labelStyle}>Nom <span className="text-red-500">*</span></label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.nom}
            onChange={e => set('nom', e.target.value)}
            placeholder="ex: Kalonga"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Genre */}
        <div>
          <label className={labelCls} style={labelStyle}>Genre</label>
          <CustomSelect
            value={form.genre || 'M'}
            onChange={v => set('genre', v)}
            options={[
              { value: 'M', label: 'Masculin' },
              { value: 'F', label: 'Féminin' },
            ]}
          />
        </div>
        {/* Nationalité */}
        <div>
          <label className={labelCls} style={labelStyle}>Nationalité</label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.nationalite || ''}
            onChange={e => set('nationalite', e.target.value)}
            placeholder="ex: Congolaise"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Date de naissance */}
        <div>
          <label className={labelCls} style={labelStyle}>Date de naissance</label>
          <CustomDatePicker
            value={form.dateNaissance || ''}
            onChange={v => set('dateNaissance', v)}
            placeholder="JJ/MM/AAAA"
          />
        </div>
        {/* Lieu de naissance */}
        <div>
          <label className={labelCls} style={labelStyle}>Lieu de naissance</label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.lieuNaissance || ''}
            onChange={e => set('lieuNaissance', e.target.value)}
            placeholder="ex: Kinshasa"
          />
        </div>
      </div>

      {/* Téléphone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={labelStyle}>Téléphone principal <span className="text-red-500">*</span></label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.telephone}
            onChange={e => set('telephone', e.target.value)}
            placeholder="+243 81x xxx xxxx"
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Téléphone secondaire</label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.telephoneSecondaire || ''}
            onChange={e => set('telephoneSecondaire', e.target.value)}
            placeholder="+243 97x xxx xxxx"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className={labelCls} style={labelStyle}>Adresse e-mail</label>
        <input
          className={inputCls}
          style={inputStyle}
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="ex: enseignant@ecole.cd"
        />
      </div>

      {/* Adresse */}
      <div>
        <label className={labelCls} style={labelStyle}>Adresse physique</label>
        <input
          className={inputCls}
          style={inputStyle}
          value={form.adresse || ''}
          onChange={e => set('adresse', e.target.value)}
          placeholder="ex: Av. Kasai, n°12, Commune de Lingwala, Kinshasa"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Rôle */}
        <div>
          <label className={labelCls} style={labelStyle}>Fonction / Rôle</label>
          <CustomSelect
            value={form.role}
            onChange={v => set('role', v)}
            options={[
              { value: 'ENSEIGNANT', label: 'Enseignant / Professeur' },
              { value: 'PREFET', label: 'Préfet des Études' },
              { value: 'DE', label: 'Directeur des Études' },
              { value: 'SURVEILLANT', label: 'Surveillant Général' },
              { value: 'COMPTABLE', label: 'Comptable / Intendant' },
              { value: 'ADMIN', label: 'Personnel Administratif' },
            ]}
          />
        </div>
        {/* Grade */}
        <div>
          <label className={labelCls} style={labelStyle}>Grade académique</label>
          <CustomSelect
            value={form.grade || 'LICENCIE'}
            onChange={v => set('grade', v as GradeEnseignant)}
            options={[
              { value: 'DOCTEUR', label: 'Docteur (PhD)' },
              { value: 'DES', label: 'DES / Master' },
              { value: 'LICENCIE', label: 'Licencié (L2)' },
              { value: 'AGREGE', label: 'Agrégé EPST' },
              { value: 'GRADUAT', label: 'Gradué (L1 / G3)' },
              { value: 'AUTRE', label: 'Autre' },
            ]}
          />
        </div>
      </div>

      {/* Diplôme & Spécialité */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={labelStyle}>Diplôme obtenu</label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.diplome || ''}
            onChange={e => set('diplome', e.target.value)}
            placeholder="ex: Lic. en Sciences de l'Éducation"
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Spécialité / Option</label>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.specialite || ''}
            onChange={e => set('specialite', e.target.value)}
            placeholder="ex: Mathématiques-Physique"
          />
        </div>
      </div>

      {/* Disciplines enseignées */}
      <div>
        <label className={labelCls} style={labelStyle}>Disciplines enseignées</label>
        <div className="flex gap-2">
          <input
            className={inputCls}
            style={inputStyle}
            value={disciplineInput}
            onChange={e => setDisciplineInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDiscipline(); } }}
            placeholder="Saisir une matière et appuyer Entrée..."
          />
          <button
            type="button"
            onClick={addDiscipline}
            className="px-3 py-2 rounded-lg text-xs font-bold text-white shrink-0"
            style={{ background: '#6366f1' }}
          >
            Ajouter
          </button>
        </div>
        {(form.disciplines || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(form.disciplines || []).map(d => (
              <span
                key={d}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold"
                style={{
                  background: 'rgba(99,102,241,0.10)',
                  color: '#6366f1',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                {d}
                <button
                  type="button"
                  onClick={() => removeDiscipline(d)}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes biographiques */}
      <div>
        <label className={labelCls} style={labelStyle}>Notes biographiques</label>
        <textarea
          className={`${inputCls} resize-none`}
          style={inputStyle}
          rows={3}
          value={form.notesBiographiques || ''}
          onChange={e => set('notesBiographiques', e.target.value)}
          placeholder="Expériences, formations complémentaires, remarques..."
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Type de contrat */}
        <div>
          <label className={labelCls} style={labelStyle}>Type de contrat</label>
          <CustomSelect
            value={form.typeContrat || 'PERMANENT'}
            onChange={v => set('typeContrat', v as TypeContratPersonnel)}
            options={[
              { value: 'PERMANENT', label: 'Permanent / CDI' },
              { value: 'VACATAIRE', label: 'Vacataire / CDD' },
              { value: 'INTERIMAIRE', label: 'Intérimaire' },
              { value: 'BENEVOLE', label: 'Bénévole' },
            ]}
          />
        </div>
        {/* Statut */}
        <div>
          <label className={labelCls} style={labelStyle}>Statut actuel</label>
          <CustomSelect
            value={form.statut}
            onChange={v => set('statut', v as MembrePersonnel['statut'])}
            options={[
              { value: 'ACTIF', label: 'Actif' },
              { value: 'EN_CONGE', label: 'En congé' },
              { value: 'SUSPENDU', label: 'Suspendu' },
            ]}
          />
        </div>
      </div>

      {/* Dates de contrat */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={labelStyle}>Date d'embauche</label>
          <CustomDatePicker
            value={form.dateEmbauche || ''}
            onChange={v => set('dateEmbauche', v)}
            placeholder="JJ/MM/AAAA"
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Fin de contrat (si applicable)</label>
          <CustomDatePicker
            value={form.dateFinContrat || ''}
            onChange={v => set('dateFinContrat', v)}
            placeholder="JJ/MM/AAAA"
          />
        </div>
      </div>

      {/* Rémunération */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={labelStyle}>Salaire de base <span className="text-red-500">*</span></label>
          <NumberInput
            value={form.salaireBase || 0}
            onChange={v => set('salaireBase', v)}
            min={0}
            placeholder="0"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Devise</label>
          <CustomSelect
            value={form.devise}
            onChange={v => set('devise', v as 'USD' | 'CDF')}
            options={[
              { value: 'USD', label: 'Dollar américain (USD)' },
              { value: 'CDF', label: 'Franc congolais (CDF)' },
            ]}
          />
        </div>
      </div>

      {/* Identifiants officiels */}
      <div
        className="rounded-xl p-3 space-y-3"
        style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-black" style={{ color: 'var(--text-secondary)' }}>
          🪪 Identifiants Officiels EPST / INSS
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={labelStyle}>N° Matricule EPST</label>
            <input
              className={inputCls}
              style={{ ...inputStyle, background: 'var(--bg-surface)' }}
              value={form.numeroMatriculeEPST || ''}
              onChange={e => set('numeroMatriculeEPST', e.target.value)}
              placeholder="ex: EPST-KIN-0042"
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>N° INSS</label>
            <input
              className={inputCls}
              style={{ ...inputStyle, background: 'var(--bg-surface)' }}
              value={form.numeroINSS || ''}
              onChange={e => set('numeroINSS', e.target.value)}
              placeholder="ex: 1-24-0001234-5"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const canGoNext = () => {
    if (step === 1) return !!(form.prenom.trim() && form.nom.trim() && form.telephone.trim());
    if (step === 2) return true;
    return form.salaireBase >= 0;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
              {isEdit ? '✏️ Modifier la fiche enseignant' : '➕ Nouvel enseignant'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Étape {step} sur {steps.length} — {steps[step - 1].label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sunken)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-0">
            {steps.map((s, idx) => {
              const done = step > s.id;
              const active = step === s.id;
              const Icon = s.icon;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: done
                          ? '#10b981'
                          : active
                          ? '#6366f1'
                          : 'var(--bg-sunken)',
                        border: `2px solid ${done ? '#10b981' : active ? '#6366f1' : 'var(--border)'}`,
                        color: done || active ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className="flex-1 h-px mx-3"
                      style={{ background: done ? '#10b981' : 'var(--border)' }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { if (step > 1) (e.currentTarget.style.background = 'var(--bg-sunken)'); }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => Math.min(3, s + 1))}
              disabled={!canGoNext()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: '#6366f1' }}
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading || !canGoNext()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: loading ? '#6366f1aa' : '#6366f1' }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isEdit ? 'Enregistrer' : 'Créer l\'enseignant'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
