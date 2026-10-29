import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Search,
  GraduationCap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Save,
  User,
  Banknote,
  Clock,
  CreditCard,
} from 'lucide-react';
import type { Eleve, ClasseScolaire, AnneeScolaireConfig, FactureEleve, LigneFacture, TypeFraisScolaire, FraisAnnexeConfig, HistoriqueInscription, TransactionPaiement } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { showToast } from '../common/ToastNotification';
import { uuid } from '../../utils/feeTranches';
import { isFeeTypeApplicable, isFraisAnnexeApplicable } from '../../utils/feeFilters';
import { convertCurrencyFromList } from '../../utils/currency';

const CYCLE_LABELS: Record<string, string> = {
  MATERNELLE: 'Cycle Maternelle',
  PRIMAIRE: 'Cycle Primaire',
  SECONDAIRE_CTEB: 'Secondaire CTEB',
  HUMANITES: 'Humanités',
};

const PASSAGE_THRESHOLD = 50;

type StepType = 'SEARCH' | 'ACADEMIC' | 'FEES';
type DecisionType = 'PASS' | 'REPEAT' | 'EXCLU';

interface ReinscriptionPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface FeeLine {
  id: string;
  feeTypeId: string;
  nom: string;
  categorie: string;
  montant: number; // en devise de facture
  devise: string;  // devise de facture
  selected: boolean;
  obligatoire: boolean;
  fromAnnexe?: boolean;
  priorite?: number | string;
  payeALInscription?: boolean;
}

const CATEGORIE_BASE = new Set(['FRAIS_INSCRIPTION', 'FRAIS_REINSCRIPTION']);

