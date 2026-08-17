import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Calendar, Sparkles, ChevronRight, ChevronLeft, School, CreditCard,
  CheckCircle2, AlertTriangle, Plus, Trash2, Search, Check, Users, Layers,
  FileCheck, Loader2,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { AnneeScolaireConfig, ClasseScolaire, TypeFraisScolaire, CategorieFrais, StatutAnnéeScolaire, ModePaiementFrais } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { NumberInput } from '../common/NumberInput';
import {
  uuid, CodeCycleWizard, CYCLES_REF, NIVEAUX_PAR_CYCLE, CATEGORIES_FRAIS,
  DraftSection, DraftFee, ExistingYearSummary, feeLabel, feeCibleLabel,
  parseClassesToDraft, ClassPickerModal, SectionsModal,
} from './SchoolYearWizardShared';
import { genererTranches, tranchesDefautParMode, MODE_PAIEMENT_LABELS } from '../../utils/feeTranches';

interface SchoolYearOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  existingYears: ExistingYearSummary[];
  onCreated: (newYear: AnneeScolaireConfig) => void;
  /** Si fourni, le wizard passe en mode modification d'année scolaire existante */
  editingYear?: AnneeScolaireConfig | null;
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

// ─── Pré-remplissage depuis une année existante ───────────────────────────
function parseFraisAnnexesToDraft(year: AnneeScolaireConfig): DraftFee[] {
  return (year.fraisAnnexes || []).map(fa => {
    const priorite = fa.obligatoire ? 'OBLIGATOIRE' : 'REPARTI';
    const categorie = (fa.typeFrais || 'AUTRE') as DraftFee['categorie'];
    let cycleCode: DraftFee['cycleCode'] = 'TOUS';
    let cible = 'TRONC_COMMUN';

    // Essaie d'extraire le cycle et la cible depuis la portée
    if (fa.portee) {
      if (fa.portee.includes('TOUS')) {
        cycleCode = 'TOUS';
      } else {
        const cycleRef = CYCLES_REF.find(c => fa.portee!.includes(c.nom.split('(')[0].trim()));
        if (cycleRef) cycleCode = cycleRef.code;
      }
      const cibleMatch = fa.portee.match(/·\s*(.+)/);
      if (cibleMatch && cibleMatch[1] !== 'Tronc Commun') {
        cible = cibleMatch[1].trim();
      }
    }

    return {
      id: fa.id || uuid(),
      cycleCode,
      cible,
      categorie,
      nomPersonnalise: categorie === 'AUTRE' ? fa.intitule : undefined,
      montant: fa.montant,
      devise: (fa.devise as string) || 'USD',
      priorite,
      modePaiement: (fa.modePaiement as any) || 'UNIQUE',
      nombreTranches: (fa.nombreTranches as any) || 1,
    };
  });
}

