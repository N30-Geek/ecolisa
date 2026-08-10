import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Calendar, Sparkles, ChevronRight, ChevronLeft, School, CreditCard,
  CheckCircle2, AlertTriangle, Plus, Trash2, Search, Check, Users, Layers,
  FileCheck, Loader2,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { AnneeScolaireConfig, ClasseScolaire, TypeFraisScolaire, CategorieFrais, StatutAnnéeScolaire } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { NumberInput } from '../common/NumberInput';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// ─── Référentiel des Cycles & Niveaux EPST ────────────────────────────────
type CodeCycleWizard = 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';

const CYCLES_REF: { code: CodeCycleWizard; nom: string; couleur: string }[] = [
  { code: 'MATERNELLE', nom: 'Cycle Maternelle & Éveil (3–5 ans)', couleur: 'amber' },
  { code: 'PRIMAIRE', nom: 'Cycle Primaire (1ère – 6ème)', couleur: 'emerald' },
  { code: 'SECONDAIRE_CTEB', nom: 'Cycle Terminal d\'Éducation de Base (7ème – 8ème CTEB)', couleur: 'sky' },
  { code: 'HUMANITES', nom: 'Humanités Générales, Scientifiques & Techniques (1ère – 4ème)', couleur: 'indigo' },
];

const NIVEAUX_PAR_CYCLE: Record<CodeCycleWizard, string[]> = {
  MATERNELLE: ['1ère Maternelle', '2ème Maternelle', '3ème Maternelle'],
  PRIMAIRE: ['1ère Primaire', '2ème Primaire', '3ème Primaire', '4ème Primaire', '5ème Primaire', '6ème Primaire'],
  SECONDAIRE_CTEB: ['7ème CTEB', '8ème CTEB'],
  HUMANITES: ['1ère Humanités', '2ème Humanités', '3ème Humanités', '4ème Humanités'],
};

const CATEGORIES_FRAIS: { value: CategorieFrais; label: string }[] = [
  { value: 'FRAIS_INSCRIPTION', label: 'Frais d\'Inscription' },
  { value: 'FRAIS_REINSCRIPTION', label: 'Frais de Réinscription' },
  { value: 'FRAIS_MINERVAL', label: 'Minerval Scolaire' },
  { value: 'FRAIS_CONNEXES', label: 'Frais Connexes' },
  { value: 'FRAIS_KITS_EQUIPEMENTS', label: 'Kits & Équipements' },
  { value: 'FRAIS_BUS', label: 'Transport / Bus Scolaire' },
  { value: 'FRAIS_UNIFORME', label: 'Uniforme Scolaire' },
  { value: 'FRAIS_EXAMEN', label: 'Frais d\'Examen' },
  { value: 'FRAIS_CARTE', label: 'Carte d\'Élève / Badge' },
  { value: 'FRAIS_ACTIVITE', label: 'Activités Parascolaires' },
  { value: 'AUTRE', label: 'Autre (Saisie Manuelle)' },
];

// ─── Structures de travail (brouillon avant persistance) ──────────────────
interface DraftSection {
  id: string;
  cycleCode: CodeCycleWizard;
  niveau: string;
  label: string;
  capacite: number;
}

interface DraftFee {
  id: string;
  cycleCode: CodeCycleWizard | 'TOUS';
  cible: string; // niveau précis OU 'TRONC_COMMUN' pour tout le cycle
  categorie: CategorieFrais;
  nomPersonnalise?: string;
  montant: number;
  devise: 'USD' | 'CDF';
  priorite: 'OBLIGATOIRE' | 'REPARTI';
}

interface ExistingYearSummary {
  id: string;
  nom: string;
  statut: string;
  debut: string;
  fin: string;
  nombreElevesTotal?: number;
}

interface SchoolYearOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  existingYears: ExistingYearSummary[];
  onCreated: (newYear: AnneeScolaireConfig) => void;
}