const getFeePriorityInfo = (fee: { nom?: string; categorie?: string; priorite?: number | string; obligatoire?: boolean; payeALInscription?: boolean }) => {
  if (typeof fee.priorite === 'number' && fee.priorite > 0) {
    return {
      priority: fee.priorite,
      code: `P${fee.priorite}`,
      label: `P${fee.priorite} - ${fee.nom || 'Frais'}`,
      color: '#10b981',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    };
  }
  const cat = String(fee.categorie || '');
  if (fee.obligatoire || fee.payeALInscription) {
    return { priority: 1, code: 'P1', label: 'P1 - Inscription (Obligatoire)', color: '#10b981', badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
  }
  if (cat.includes('CARTE') || cat.includes('MINERVAL')) {
    return { priority: 2, code: 'P2', label: 'P2 - Identité & Minerval', color: '#6366f1', badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' };
  }
  if (cat.includes('CONNEXES') || cat.includes('KITS') || cat.includes('EQUIPEMENTS') || cat.includes('BUS') || cat.includes('ACTIVITE')) {
    return { priority: 3, code: 'P3', label: 'P3 - Services & Équipements', color: '#f59e0b', badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
  }
  return { priority: 4, code: 'P4', label: 'P4 - Frais Optionnels', color: '#64748b', badgeBg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
};

const MOYEN_PAIEMENT_OPTIONS: SelectOption[] = [
  { value: 'CASH', label: 'Cash en Caisse', icon: Banknote },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (M-Pesa / Orange / Airtel)', icon: undefined },
  { value: 'VIREMENT', label: 'Virement Bancaire / Chèque', icon: undefined },
];

export const ReinscriptionPage: React.FC<ReinscriptionPageProps> = ({ onBack, onSuccess }) => {
  const { currency, referenceCurrency, currencies, format } = useSchoolConfig();
  const invoiceDevise = currency || referenceCurrency || 'USD';

  const [step, setStep] = useState<StepType>('SEARCH');

  // Données de référence
  const [allStudents, setAllStudents] = useState<Eleve[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [loading, setLoading] = useState(false);

  // Étape 1 : recherche
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Eleve | null>(null);

  // Étape 2 : décision académique
  const [targetYearId, setTargetYearId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [decision, setDecision] = useState<DecisionType>('PASS');
  const [comment, setComment] = useState('');

  // Étape 3 : frais & paiement
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [feeLines, setFeeLines] = useState<FeeLine[]>([]);
  const [payNow, setPayNow] = useState(true);
  const [customFeePayments, setCustomFeePayments] = useState<Record<string, number>>({});
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [paymentReference, setPaymentReference] = useState('');

  const [saving, setSaving] = useState(false);

  // Chargement initial
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [stdList, clsList, yearList, ftList] = await Promise.all([
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSchoolYears(),
        LocalDatabaseService.getFeeTypes(),
      ]);
      setAllStudents(stdList);
      setStudents(stdList);
      setClasses(clsList);
      setYears(yearList);
      setFeeTypes(ftList);
      setLoading(false);
    };
    load();
  }, []);

  // Filtre de recherche
  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setStudents(allStudents);
      return;
    }
    setStudents(allStudents.filter(s => {
      const full = `${s.prenom} ${s.nom} ${s.postnom || ''} ${s.registrationNumber} ${s.nomClasse || ''}`.toLowerCase();
      return full.includes(q);
    }));
  }, [search, allStudents]);

  // Année cible par défaut quand on sélectionne un élève
  useEffect(() => {
    if (selectedStudent && years.length) {
      const currentYear = years.find(y => y.id === selectedStudent.schoolYearId);
      const nextYear =
        years.find(y => y.id !== selectedStudent.schoolYearId && y.statut === 'EN_COURS') ||
        years.find(y => y.id !== selectedStudent.schoolYearId && y.statut === 'PLANIFIEE') ||
        years.find(y => y.id !== selectedStudent.schoolYearId) ||
        years[0];
      const defaultYear = nextYear || currentYear;
      setTargetYearId(defaultYear?.id || '');
    }
  }, [selectedStudent, years]);

  // Décision automatique selon les résultats de l'élève sélectionné
  const recommendedDecision = useMemo<DecisionType>(() => {
    if (!selectedStudent) return 'PASS';
    if (selectedStudent.decisionConseil) {
      const d = selectedStudent.decisionConseil.toLowerCase();
      if (d.includes('admis') || d.includes('pass') || d.includes('promu') || d.includes('réussite')) return 'PASS';
      if (d.includes('redouble') || d.includes('échec') || d.includes('recalé')) return 'REPEAT';
      if (d.includes('exclu') || d.includes('renvoi')) return 'EXCLU';
    }
    if (typeof selectedStudent.pourcentageGeneral === 'number') {
      return selectedStudent.pourcentageGeneral >= PASSAGE_THRESHOLD ? 'PASS' : 'REPEAT';
    }
    return 'PASS';
  }, [selectedStudent]);

  const targetYear = useMemo(() => years.find(y => y.id === targetYearId), [years, targetYearId]);

  // Classes cibles filtrées par année cible
  const targetClasses = useMemo(() => {
    return classes
      .filter(c => c.schoolYearId === targetYearId || !c.schoolYearId)
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [classes, targetYearId]);

  // Classe cible par défaut
  useEffect(() => {
    const currentClass = classes.find(c => c.id === selectedStudent?.classId);
    if (!currentClass) {
      setTargetClassId(targetClasses[0]?.id || '');
      return;
    }
    let suggestion: ClasseScolaire | undefined;
    if (decision === 'REPEAT') {
      suggestion =
        targetClasses.find(c => c.nom === currentClass.nom) ||
        targetClasses.find(c =>
          c.cycleId === currentClass.cycleId &&
          (c.optionCode || 'TRONC_COMMUN') === (currentClass.optionCode || 'TRONC_COMMUN')
        );
    } else if (decision === 'PASS') {
      suggestion = targetClasses.find(c =>
        c.cycleId === currentClass.cycleId &&
        (c.optionCode || 'TRONC_COMMUN') === (currentClass.optionCode || 'TRONC_COMMUN')
      );
    }
    setTargetClassId(suggestion?.id || targetClasses[0]?.id || '');
  }, [targetClasses, decision, selectedStudent, classes]);

  const targetClass = useMemo(() => targetClasses.find(c => c.id === targetClassId), [targetClasses, targetClassId]);
  const currentClass = useMemo(() => classes.find(c => c.id === selectedStudent?.classId), [classes, selectedStudent]);

  // Calcul des frais applicables
  const buildFeeLines = React.useCallback(() => {
    if (!selectedStudent || !targetClass || !targetYear) return;

    const ctx = {
      schoolYearId: targetYear.id,
      classId: targetClass.id,
      className: targetClass.nom,
      cycleId: targetClass.cycleId,
      option: targetClass.optionCode || 'TRONC_COMMUN',
      salleId: targetClass.salleCode || undefined,
      regime: (selectedStudent as any).regime || 'TOUS',
    };

    const lines: FeeLine[] = [];

    const toInvoiceCurrency = (amount: number, from: string) =>
      convertCurrencyFromList(amount, from || referenceCurrency, invoiceDevise, currencies);

    // Frais types
    for (const ft of feeTypes) {
      if (!isFeeTypeApplicable(ft, ctx, CYCLE_LABELS)) continue;

      let rawMontant = ft.montant || 0;
      let rawDevise = ft.devise || referenceCurrency || 'USD';

      // Montants prioritaires de l'année scolaire
      if (CATEGORIE_BASE.has(ft.categorie || '')) {
        if (targetYear.fraisReinscription > 0) {
          rawMontant = targetYear.fraisReinscription;
          rawDevise = referenceCurrency || 'USD';
        } else if (targetYear.fraisInscription > 0) {
          rawMontant = targetYear.fraisInscription;
          rawDevise = referenceCurrency || 'USD';
        }
      } else if (ft.categorie === 'FRAIS_CARTE' && targetYear.fraisCarte > 0) {
        rawMontant = targetYear.fraisCarte;
        rawDevise = referenceCurrency || 'USD';
      }

      lines.push({
        id: uuid(),
        feeTypeId: ft.id,
        nom: ft.nom,
        categorie: ft.categorie || 'FRAIS_CONNEXES',
        montant: toInvoiceCurrency(rawMontant, rawDevise),
        devise: invoiceDevise,
        selected: ft.actif !== false && (ft.obligatoire === true || ft.payeALInscription === true),
        obligatoire: ft.obligatoire === true,
        priorite: ft.priorite,
        payeALInscription: ft.payeALInscription,
      });
    }

    // Si aucun frais de réinscription/inscription n'existe dans feeTypes, créer une ligne synthétique
    const hasBaseFee = lines.some(l => CATEGORIE_BASE.has(l.categorie));
    if (!hasBaseFee) {
      if (targetYear.fraisReinscription > 0) {
        lines.push({
          id: uuid(),
          feeTypeId: 'reinscription-synthese',
          nom: 'Frais de réinscription',
          categorie: 'FRAIS_REINSCRIPTION',
          montant: toInvoiceCurrency(targetYear.fraisReinscription, referenceCurrency || 'USD'),
          devise: invoiceDevise,
          selected: true,
          obligatoire: true,
        });
      } else if (targetYear.fraisInscription > 0) {
        lines.push({
          id: uuid(),
          feeTypeId: 'inscription-synthese',
          nom: "Frais d'inscription",
          categorie: 'FRAIS_INSCRIPTION',
          montant: toInvoiceCurrency(targetYear.fraisInscription, referenceCurrency || 'USD'),
          devise: invoiceDevise,
          selected: true,
          obligatoire: true,
        });
      }
    }

    // Frais annexes de l'année scolaire
    for (const fa of targetYear.fraisAnnexes || []) {
      if (isFraisAnnexeApplicable(fa, ctx, CYCLE_LABELS)) {
        const rawDevise = fa.devise || referenceCurrency || 'USD';
        lines.push({
          id: uuid(),
          feeTypeId: `annexe-${fa.id}`,
          nom: fa.intitule,
          categorie: (fa.typeFrais as any) || 'FRAIS_CONNEXES',
          montant: toInvoiceCurrency(fa.montant, rawDevise),
          devise: invoiceDevise,
          selected: fa.obligatoire,
          obligatoire: fa.obligatoire,
          fromAnnexe: true,
          priorite: fa.priorite,
        });
      }
    }

    // Réinitialiser les versements partiels à chaque recalcul
    setCustomFeePayments({});
    setFeeLines(lines);
  }, [selectedStudent, targetClass, targetYear, feeTypes, referenceCurrency, invoiceDevise, currencies]);

  // Quand on arrive à l'étape frais ou que la classe/année change, recalculer
  useEffect(() => {
    if (step === 'FEES') {
      buildFeeLines();
    }
  }, [step, buildFeeLines]);

  const toggleFee = (id: string) => {
    setFeeLines(prev => prev.map(l => l.id === id ? { ...l, selected: !l.selected } : l));
  };

  const updateFeeAmount = (id: string, val: number) => {
    setFeeLines(prev => prev.map(l => l.id === id ? { ...l, montant: val } : l));
  };

  const setAllSelected = (selected: boolean) => {
    setFeeLines(prev => prev.map(l => (l.obligatoire ? l : { ...l, selected })));
  };

  const setOnlyMandatory = () => {
    setFeeLines(prev => prev.map(l => ({ ...l, selected: l.obligatoire })));
  };

  const selectedFeeLines = useMemo(() => feeLines.filter(l => l.selected), [feeLines]);
  const totalFacture = useMemo(() => selectedFeeLines.reduce((sum, l) => sum + l.montant, 0), [selectedFeeLines]);

  const totalPaidCalculated = useMemo(() => {
    if (!payNow) return 0;
    return selectedFeeLines.reduce((sum, l) => {
      const paid = customFeePayments[l.feeTypeId] ?? 0;
      return sum + Math.min(l.montant, Math.max(0, paid));
    }, 0);
  }, [selectedFeeLines, customFeePayments, payNow]);

  const allocatedFeeLines = useMemo(() => {
    const sorted = [...selectedFeeLines].sort((a, b) => {
      const prioA = getFeePriorityInfo(a).priority;
      const prioB = getFeePriorityInfo(b).priority;
      return prioA - prioB;
    });

    return sorted.map(ligne => {
      const prioInfo = getFeePriorityInfo(ligne);
      const rawUserPaid = payNow ? (customFeePayments[ligne.feeTypeId] ?? 0) : 0;
      const allocated = Math.min(ligne.montant, Math.max(0, rawUserPaid));
      const soldeRestant = Math.max(0, ligne.montant - allocated);
      const isCovered = allocated >= ligne.montant - 0.001;
      const isPartial = allocated > 0 && !isCovered;

      return { ...ligne, prioInfo, allocated, soldeRestant, isCovered, isPartial };
    });
  }, [selectedFeeLines, customFeePayments, payNow]);

  const totalSoldeRestant = useMemo(() => totalFacture - totalPaidCalculated, [totalFacture, totalPaidCalculated]);

  const currencyOptions: SelectOption[] = useMemo(() => {
    return (currencies.length ? currencies : [{ code: 'USD' } as any]).map((c: any) => ({
      value: c.code,
      label: `${c.code}${c.name ? ` — ${c.name}` : ''}`,
    }));
  }, [currencies]);

  const yearOptions: SelectOption[] = useMemo(() => {
    return years.map(y => ({
      value: y.id,
      label: `${y.nom} ${y.statut === 'EN_COURS' ? '(Active)' : y.statut === 'PLANIFIEE' ? '(Planifiée)' : ''}`,
    }));
  }, [years]);

  const classOptions: SelectOption[] = useMemo(() => {
    return targetClasses.map(c => ({
      value: c.id,
      label: `${c.nom}${c.salle ? ` — Salle ${c.salle}` : ''}`,
    }));
  }, [targetClasses]);

  const decisionOptions = [
    { value: 'PASS', label: 'Passage', color: 'emerald', description: 'Passe à la classe supérieure' },
    { value: 'REPEAT', label: 'Redoublement', color: 'amber', description: 'Reste dans la même classe' },
    { value: 'EXCLU', label: 'Exclusion', color: 'rose', description: "N'est pas réinscrit" },
  ];

  const handleSelectStudent = (s: Eleve) => {
    setSelectedStudent(s);
    setDecision(recommendedDecision);
    setStep('ACADEMIC');
  };

  const handleConfirm = async () => {
    if (!selectedStudent || !targetYear || !targetClass) return;

    if (decision !== 'EXCLU' && selectedFeeLines.length === 0) {
      showToast('Aucun frais', 'Veuillez sélectionner au moins un frais ou passer en exclusion.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const invoiceTotal = totalFacture;
      const invoiceDev = invoiceDevise;

      const linesToInvoice: LigneFacture[] = selectedFeeLines
        .filter(l => decision !== 'EXCLU')
        .map(l => ({
          id: uuid(),
          invoiceId: '',
          feeTypeId: l.feeTypeId,
          nom: l.nom,
          categorie: l.categorie as any,
          montant: l.montant,
          devise: l.devise,
        }));

      let facture: FactureEleve | null = null;
      if (decision !== 'EXCLU' && invoiceTotal > 0) {
        const invoice: FactureEleve = {
          id: uuid(),
          anneeScolaireId: targetYear.id,
          schoolYearId: targetYear.id,
          anneeScolaire: targetYear.nom,
          numeroFacture: `F-REIN-${Date.now()}`,
          eleveId: selectedStudent.id,
          studentId: selectedStudent.id,
          nomEleve: `${selectedStudent.prenom} ${selectedStudent.nom}`,
          nomClasse: targetClass.nom,
          classeId: targetClass.id,
          montantTotal: invoiceTotal,
          montantPaye: 0,
          devise: invoiceDev,
          statut: 'NON_PAYE',
          dateEcheance: dueDate,
          lignes: linesToInvoice,
        };

        const saved = await LocalDatabaseService.addInvoice(invoice);
        if (saved) facture = saved;
      }

      // Paiement immédiat
      if (payNow && facture && totalPaidCalculated > 0.001) {
        const allocations = allocatedFeeLines
          .filter(l => l.allocated > 0.001)
          .map(l => ({
            feeTypeId: l.feeTypeId,
            montant: Number(l.allocated.toFixed(2)),
          }));

        const payment: TransactionPaiement = {
          id: `pay_${Date.now()}`,
          anneeScolaireId: targetYear.id,
          invoiceId: facture.id,
          eleveId: selectedStudent.id,
          studentId: selectedStudent.id,
          nomEleve: `${selectedStudent.prenom} ${selectedStudent.nom}`,
          registrationNumber: selectedStudent.registrationNumber || '',
          montantPaye: Number(totalPaidCalculated.toFixed(2)),
          devise: invoiceDev,
          moyenPaiement: paymentMode as any,
          reference: paymentReference,
          numeroRecu: `R-${Date.now()}`,
          dateCreation: new Date().toISOString().split('T')[0],
          nomCaissier: 'Caissier',
          jetonQrCode: `qr-${selectedStudent.registrationNumber || selectedStudent.id}`,
          allocations,
        };

        await LocalDatabaseService.addPayment(payment);
      }

      const historyEntry: HistoriqueInscription = {
        id: uuid(),
        anneeScolaireId: targetYear.id,
        anneeScolaireNom: targetYear.nom,
        ancienneClasseId: currentClass?.id,
        ancienneClasseNom: currentClass?.nom || selectedStudent.nomClasse,
        nouvelleClasseId: targetClass.id,
        nouvelleClasseNom: targetClass.nom,
        decision,
        moyenne: selectedStudent.pourcentageGeneral,
        mention: selectedStudent.mentionConseil,
        montantFrais: decision === 'EXCLU' ? undefined : invoiceTotal,
        deviseFrais: decision === 'EXCLU' ? undefined : invoiceDev,
        fraisFactureId: facture?.id,
        date: new Date().toISOString(),
        commentaire: comment,
      };

      const updatedHistory = [...(selectedStudent.historiqueInscriptions || []), historyEntry];

      await LocalDatabaseService.updateEleve(selectedStudent.id, {
        schoolYearId: targetYear.id,
        anneePrecedente: selectedStudent.schoolYearId,
        moyenneAnneePrecedente: selectedStudent.pourcentageGeneral,
        classId: targetClass.id,
        nomClasse: targetClass.nom,
        statut: decision === 'EXCLU' ? 'EXCLU' : decision === 'REPEAT' ? 'REDOUBLANT' : 'ACTIF',
        historiqueInscriptions: updatedHistory,
      });

      showToast(
        'Réinscription effectuée',
        `${selectedStudent.prenom} ${selectedStudent.nom} a été ${decision === 'PASS' ? 'promu' : decision === 'REPEAT' ? 'redoublant' : 'exclu'} ${decision !== 'EXCLU' ? 'vers ' + targetClass.nom : ''}${facture ? ' avec facture' : ''}${payNow && facture && totalPaidCalculated > 0 ? ' et paiement' : ''}.`,
        'success'
      );
      onSuccess();
    } catch (err: any) {
      console.error('[ReinscriptionPage] Erreur :', err);
      showToast('Erreur', err.message || 'La réinscription a échoué.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    const order: StepType[] = ['SEARCH', 'ACADEMIC', 'FEES'];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  };

  const prevStep = () => {
    const order: StepType[] = ['SEARCH', 'ACADEMIC', 'FEES'];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const canGoNext = () => {
    if (step === 'SEARCH') return !!selectedStudent;
    if (step === 'ACADEMIC') return !!targetYear && !!targetClass;
    return true;
  };

  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer hover:bg-slate-500/10"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        <ArrowLeft className="w-4 h-4 text-indigo-500" />
        <span>Retour à la Liste des Élèves</span>
      </button>

      <div className="flex items-center gap-2">
        {(['SEARCH', 'ACADEMIC', 'FEES'] as StepType[]).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === s
                  ? 'bg-indigo-600 text-white'
                  : i < ['SEARCH', 'ACADEMIC', 'FEES'].indexOf(step)
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="w-6 h-0.5 rounded-full" style={{ background: 'var(--border)' }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Rechercher l'élève à réinscrire</h2>
            <p className="text-xs text-slate-500">Saisissez le nom, prénom, post-nom, matricule ou classe.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élève existant..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Chargement des élèves...</div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b uppercase text-[10px] font-bold text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <th className="p-3">Élève</th>
                <th className="p-3">Matricule</th>
                <th className="p-3">Classe actuelle</th>
                <th className="p-3">Année</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Aucun élève trouvé.</td>
                </tr>
              ) : (
                students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="p-3 font-extrabold" style={{ color: 'var(--text-primary)' }}>
                      {s.prenom} {s.nom} {s.postnom}
                    </td>
                    <td className="p-3 font-mono text-indigo-600">{s.registrationNumber}</td>
                    <td className="p-3 font-bold">{s.nomClasse || '—'}</td>
                    <td className="p-3 text-slate-500">{years.find(y => y.id === s.schoolYearId)?.nom || s.schoolYearId}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                        {s.statut}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleSelectStudent(s)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs active:scale-95 shadow-xs cursor-pointer transition-all"
                      >
                        Sélectionner
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderAcademic = () => {
    if (!selectedStudent) return null;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Élève sélectionné</h2>
              <p className="text-xs text-slate-500">Vérifiez la situation actuelle avant de décider du passage.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Nom</span>
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{selectedStudent.prenom} {selectedStudent.nom}</p>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Classe actuelle</span>
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{selectedStudent.nomClasse || '—'}</p>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Moyenne</span>
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                {typeof selectedStudent.pourcentageGeneral === 'number' ? `${selectedStudent.pourcentageGeneral}%` : 'Non disponible'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Décision du passage</h3>
            <button
              onClick={() => setDecision(recommendedDecision)}
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              <RotateCcw className="w-3 h-3" />
              Recommandation : {decisionOptions.find(d => d.value === recommendedDecision)?.label}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {decisionOptions.map(d => {
              const active = decision === d.value;
              const color = d.color;
              return (
                <button
                  key={d.value}
                  onClick={() => setDecision(d.value as DecisionType)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    active ? `bg-${color}-500/10 border-${color}-500/40 text-${color}-600` : 'border-slate-200 text-slate-500 hover:bg-slate-500/5'
                  }`}
                  style={{ borderColor: active ? undefined : 'var(--border)' }}
                >
                  <span>{d.label}</span>
                  <span className="text-[9.5px] font-normal opacity-75 text-center leading-tight">{d.description}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500">Année scolaire cible</label>
              <CustomSelect options={yearOptions} value={targetYearId} onChange={setTargetYearId} placeholder="Choisir l'année" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500">Classe cible</label>
              <CustomSelect options={classOptions} value={targetClassId} onChange={setTargetClassId} placeholder="Choisir la classe" />
            </div>
          </div>

          {targetClass && currentClass && decision === 'PASS' && targetClass.id === currentClass.id && (
            <div className="mt-3 p-2 rounded-lg bg-amber-500/5 text-amber-600 text-[10.5px] font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              La classe cible est identique à la classe actuelle. Voulez-vous plutôt redoubler ?
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <label className="text-[10.5px] font-bold text-slate-500 uppercase block mb-1.5">Commentaire (optionnel)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="Observation du conseil, motif..."
          />
        </div>
      </div>
    );
  };

  const renderFees = () => {
    if (!targetYear || !targetClass) return null;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Bloc principal Frais Scolaires & Facturation Priorisée */}
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-5">
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>3. Frais Scolaires & Facturation Priorisée</span>
            </h3>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Facture Réinscription</p>
              <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                {format(totalFacture, invoiceDevise)}
              </p>
            </div>
          </div>

          {/* Choix : Payer maintenant ou Payer plus tard chez le comptable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPayNow(true)}
              className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                payNow
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-500/5 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span className="text-left">Payer maintenant à la réinscription</span>
            </button>

            <button
              type="button"
              onClick={() => setPayNow(false)}
              className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                !payNow
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-500/5 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-left">Payer plus tard chez le comptable</span>
            </button>
          </div>

          {/* Sélection des frais applicables */}
          {selectedFeeLines.length >= 0 && feeLines.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                      Grille Tarifaire Définie pour :
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                      {targetClass.nom}
                    </span>
                  </div>
                  <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    Cochez les frais à régler simultanément (Inscription + Minerval + Frais annexes).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAllSelected(true)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-all cursor-pointer"
                  >
                    Tout Sélectionner
                  </button>
                  <button
                    type="button"
                    onClick={setOnlyMandatory}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                  >
                    Obligatoires Seuls
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {feeLines.map(ft => {
                  const isChecked = ft.selected;
                  const prio = getFeePriorityInfo(ft);
                  return (
                    <div
                      key={ft.id}
                      onClick={() => !ft.obligatoire && toggleFee(ft.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/30'
                          : 'bg-slate-500/5 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          disabled={ft.obligatoire}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">{ft.nom}</span>
                          <span className={`inline-block mt-0.5 text-[9px] font-black px-2 py-0.5 rounded-md border ${prio.badgeBg}`}>
                            {prio.code} • {prio.label.split(' - ')[1]?.trim() || prio.label}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black shrink-0 ml-2 text-emerald-700 dark:text-emerald-300">
                        {format(ft.montant, ft.devise)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {feeLines.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                  Aucun frais n'est défini pour cette classe/année.
                </div>
              )}
            </div>
          )}

          {/* Tableau de Saisie Séparée des Paiements par Type de Frais */}
          {payNow && allocatedFeeLines.length > 0 && (
            <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Saisie Séparée des Montants Encaissements par Frais</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const full: Record<string, number> = {};
                      allocatedFeeLines.forEach(l => { full[l.feeTypeId] = l.montant; });
                      setCustomFeePayments(prev => ({ ...prev, ...full }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                  >
                    Payer Tout en Intégralité
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p1Only: Record<string, number> = {};
                      allocatedFeeLines.forEach(l => {
                        p1Only[l.feeTypeId] = l.prioInfo.priority === 1 ? l.montant : 0;
                      });
                      setCustomFeePayments(prev => ({ ...prev, ...p1Only }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-all cursor-pointer"
                  >
                    Obligatoires Seuls (P1)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-black text-slate-400 uppercase" style={{ borderColor: 'var(--border)' }}>
                      <th className="py-2 px-2">Priorité</th>
                      <th className="py-2 px-2">Type de Frais</th>
                      <th className="py-2 px-2 text-right">Montant Dû</th>
                      <th className="py-2 px-2 text-right">Montant Payé Séparément</th>
                      <th className="py-2 px-2 text-right">Solde Restant</th>
                      <th className="py-2 px-2 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {allocatedFeeLines.map((ligne) => (
                      <tr key={ligne.id} className="font-medium text-xs">
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${ligne.prioInfo.badgeBg}`}>
                            {ligne.prioInfo.code}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-bold text-slate-800 dark:text-slate-200">
                          {ligne.nom}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                          {format(ligne.montant, ligne.devise)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <NumberInput
                              value={customFeePayments[ligne.feeTypeId] ?? 0}
                              onChange={v => setCustomFeePayments(prev => ({ ...prev, [ligne.feeTypeId]: Math.max(0, v) }))}
                              min={0}
                              max={ligne.montant}
                              integer
                              placeholder="0"
                              className="w-24 px-2 py-1 text-right text-xs font-mono font-black border rounded-lg"
                              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                            <button
                              type="button"
                              title="Payer la totalité de ce frais"
                              onClick={() => setCustomFeePayments(prev => ({ ...prev, [ligne.feeTypeId]: ligne.montant }))}
                              className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            >
                              Max
                            </button>
                            <button
                              type="button"
                              title="Effacer ce versement"
                              onClick={() => setCustomFeePayments(prev => ({ ...prev, [ligne.feeTypeId]: 0 }))}
                              className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            >
                              0
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {format(ligne.soldeRestant, ligne.devise)}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            ligne.isCovered
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : ligne.isPartial
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          }`}>
                            {ligne.isCovered ? 'SOLDÉ' : ligne.isPartial ? 'PARTIEL' : 'EN ATTENTE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mode de paiement & Référence + Récap Total */}
          {payNow && (
            <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>Mode de Règlement & Référence Transaction</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Mode de Règlement
                  </label>
                  <CustomSelect
                    options={MOYEN_PAIEMENT_OPTIONS}
                    value={paymentMode}
                    onChange={setPaymentMode}
                    placeholder="Choisir le mode"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    N° Bordereau / Référence Transaction
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="N° Bordereau / Mobile Money / Référence"
                    className="w-full px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="p-3 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Facturé</p>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {format(totalFacture, invoiceDevise)}
                  </p>
                </div>
                <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                  <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Encaissé Séparément</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {format(totalPaidCalculated, invoiceDevise)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl border ${totalSoldeRestant > 0.001 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                  <p className={`text-[10px] font-bold uppercase mb-1 ${totalSoldeRestant > 0.001 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    Solde Restant
                  </p>
                  <p className={`text-sm font-black ${totalSoldeRestant > 0.001 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {format(totalSoldeRestant, invoiceDevise)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!payNow && (
            <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
                <Clock className="w-4 h-4" />
                <span>Le règlement sera effectué ultérieurement auprès du comptable. Une facture non payée sera générée.</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Facturé</p>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{format(totalFacture, invoiceDevise)}</p>
                </div>
                <div className="p-3 rounded-xl border bg-rose-500/5 border-rose-500/20">
                  <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 mb-1">Statut</p>
                  <p className="text-sm font-black text-rose-700 dark:text-rose-300">NON PAYÉ</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10.5px] font-bold text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Échéance</span>
            <CustomDatePicker value={dueDate} onChange={setDueDate} placeholder="Échéance" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-6 animate-fade-in select-none" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {renderHeader()}

        {step === 'SEARCH' && renderSearch()}
        {step === 'ACADEMIC' && renderAcademic()}
        {step === 'FEES' && renderFees()}

        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={step === 'SEARCH' ? onBack : prevStep}
            className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {step === 'SEARCH' ? 'Annuler' : step === 'FEES' ? "Retour à l'Étape 2 (Scolarité)" : 'Précédent'}
          </button>

          {step !== 'FEES' ? (
            <button
              onClick={nextStep}
              disabled={!canGoNext()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>Suivant</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Traitement...' : 'Valider la Réinscription'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