export const SchoolYearOnboardingWizard: React.FC<SchoolYearOnboardingWizardProps> = ({
  isOpen, onClose, existingYears, onCreated, editingYear,
}) => {
  const { config, currencies, format } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);
  const isEditMode = !!editingYear;
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
    if (!isOpen) return;

    if (editingYear) {
      // Pré-remplissage mode édition
      setNom(editingYear.nom);
      setDebut(editingYear.debut);
      setFin(editingYear.fin);
      setObjectifEleves(editingYear.nombreElevesTotal || 0);
      setStatut(editingYear.statut);
      setStep(1);

      // Active les cycles présents dans l'année, sinon tous par défaut
      const yearCycles = (editingYear.cycles || []).map(c => c.code as CodeCycleWizard).filter(Boolean);
      setActiveCycles({
        MATERNELLE: yearCycles.includes('MATERNELLE'),
        PRIMAIRE: yearCycles.includes('PRIMAIRE'),
        SECONDAIRE_CTEB: yearCycles.includes('SECONDAIRE_CTEB'),
        HUMANITES: yearCycles.includes('HUMANITES'),
      });

      // Charge et parse les classes existantes
      LocalDatabaseService.getClasses(editingYear.id).then(classes => {
        const { selected, sections } = parseClassesToDraft(classes);
        setSelectedNiveaux(selected);
        setSections(sections);
      });

      // Parse les frais annexes
      setFees(parseFraisAnnexesToDraft(editingYear));
    } else {
      const d = computeDefaults(existingYears);
      setNom(d.nom);
      setDebut(d.debut);
      setFin(d.fin);
      setObjectifEleves(0);
      setStatut(existingYears.length === 0 ? 'EN_COURS' : 'PLANIFIEE');
      const cfgCycles = config?.selectedCycles;
      if (cfgCycles && cfgCycles.length > 0) {
        setActiveCycles({
          MATERNELLE: cfgCycles.includes('MATERNELLE'),
          PRIMAIRE: cfgCycles.includes('PRIMAIRE'),
          SECONDAIRE_CTEB: cfgCycles.includes('CTEB') || cfgCycles.includes('SECONDAIRE_CTEB'),
          HUMANITES: cfgCycles.includes('HUMANITES'),
        });
      } else {
        setActiveCycles({ MATERNELLE: true, PRIMAIRE: true, SECONDAIRE_CTEB: true, HUMANITES: true });
      }
      setSelectedNiveaux({});
      setSections([]);
      setFees([]);
      setStep(1);
    }
  }, [isOpen, editingYear, existingYears, config?.selectedCycles]);

  const nameConflict = existingYears.some(y => {
    if (editingYear && y.id === editingYear.id) return false;
    return y.nom.trim().toLowerCase() === nom.trim().toLowerCase();
  });
  const dateConflict = existingYears.some(y => {
    if (editingYear && y.id === editingYear.id) return false;
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
  const [feeDevise, setFeeDevise] = useState<string>('USD');
  const [feePriorite, setFeePriorite] = useState<'OBLIGATOIRE' | 'REPARTI'>('OBLIGATOIRE');
  const [feeModePaiement, setFeeModePaiement] = useState<ModePaiementFrais>('UNIQUE');
  const [feeNombreTranches, setFeeNombreTranches] = useState<number>(1);

  // Synchronise le nombre de tranches par défaut quand le mode change
  useEffect(() => {
    setFeeNombreTranches(tranchesDefautParMode[feeModePaiement]);
  }, [feeModePaiement]);

  const cyclesActifsCodes = (Object.keys(activeCycles) as CodeCycleWizard[]).filter(c => activeCycles[c]);

  const niveauxDuCycleFrais = useMemo(() => {
    if (feeCycle === 'TOUS') return [];
    return selectedNiveauxList.filter(n => n.cycleCode === feeCycle).map(n => n.niveau);
  }, [feeCycle, selectedNiveauxList]);

  const handleAddFee = () => {
    if (feeCategorie === 'AUTRE' && !feeNomPerso.trim()) return;
    if (feeMontant <= 0) return;
    const count = feeModePaiement === 'PERSONNALISE' ? Math.max(1, feeNombreTranches) : tranchesDefautParMode[feeModePaiement];
    setFees(prev => [...prev, {
      id: uuid(),
      cycleCode: feeCycle,
      cible: feeCible,
      categorie: feeCategorie,
      nomPersonnalise: feeCategorie === 'AUTRE' ? feeNomPerso.trim() : undefined,
      montant: feeMontant,
      devise: feeDevise,
      priorite: feePriorite,
      modePaiement: feeModePaiement,
      nombreTranches: count,
    }]);
    setFeeNomPerso('');
  };

  const removeFee = (id: string) => setFees(prev => prev.filter(f => f.id !== id));

  // ── Étape 4 : Récapitulatif & Persistance ──
  const canGoNextFromStep2 = sections.length > 0;

  const buildYearPayload = (): Partial<AnneeScolaireConfig> => {
    const cyclesConfig = cyclesActifsCodes.map(code => ({
      id: uuid(),
      code,
      nom: CYCLES_REF.find(c => c.code === code)?.nom || code,
      actif: true,
      classesCount: sections.filter(s => s.cycleCode === code).length,
      sallesCount: sections.filter(s => s.cycleCode === code).length,
    }));

    const fraisAnnexes = fees.map(f => ({
      id: f.id || uuid(),
      intitule: `${feeLabel(f)} — ${feeCibleLabel(f)}`,
      montant: f.montant,
      devise: f.devise,
      obligatoire: f.priorite === 'OBLIGATOIRE',
      typeFrais: f.categorie,
      priorite: f.priorite,
      portee: feeCibleLabel(f),
      modePaiement: f.modePaiement,
      nombreTranches: f.nombreTranches,
    }));

    return {
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
    };
  };

  const handleFinalize = async () => {
    setSaving(true);
    try {
      if (editingYear) {
        // Mode édition : on ne supprime pas les classes/frais existants,
        // on met à jour l'année et on ajoute les nouvelles classes/frais.

        if (statut === 'EN_COURS') {
          for (const y of existingYears) {
            if (y.id !== editingYear.id && y.statut === 'EN_COURS') {
              await LocalDatabaseService.updateSchoolYear(y.id, { statut: 'CLOTUREE' });
            }
          }
        }

        await LocalDatabaseService.updateSchoolYear(editingYear.id, buildYearPayload());

        // Charger les classes existantes pour éviter les doublons
        const existingClasses = await LocalDatabaseService.getClasses(editingYear.id);
        const existingNames = new Set(existingClasses.map(c => c.nom));

        for (const sec of sections) {
          const className = `${sec.niveau} ${sec.label}`;
          if (existingNames.has(className)) continue;
          const classe: ClasseScolaire = {
            id: uuid(),
            schoolYearId: editingYear.id,
            cycleId: sec.cycleCode,
            cycleCode: sec.cycleCode,
            nom: className,
            salle: className,
            optionCode: 'TRONC_COMMUN',
            nombreEleves: 0,
            capacite: sec.capacite,
            professeurTitulaire: 'Non Attribué',
          };
          await LocalDatabaseService.addClass(classe);
        }

        // Ajoute ou met à jour les types de frais
        const existingFeeTypes = await LocalDatabaseService.getFeeTypes(editingYear.id);
        const feeTypeKey = (ft: any) => `${ft.categorie}|${ft.portee || ''}`;
        const existingFeeKeys = new Set(existingFeeTypes.map(feeTypeKey));

        for (const f of fees) {
          const key = `${f.categorie}|${feeCibleLabel(f)}`;
          const count = f.modePaiement === 'PERSONNALISE' ? Math.max(1, f.nombreTranches) : tranchesDefautParMode[f.modePaiement || 'UNIQUE'];
          const ft: TypeFraisScolaire = {
            id: f.id || uuid(),
            code: f.categorie.slice(0, 8),
            nom: feeLabel(f),
            categorie: f.categorie,
            montant: f.montant,
            devise: f.devise,
            obligatoire: f.priorite === 'OBLIGATOIRE',
            portee: feeCibleLabel(f),
            schoolYearId: editingYear.id,
            anneeScolaireId: editingYear.id,
            cycleId: f.cycleCode === 'TOUS' ? 'TOUS' : f.cycleCode,
            optionCode: f.cible === 'TRONC_COMMUN' ? 'TOUS' : f.cible,
            regime: 'TOUS',
            actif: true,
            modePaiement: f.modePaiement || 'UNIQUE',
            nombreTranches: count,
            tranches: genererTranches(f.modePaiement || 'UNIQUE', count, f.montant, f.devise, debut, fin, feeCibleLabel(f)),
          };
          if (existingFeeKeys.has(key)) {
            const existing = existingFeeTypes.find(ef => feeTypeKey(ef) === key);
            if (existing) await LocalDatabaseService.updateFeeType(existing.id, { ...ft, id: existing.id });
          } else {
            await LocalDatabaseService.addFeeType(ft);
          }
        }

        onCreated({ ...editingYear, ...buildYearPayload() } as AnneeScolaireConfig);
        onClose();
        return;
      }

      // Mode création
      const newYearId = uuid();

      if (statut === 'EN_COURS') {
        for (const y of existingYears) {
          if (y.statut === 'EN_COURS') {
            await LocalDatabaseService.updateSchoolYear(y.id, { statut: 'CLOTUREE' });
          }
        }
      }

      const newYear: AnneeScolaireConfig = {
        id: newYearId,
        ...buildYearPayload(),
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
      } as AnneeScolaireConfig;

      await LocalDatabaseService.addSchoolYear(newYear);

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

      for (const f of fees) {
        const count = f.modePaiement === 'PERSONNALISE' ? Math.max(1, f.nombreTranches) : tranchesDefautParMode[f.modePaiement || 'UNIQUE'];
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
          modePaiement: f.modePaiement || 'UNIQUE',
          nombreTranches: count,
          tranches: genererTranches(f.modePaiement || 'UNIQUE', count, f.montant, f.devise, debut, fin, feeCibleLabel(f)),
        };
        await LocalDatabaseService.addFeeType(ft);
      }

      onCreated(newYear);
      onClose();
    } catch (err) {
      console.error('[SchoolYearOnboardingWizard] Erreur année scolaire :', err);
      alert("Une erreur est survenue lors de l'enregistrement de l'année scolaire.");
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
                <h3 className="font-extrabold text-base">{isEditMode ? 'Modifier — Année Scolaire' : 'Onboarding — Nouvelle Année Scolaire'}</h3>
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
                    onClick={() => { if (isEditMode || isDone) setStep(s.step); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isActive ? 'bg-indigo-600 text-white shadow-xs' : (isDone || isEditMode) ? 'text-indigo-600 dark:text-indigo-400 cursor-pointer hover:bg-indigo-500/10' : 'text-slate-400'
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                    <CustomSelect value={feeDevise} onChange={v => setFeeDevise(v as any)} options={currencies.map(c => ({ value: c.code, label: `${c.code} (${c.symbol})` }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Priorité</label>
                    <CustomSelect
                      value={feePriorite}
                      onChange={v => setFeePriorite(v as any)}
                      options={[{ value: 'OBLIGATOIRE', label: 'Obligatoire' }, { value: 'REPARTI', label: 'Réparti (Optionnel / Échelonné)' }]}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Mode de paiement</label>
                    <CustomSelect
                      value={feeModePaiement}
                      onChange={v => setFeeModePaiement(v as ModePaiementFrais)}
                      options={[
                        { value: 'UNIQUE', label: 'Unique' },
                        { value: 'MENSUEL', label: 'Mensuel (RDC)' },
                        { value: 'TRIMESTRIEL', label: 'Trimestriel' },
                        { value: 'SEMESTRIEL', label: 'Semestriel' },
                        { value: 'PERSONNALISE', label: 'Personnalisé' },
                      ]}
                    />
                  </div>
                  {feeModePaiement === 'PERSONNALISE' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Nb. tranches</label>
                      <NumberInput
                        value={feeNombreTranches}
                        onChange={setFeeNombreTranches}
                        min={1}
                        placeholder="Tranches"
                        className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                      />
                    </div>
                  )}
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
                          <th className="p-2.5">Paiement</th>
                          <th className="p-2.5">Priorité</th>
                          <th className="p-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {fees.map(f => (
                          <tr key={f.id}>
                            <td className="p-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>{feeLabel(f)}</td>
                            <td className="p-2.5 text-slate-400">{feeCibleLabel(f)}</td>
                            <td className="p-2.5 font-black text-indigo-600 dark:text-indigo-400">{fmt(f.montant, f.devise)}</td>
                            <td className="p-2.5 text-[10px] text-slate-500">{MODE_PAIEMENT_LABELS[f.modePaiement]} ({f.nombreTranches}x)</td>
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
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">{fmt(f.montant, f.devise)} — {MODE_PAIEMENT_LABELS[f.modePaiement]} ({f.nombreTranches}x)</span>
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
              disabled={!isEditMode && ((step === 1 && (!nom.trim() || nameConflict)) || (step === 2 && !canGoNextFromStep2))}
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
              <span>{saving ? (isEditMode ? 'Enregistrement…' : 'Création en cours…') : (isEditMode ? 'Appliquer les modifications' : "Créer l'Année Scolaire")}</span>
            </button>
          )}
        </div>
      </div>

      {showClassPicker && (
        <ClassPickerModal
          activeCycles={cyclesActifsCodes}
          selectedNiveaux={selectedNiveaux}
          onToggle={(key) => setSelectedNiveaux(prev => ({ ...prev, [key]: !prev[key] }))}
          onConfirm={() => {
            setSections(prev => prev.filter(s => selectedNiveaux[`${s.cycleCode}|${s.niveau}`]));
            setShowClassPicker(false);
          }}
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