// ─── Calcul des valeurs par défaut de la nouvelle année ───────────────────
function computeDefaults(existingYears: ExistingYearSummary[]) {
  let startYear = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  const parsedYears = existingYears
    .map(y => {
      const match = (y.nom || '').match(/(\d{4})/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n): n is number => n !== null);

  if (parsedYears.length > 0) {
    startYear = Math.max(...parsedYears) + 1;
  }

  return {
    nom: `${startYear}–${startYear + 1}`,
    debut: `${startYear}-09-07`,
    fin: `${startYear + 1}-07-05`,
  };
}

export const SchoolYearOnboardingWizard: React.FC<SchoolYearOnboardingWizardProps> = ({
  isOpen, onClose, existingYears, onCreated,
}) => {
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // ── Étape 1 : Généralités ──
  const defaults = useMemo(() => computeDefaults(existingYears), [existingYears]);
  const [nom, setNom] = useState(defaults.nom);
  const [debut, setDebut] = useState(defaults.debut);
  const [fin, setFin] = useState(defaults.fin);
  const [objectifEleves, setObjectifEleves] = useState<number>(0);
  const [statut, setStatut] = useState<StatutAnnéeScolaire>(existingYears.length === 0 ? 'EN_COURS' : 'PLANIFIEE');

  useEffect(() => {
    if (isOpen) {
      const d = computeDefaults(existingYears);
      setNom(d.nom);
      setDebut(d.debut);
      setFin(d.fin);
      setStep(1);
    }
  }, [isOpen]);

  const nameConflict = existingYears.some(y => y.nom.trim().toLowerCase() === nom.trim().toLowerCase());
  const dateConflict = existingYears.some(y => {
    if (!y.debut || !y.fin) return false;
    return debut <= y.fin && fin >= y.debut;
  });

  // ── Étape 2 : Cycles, Classes & Sections ──
  const [activeCycles, setActiveCycles] = useState<Record<CodeCycleWizard, boolean>>({
    MATERNELLE: true, PRIMAIRE: true, SECONDAIRE_CTEB: true, HUMANITES: true,
  });
  const [selectedNiveaux, setSelectedNiveaux] = useState<Record<string, boolean>>({}); // key: `${cycle}|${niveau}`
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [sectionsModalNiveau, setSectionsModalNiveau] = useState<{ cycleCode: CodeCycleWizard; niveau: string } | null>(null);

  const selectedNiveauxList = useMemo(() => {
    return Object.keys(selectedNiveaux)
      .filter(k => selectedNiveaux[k])
      .map(k => {
        const [cycleCode, niveau] = k.split('|');
        return { cycleCode: cycleCode as CodeCycleWizard, niveau };
      });
  }, [selectedNiveaux]);

  const removeSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id));

  const addSections = (cycleCode: CodeCycleWizard, niveau: string, rows: { label: string; capacite: number }[]) => {
    setSections(prev => [
      ...prev,
      ...rows.map(r => ({ id: uuid(), cycleCode, niveau, label: r.label, capacite: r.capacite })),
    ]);
  };

  // ── Étape 3 : Frais Scolaires ──
  const [fees, setFees] = useState<DraftFee[]>([]);
  const [feeCycle, setFeeCycle] = useState<CodeCycleWizard | 'TOUS'>('TOUS');
  const [feeCible, setFeeCible] = useState<string>('TRONC_COMMUN');
  const [feeCategorie, setFeeCategorie] = useState<CategorieFrais>('FRAIS_MINERVAL');
  const [feeNomPerso, setFeeNomPerso] = useState('');
  const [feeMontant, setFeeMontant] = useState<number>(50);
  const [feeDevise, setFeeDevise] = useState<'USD' | 'CDF'>('USD');
  const [feePriorite, setFeePriorite] = useState<'OBLIGATOIRE' | 'REPARTI'>('OBLIGATOIRE');

  const cyclesActifsCodes = (Object.keys(activeCycles) as CodeCycleWizard[]).filter(c => activeCycles[c]);

  const niveauxDuCycleFrais = useMemo(() => {
    if (feeCycle === 'TOUS') return [];
    return selectedNiveauxList.filter(n => n.cycleCode === feeCycle).map(n => n.niveau);
  }, [feeCycle, selectedNiveauxList]);

  const handleAddFee = () => {
    if (feeCategorie === 'AUTRE' && !feeNomPerso.trim()) return;
    if (feeMontant <= 0) return;
    setFees(prev => [...prev, {
      id: uuid(),
      cycleCode: feeCycle,
      cible: feeCible,
      categorie: feeCategorie,
      nomPersonnalise: feeCategorie === 'AUTRE' ? feeNomPerso.trim() : undefined,
      montant: feeMontant,
      devise: feeDevise,
      priorite: feePriorite,
    }]);
    setFeeNomPerso('');
  };

  const removeFee = (id: string) => setFees(prev => prev.filter(f => f.id !== id));

  const feeLabel = (f: DraftFee) => f.nomPersonnalise || CATEGORIES_FRAIS.find(c => c.value === f.categorie)?.label || f.categorie;
  const feeCibleLabel = (f: DraftFee) => {
    if (f.cycleCode === 'TOUS') return 'Toute l\'école';
    const cycleNom = CYCLES_REF.find(c => c.code === f.cycleCode)?.nom || f.cycleCode;
    return f.cible === 'TRONC_COMMUN' ? `${cycleNom} (Tronc Commun)` : `${cycleNom} · ${f.cible}`;
  };

  // ── Étape 4 : Récapitulatif & Persistance ──
  const canGoNextFromStep2 = sections.length > 0;

  const handleFinalize = async () => {
    setSaving(true);
    try {
      const newYearId = uuid();

      // Bascule l'année précédemment active en clôturée si la nouvelle est active
      if (statut === 'EN_COURS') {
        for (const y of existingYears) {
          if (y.statut === 'EN_COURS') {
            await LocalDatabaseService.updateSchoolYear(y.id, { statut: 'CLOTUREE' });
          }
        }
      }

      const cyclesConfig = cyclesActifsCodes.map(code => ({
        id: uuid(),
        code,
        nom: CYCLES_REF.find(c => c.code === code)?.nom || code,
        actif: true,
        classesCount: sections.filter(s => s.cycleCode === code).length,
        sallesCount: sections.filter(s => s.cycleCode === code).length,
      }));

      const fraisAnnexes = fees.map(f => ({
        id: uuid(),
        intitule: `${feeLabel(f)} — ${feeCibleLabel(f)}`,
        montant: f.montant,
        devise: f.devise,
        obligatoire: f.priorite === 'OBLIGATOIRE',
        typeFrais: f.categorie,
        priorite: f.priorite,
        portee: feeCibleLabel(f),
      }));

      const newYear: AnneeScolaireConfig = {
        id: newYearId,
        nom,
        statut,
        debut,
        fin,
        nombreElevesTotal: objectifEleves,
        fraisInscription: fees.find(f => f.categorie === 'FRAIS_INSCRIPTION')?.montant || 0,
        fraisConnexion: 0,
        fraisReinscription: fees.find(f => f.categorie === 'FRAIS_REINSCRIPTION')?.montant || 0,
        fraisCarte: fees.find(f => f.categorie === 'FRAIS_CARTE')?.montant || 0,
        fraisAnnexes,
        cycles: cyclesConfig as any,
        options: [],
        salles: [],
        semestres: [
          { id: uuid(), nom: '1er Semestre (S1)', statut: 'PLANIFIE', fin: `Février ${parseInt(debut.slice(0, 4)) + 1}` },
          { id: uuid(), nom: '2ème Semestre (S2)', statut: 'PLANIFIE', fin: fin },
        ],
        periodes: [
          { id: uuid(), nom: '1ère Période', debut, fin: '', type: 'PERIOD' },
          { id: uuid(), nom: '2ème Période & Examens S1', debut: '', fin: '', type: 'EXAM' },
          { id: uuid(), nom: '3ème Période', debut: '', fin: '', type: 'PERIOD' },
          { id: uuid(), nom: '4ème Période & Examens Finaux', debut: '', fin, type: 'EXAM' },
        ],
      };

      await LocalDatabaseService.addSchoolYear(newYear);

      // Persistance des classes/sections (appliquées dans toute l'application)
      for (const sec of sections) {
        const classe: ClasseScolaire = {
          id: uuid(),
          schoolYearId: newYearId,
          cycleId: sec.cycleCode,
          cycleCode: sec.cycleCode,
          nom: `${sec.niveau} ${sec.label}`,
          salle: `${sec.niveau} ${sec.label}`,
          optionCode: 'TRONC_COMMUN',
          nombreEleves: 0,
          capacite: sec.capacite,
          professeurTitulaire: 'Non Attribué',
        };
        await LocalDatabaseService.addClass(classe);
      }

      // Persistance des types de frais (appliqués dans le module Finance)
      for (const f of fees) {
        const ft: TypeFraisScolaire = {
          id: uuid(),
          code: f.categorie.slice(0, 8),
          nom: feeLabel(f),
          categorie: f.categorie,
          montant: f.montant,
          devise: f.devise,
          obligatoire: f.priorite === 'OBLIGATOIRE',
          portee: feeCibleLabel(f),
          schoolYearId: newYearId,
          anneeScolaireId: newYearId,
          cycleId: f.cycleCode === 'TOUS' ? 'TOUS' : f.cycleCode,
          optionCode: f.cible === 'TRONC_COMMUN' ? 'TOUS' : f.cible,
          regime: 'TOUS',
          actif: true,
        };
        await LocalDatabaseService.addFeeType(ft);
      }

      onCreated(newYear);
      onClose();
    } catch (err) {
      console.error('[SchoolYearOnboardingWizard] Erreur création année scolaire :', err);
      alert("Une erreur est survenue lors de la création de l'année scolaire.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const statutOptions: SelectOption[] = [
    { value: 'PLANIFIEE', label: 'Planifiée (Prochaine rentrée)' },
    { value: 'EN_COURS', label: 'Active Immédiatement (En Cours)' },
  ];

  const STEPS = [
    { step: 1, label: 'Généralités', icon: Calendar },
    { step: 2, label: 'Cycles & Classes', icon: School },
    { step: 3, label: 'Frais Scolaires', icon: CreditCard },
    { step: 4, label: 'Récapitulatif', icon: FileCheck },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* EN-TÊTE */}
        <div className="p-5 border-b flex items-center justify-between shrink-0" style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">Onboarding — Nouvelle Année Scolaire</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  Étape {step} sur 4
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configuration complète liée à la base de données : cycles, classes, sections & frais scolaires
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-500/20 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEPPER */}
        <div className="px-6 py-3 border-b overflow-x-auto sidebar-scroll shrink-0" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between min-w-[560px] gap-2">
            {STEPS.map((s, idx) => {
              const SIcon = s.icon;
              const isActive = step === s.step;
              const isDone = step > s.step;
              return (
                <React.Fragment key={s.step}>
                  <button
                    type="button"
                    onClick={() => { if (isDone) setStep(s.step); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isActive ? 'bg-indigo-600 text-white shadow-xs' : isDone ? 'text-indigo-600 dark:text-indigo-400 cursor-pointer hover:bg-indigo-500/10' : 'text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <SIcon className="w-3.5 h-3.5" />}
                    <span>{s.step}. {s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-500/20 min-w-[16px]" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* CORPS */}
        <div className="p-6 overflow-y-auto flex-1 sidebar-scroll space-y-5">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
              <div>
                <label className="text-xs font-bold block mb-1.5">Intitulé de l'Année Scolaire *</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: nameConflict ? '#f43f5e' : 'var(--border)' }}
                />
                {nameConflict && (
                  <p className="text-[11px] text-rose-500 font-bold mt-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Une année scolaire portant cet intitulé existe déjà.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5">Objectif Prévisionnel des Élèves</label>
                <NumberInput
                  value={objectifEleves}
                  onChange={setObjectifEleves}
                  min={0}
                  integer
                  placeholder="Cible"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5">Date de Rentrée *</label>
                  <CustomDatePicker value={debut} onChange={setDebut} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5">Date de Clôture *</label>
                  <CustomDatePicker value={fin} onChange={setFin} />
                </div>
              </div>
              {dateConflict && (
                <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Cette plage de dates chevauche une année scolaire déjà existante.
                </p>
              )}

              <div>
                <label className="text-xs font-bold block mb-1.5">Statut Initial de l'Année</label>
                <CustomSelect options={statutOptions} value={statut} onChange={v => setStatut(v as StatutAnnéeScolaire)} />
              </div>

              {existingYears.length > 0 && (
                <div className="p-3.5 rounded-xl border text-xs flex items-start gap-2.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-slate-500 dark:text-slate-400">
                    La structure (cycles, classes) de l'année <strong style={{ color: 'var(--text-primary)' }}>{existingYears[0].nom}</strong> sera
                    proposée par défaut à l'étape suivante — les élèves et les données financières ne sont jamais reportés.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">1. Cycles Scolaires Pris en Charge</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CYCLES_REF.map(c => (
                    <label
                      key={c.code}
                      className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        activeCycles[c.code] ? 'border-indigo-500 bg-indigo-500/10' : 'hover:border-indigo-500/40'
                      }`}
                      style={{ borderColor: activeCycles[c.code] ? '#6366f1' : 'var(--border)', background: activeCycles[c.code] ? undefined : 'var(--bg-surface)' }}
                    >
                      <input
                        type="checkbox"
                        checked={activeCycles[c.code]}
                        onChange={e => setActiveCycles(prev => ({ ...prev, [c.code]: e.target.checked }))}
                        className="w-4 h-4 rounded accent-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{c.nom}</p>
                        <p className="text-[10.5px] text-slate-400">
                          {sections.filter(s => s.cycleCode === c.code).length} section(s) configurée(s)
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">2. Classes & Sections Physiques</h4>
                <button
                  type="button"
                  onClick={() => setShowClassPicker(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Sélectionner les Classes RDC
                </button>
              </div>

              {selectedNiveauxList.length === 0 ? (
                <div className="p-8 rounded-xl border text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <School className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">Aucune classe sélectionnée. Cliquez sur « Sélectionner les Classes RDC ».</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedNiveauxList.map(({ cycleCode, niveau }) => {
                    const secs = sections.filter(s => s.cycleCode === cycleCode && s.niveau === niveau);
                    return (
                      <div key={`${cycleCode}|${niveau}`} className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{niveau}</p>
                            <p className="text-[10px] text-slate-400">{CYCLES_REF.find(c => c.code === cycleCode)?.nom}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSectionsModalNiveau({ cycleCode, niveau })}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Ajouter des Sections
                          </button>
                        </div>
                        {secs.length === 0 ? (
                          <p className="text-[11px] text-amber-500 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> Aucune section ajoutée pour ce niveau.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {secs.map(s => (
                              <span key={s.id} className="px-2.5 py-1 rounded-lg bg-slate-500/10 border text-[11px] font-bold flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                {niveau} {s.label} · {s.capacite} places
                                <button type="button" onClick={() => removeSection(s.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-bold" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <span className="text-slate-500 dark:text-slate-400">Total sections configurées</span>
                <span className="text-indigo-600 dark:text-indigo-400">{sections.length} classe(s) physique(s)</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Ajouter un Frais Scolaire</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Cycle Concerné</label>
                    <CustomSelect
                      value={feeCycle}
                      onChange={v => { setFeeCycle(v as any); setFeeCible('TRONC_COMMUN'); }}
                      options={[
                        { value: 'TOUS', label: 'Toute l\'École (Tous Cycles)' },
                        ...cyclesActifsCodes.map(c => ({ value: c, label: CYCLES_REF.find(cc => cc.code === c)?.nom || c })),
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Classe / Tronc Commun</label>
                    <CustomSelect
                      value={feeCible}
                      onChange={setFeeCible}
                      options={[
                        { value: 'TRONC_COMMUN', label: feeCycle === 'TOUS' ? 'Toutes les classes' : 'Tronc Commun (tout le cycle)' },
                        ...niveauxDuCycleFrais.map(n => ({ value: n, label: n })),
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Type de Frais</label>
                    <CustomSelect
                      value={feeCategorie}
                      onChange={v => setFeeCategorie(v as CategorieFrais)}
                      options={CATEGORIES_FRAIS.map(c => ({ value: c.value, label: c.label }))}
                    />
                  </div>
                  {feeCategorie === 'AUTRE' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Intitulé Personnalisé *</label>
                      <input
                        type="text"
                        value={feeNomPerso}
                        onChange={e => setFeeNomPerso(e.target.value)}
                        placeholder="ex: Frais de Laboratoire"
                        className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Montant *</label>
                    <NumberInput
                      value={feeMontant}
                      onChange={setFeeMontant}
                      min={0}
                      placeholder="Montant"
                      className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Devise</label>
                    <CustomSelect value={feeDevise} onChange={v => setFeeDevise(v as any)} options={[{ value: 'USD', label: 'USD ($)' }, { value: 'CDF', label: 'CDF (Fc)' }]} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Priorité</label>
                    <CustomSelect
                      value={feePriorite}
                      onChange={v => setFeePriorite(v as any)}
                      options={[{ value: 'OBLIGATOIRE', label: 'Obligatoire' }, { value: 'REPARTI', label: 'Réparti (Optionnel / Échelonné)' }]}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddFee}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Ajouter ce Frais à la Liste
                </button>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Frais Configurés ({fees.length})</h4>
                {fees.length === 0 ? (
                  <div className="p-6 rounded-xl border text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <CreditCard className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-semibold">Aucun frais scolaire ajouté pour le moment.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b uppercase text-[10px] font-black text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <th className="p-2.5">Frais</th>
                          <th className="p-2.5">Portée</th>
                          <th className="p-2.5">Montant</th>
                          <th className="p-2.5">Priorité</th>
                          <th className="p-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {fees.map(f => (
                          <tr key={f.id}>
                            <td className="p-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>{feeLabel(f)}</td>
                            <td className="p-2.5 text-slate-400">{feeCibleLabel(f)}</td>
                            <td className="p-2.5 font-black text-indigo-600 dark:text-indigo-400">{f.montant} {f.devise}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${f.priorite === 'OBLIGATOIRE' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                                {f.priorite === 'OBLIGATOIRE' ? 'Obligatoire' : 'Réparti'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <button type="button" onClick={() => removeFee(f.id)} className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Généralités</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><p className="text-slate-400">Intitulé</p><p className="font-black" style={{ color: 'var(--text-primary)' }}>{nom}</p></div>
                  <div><p className="text-slate-400">Statut</p><p className="font-black" style={{ color: 'var(--text-primary)' }}>{statut === 'EN_COURS' ? 'Active' : 'Planifiée'}</p></div>
                  <div><p className="text-slate-400">Rentrée</p><p className="font-black" style={{ color: 'var(--text-primary)' }}>{debut}</p></div>
                  <div><p className="text-slate-400">Clôture</p><p className="font-black" style={{ color: 'var(--text-primary)' }}>{fin}</p></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  Cycles & Classes ({sections.length} sections)
                </h4>
                <div className="space-y-2">
                  {selectedNiveauxList.map(({ cycleCode, niveau }) => {
                    const secs = sections.filter(s => s.cycleCode === cycleCode && s.niveau === niveau);
                    if (secs.length === 0) return null;
                    return (
                      <div key={`${cycleCode}|${niveau}`} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'var(--bg-sunken)' }}>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{niveau}</span>
                        <span className="text-slate-400">{secs.map(s => s.label).join(', ')}</span>
                      </div>
                    );
                  })}
                  {sections.length === 0 && <p className="text-xs text-amber-500 font-semibold">Aucune section configurée.</p>}
                </div>
              </div>

              <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Frais Scolaires ({fees.length})</h4>
                <div className="space-y-2">
                  {fees.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'var(--bg-sunken)' }}>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{feeLabel(f)} · {feeCibleLabel(f)}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">{f.montant} {f.devise}</span>
                    </div>
                  ))}
                  {fees.length === 0 && <p className="text-xs text-amber-500 font-semibold">Aucun frais configuré.</p>}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-slate-500 dark:text-slate-400">
                  Cette configuration sera enregistrée dans la base de données et appliquée automatiquement dans les modules
                  Élèves, Classes, Cotes et Finance pour l'année <strong style={{ color: 'var(--text-primary)' }}>{nom}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PIED DE PAGE */}
        <div className="p-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(prev => prev - 1))}
            className="px-4 py-2 rounded-lg border text-xs font-bold hover:bg-slate-500/10 transition-all cursor-pointer flex items-center gap-1"
            style={{ borderColor: 'var(--border)' }}
          >
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? 'Annuler' : 'Précédent'}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev + 1)}
              disabled={(step === 1 && (!nom.trim() || nameConflict)) || (step === 2 && !canGoNextFromStep2)}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
              <span>{saving ? 'Création en cours…' : "Créer l'Année Scolaire"}</span>
            </button>
          )}
        </div>
      </div>

      {showClassPicker && (
        <ClassPickerModal
          activeCycles={cyclesActifsCodes}
          selectedNiveaux={selectedNiveaux}
          onToggle={(key) => setSelectedNiveaux(prev => ({ ...prev, [key]: !prev[key] }))}
          onConfirm={() => setShowClassPicker(false)}
          onClose={() => setShowClassPicker(false)}
        />
      )}

      {sectionsModalNiveau && (
        <SectionsModal
          cycleCode={sectionsModalNiveau.cycleCode}
          niveau={sectionsModalNiveau.niveau}
          existingLabels={sections.filter(s => s.cycleCode === sectionsModalNiveau.cycleCode && s.niveau === sectionsModalNiveau.niveau).map(s => s.label)}
          onConfirm={(rows) => { addSections(sectionsModalNiveau.cycleCode, sectionsModalNiveau.niveau, rows); setSectionsModalNiveau(null); }}
          onClose={() => setSectionsModalNiveau(null)}
        />
      )}
    </div>,
    document.body
  );
};

// ─── Modal : Sélection des Classes RDC (façon capture d'écran) ────────────
const ClassPickerModal: React.FC<{
  activeCycles: CodeCycleWizard[];
  selectedNiveaux: Record<string, boolean>;
  onToggle: (key: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ activeCycles, selectedNiveaux, onToggle, onConfirm, onClose }) => {
  const [search, setSearch] = useState('');

  const totalSelected = Object.values(selectedNiveaux).filter(Boolean).length;

  const setAll = (value: boolean, cycleCode?: CodeCycleWizard) => {
    const cycles = cycleCode ? [cycleCode] : activeCycles;
    cycles.forEach(c => {
      NIVEAUX_PAR_CYCLE[c].forEach(niveau => {
        const key = `${c}|${niveau}`;
        if (selectedNiveaux[key] !== value) onToggle(key);
      });
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-black flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" /> Sélectionner les Classes RDC à Ajouter
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une classe, section ou option..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAll(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                <Check className="w-3 h-3" /> Tout sélectionner
              </button>
              <button type="button" onClick={() => setAll(false)} className="text-slate-400 hover:underline cursor-pointer">Tout désélectionner</button>
            </div>
            <span className="text-slate-400">{totalSelected} classe(s) sélectionnée(s)</span>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 sidebar-scroll space-y-5">
          {activeCycles.length === 0 && (
            <p className="text-xs text-amber-500 font-semibold text-center py-6">Aucun cycle actif. Retournez à l'étape précédente.</p>
          )}
          {activeCycles.map(cycleCode => {
            const niveaux = NIVEAUX_PAR_CYCLE[cycleCode].filter(n => n.toLowerCase().includes(search.toLowerCase()));
            if (niveaux.length === 0) return null;
            const cycleInfo = CYCLES_REF.find(c => c.code === cycleCode)!;
            const countSelected = NIVEAUX_PAR_CYCLE[cycleCode].filter(n => selectedNiveaux[`${cycleCode}|${n}`]).length;
            return (
              <div key={cycleCode}>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{cycleInfo.nom.split('(')[0].trim()}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black">{countSelected}</span>
                  <button type="button" onClick={() => setAll(true, cycleCode)} className="ml-auto text-[10.5px] font-bold text-indigo-500 hover:underline cursor-pointer flex items-center gap-1">
                    <Check className="w-3 h-3" /> Sélectionner
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {niveaux.map(niveau => {
                    const key = `${cycleCode}|${niveau}`;
                    const checked = !!selectedNiveaux[key];
                    return (
                      <label
                        key={key}
                        className={`px-3 py-2 rounded-lg border flex items-center gap-2 cursor-pointer text-xs font-semibold transition-all ${
                          checked ? 'border-indigo-500 bg-indigo-500/10' : 'hover:border-indigo-500/40'
                        }`}
                        style={{ borderColor: checked ? '#6366f1' : 'var(--border)' }}
                      >
                        <input type="checkbox" checked={checked} onChange={() => onToggle(key)} className="w-3.5 h-3.5 rounded accent-indigo-600" />
                        <span style={{ color: 'var(--text-primary)' }}>{niveau}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" /> Ajouter les Classes Sélectionnées
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-500/10 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Modal : Ajout des Sections / Salles pour un Niveau ───────────────────
const SectionsModal: React.FC<{
  cycleCode: CodeCycleWizard;
  niveau: string;
  existingLabels: string[];
  onConfirm: (rows: { label: string; capacite: number }[]) => void;
  onClose: () => void;
}> = ({ niveau, existingLabels, onConfirm, onClose }) => {
  const defaultLabels = ['A', 'B', 'C'].filter(l => !existingLabels.includes(l));
  const [labelStyle, setLabelStyle] = useState<'ALPHA' | 'NUM'>('ALPHA');
  const [rows, setRows] = useState<{ id: string; label: string; capacite: number; checked: boolean }[]>(
    (defaultLabels.length > 0 ? defaultLabels : ['A', 'B', 'C']).map(l => ({ id: uuid(), label: l, capacite: 45, checked: true }))
  );

  const applyLabelStyle = (style: 'ALPHA' | 'NUM') => {
    setLabelStyle(style);
    const alpha = ['A', 'B', 'C', 'D', 'E', 'F'];
    setRows(prev => prev.map((r, i) => ({ ...r, label: style === 'ALPHA' ? (alpha[i] || `${i + 1}`) : `${i + 1}` })));
  };

  const addRow = () => {
    setRows(prev => [...prev, { id: uuid(), label: labelStyle === 'ALPHA' ? (['A','B','C','D','E','F'][prev.length] || `${prev.length + 1}`) : `${prev.length + 1}`, capacite: 45, checked: true }]);
  };

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const updateRow = (id: string, patch: Partial<{ label: string; capacite: number; checked: boolean }>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const handleConfirm = () => {
    const selected = rows.filter(r => r.checked && r.label.trim());
    if (selected.length === 0) return;
    onConfirm(selected.map(r => ({ label: r.label.trim(), capacite: r.capacite || 45 })));
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-sm font-black flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Sections / Salles Physiques</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Niveau : <strong style={{ color: 'var(--text-primary)' }}>{niveau}</strong></p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 sidebar-scroll space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Étiquetage :</span>
            <button
              type="button"
              onClick={() => applyLabelStyle('ALPHA')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${labelStyle === 'ALPHA' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500'}`}
              style={{ borderColor: labelStyle === 'ALPHA' ? undefined : 'var(--border)' }}
            >
              A, B, C
            </button>
            <button
              type="button"
              onClick={() => applyLabelStyle('NUM')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${labelStyle === 'NUM' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500'}`}
              style={{ borderColor: labelStyle === 'NUM' ? undefined : 'var(--border)' }}
            >
              1, 2, 3
            </button>
          </div>

          <div className="space-y-2">
            {rows.map(row => (
              <div key={row.id} className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={e => updateRow(row.id, { checked: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600 shrink-0"
                />
                <input
                  type="text"
                  value={row.label}
                  onChange={e => updateRow(row.id, { label: e.target.value })}
                  className="w-16 px-2 py-1.5 rounded-lg border text-xs font-black text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                />
                <span className="text-[11px] text-slate-400 shrink-0">{niveau}</span>
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <NumberInput
                    value={row.capacite}
                    onChange={v => updateRow(row.id, { capacite: v || 45 })}
                    min={5}
                    max={120}
                    integer
                    placeholder="45"
                    className="w-16 px-2 py-1.5 rounded-lg border text-xs font-bold text-center"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                  />
                  <span className="text-[10px] text-slate-400">élèves</span>
                </div>
                <button type="button" onClick={() => removeRow(row.id)} className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="w-full py-2 rounded-xl border border-dashed text-xs font-bold text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une Autre Section
          </button>
        </div>

        <div className="p-4 border-t flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" /> Ajouter les Sections Sélectionnées
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-500/10 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
