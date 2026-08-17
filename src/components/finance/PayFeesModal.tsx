import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CreditCard,
  Loader2,
  User,
  ReceiptText,
  Printer,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Wallet,
  RotateCcw,
  Delete,
  Calculator,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { getInvoicePaid, getInvoiceTotal, getInvoiceStatus, getStudentTotalDue, getPaymentAmount } from '../../utils/financeCalculations';
import { isFeeTypeApplicable } from '../../utils/feeFilters';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { ReceiptModal } from './ReceiptModal';
import { showToast } from '../common/ToastNotification';
import type {
  FactureEleve,
  TransactionPaiement,
  Eleve,
  ClasseScolaire,
  TypeFraisScolaire,
  AnneeScolaireConfig,
  LigneFacture,
  FraisTranche,
} from '../../types';

interface PayFeesModalProps {
  activeSchoolYear?: string;
  initialStudentId?: string;
  initialInvoiceId?: string;
  onClose: () => void;
  onSaved?: () => void;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: '💵 Espèces (Caisse locale)' },
  { value: 'BANK', label: '🏦 Virement bancaire / Dépôt guichet' },
  { value: 'FLEXPAY_MPESA', label: '📱 Vodacom M-Pesa (Mobile Money)' },
  { value: 'FLEXPAY_ORANGE', label: '📱 Orange Money (Mobile Money)' },
  { value: 'FLEXPAY_AIRTEL', label: '📱 Airtel Money (Mobile Money)' },
  { value: 'FLUTTERWAVE_CARTE', label: '💳 Carte Bancaire (Visa / Mastercard)' },
];

const CYCLES = [
  { value: 'MATERNELLE', label: 'Maternelle' },
  { value: 'PRIMAIRE', label: 'Primaire' },
  { value: 'SECONDAIRE_CTEB', label: 'Secondaire / CTEB' },
  { value: 'HUMANITES', label: 'Humanités' },
];

const CYCLE_LABELS: Record<string, string> = {
  MATERNELLE: 'Maternelle',
  PRIMAIRE: 'Primaire',
  SECONDAIRE_CTEB: 'Secondaire / CTEB',
  HUMANITES: 'Humanités',
};

// Helper strict d'arrondi monétaire à 2 décimales
const round2 = (val: number): number => {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
};

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const PayFeesModal: React.FC<PayFeesModalProps> = ({ activeSchoolYear, initialStudentId, initialInvoiceId, onClose, onSaved }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, src?: string) => formatCurrency(round2(n), currency, src || currency, exchangeRate);

  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Sélections élève
  const [studentSearch, setStudentSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [cycle, setCycle] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');

  // Frais choisis dans le panier
  const [chosenFeeItems, setChosenFeeItems] = useState<{ key: string; amount: number }[]>([]);
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);

  // Règlement
  const [method, setMethod] = useState<string>('CASH');
  const [reference, setReference] = useState('');
  const [caissier, setCaissier] = useState('Caissier');
  const [error, setError] = useState<string | null>(null);

  // Modal de Reçu Direct
  const [createdPayment, setCreatedPayment] = useState<TransactionPaiement | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<FactureEleve | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const initialHandledRef = useRef(false);
  const autoCartFilledRef = useRef(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fermer la liste des résultats si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Caissier session
  useEffect(() => {
    (window as any).electronAPI?.getCurrentSession?.().then((s: any) => {
      if (s?.nom) setCaissier(`${s.prenom || ''} ${s.nom}`.trim());
    }).catch(() => {});
  }, []);

  // Chargement des données
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [st, cl, y] = await Promise.all([
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSchoolYears(),
      ]);
      // Nettoyer les factures et les types de frais en double avant de charger
      // les données, pour éviter que le panier cumule le même frais plusieurs fois
      // (ex: "Tricot" défini à la fois pour une classe et pour toute l'école).
      try { await LocalDatabaseService.cleanupDuplicateInvoices(); } catch (e) { console.warn('[PayFeesModal] Cleanup init invoices:', e); }
      try { await LocalDatabaseService.cleanupDuplicateFeeTypes(); } catch (e) { console.warn('[PayFeesModal] Cleanup init fee types:', e); }
      const [ft, inv, pmt] = await Promise.all([
        LocalDatabaseService.getFeeTypes(),
        LocalDatabaseService.getInvoices(),
        LocalDatabaseService.getPayments(),
      ]);
      setStudents(st);
      setClasses(cl);
      setFeeTypes(ft);
      setYears(y);
      setInvoices(inv);
      setPayments(pmt);
      setLoading(false);
    };
    load();
  }, [activeSchoolYear]);

  const activeYear = useMemo(
    () => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear) || years.find(y => y.statut === 'EN_COURS') || years[0],
    [years, activeSchoolYear]
  );
  const yearId = activeYear?.id || '';

  // Options pour sélection progressive
  const cycleOptions = useMemo(() => [
    { value: '', label: 'Tous les cycles' },
    ...CYCLES.map(c => ({ value: c.value, label: c.label })),
  ], []);

  const classOptions = useMemo(() => {
    const list = Array.from(new Set(classes.filter(c => !cycle || c.cycleId === cycle).map(c => c.nom)));
    return [{ value: '', label: 'Toutes les classes' }, ...list.map(n => ({ value: n, label: n }))];
  }, [classes, cycle]);

  const roomOptions = useMemo(() => {
    const list = Array.from(new Set(classes.filter(c => c.nom === className).map(c => c.salle || '—')));
    return [{ value: '', label: 'Toutes les salles' }, ...list.map(r => ({ value: r, label: r }))];
  }, [classes, className]);

  const selectedClass = useMemo(() => classes.find(c => c.nom === className && (room ? c.salle === room : true)) || classes.find(c => c.nom === className), [classes, className, room]);

  const studentOptions = useMemo(() => {
    const list = students.filter(s => {
      if (!selectedClass) return true;
      return s.classId === selectedClass.id;
    });
    return [{ value: '', label: 'Sélectionner un élève...' }, ...list.map(s => ({ value: s.id, label: `${s.prenom} ${s.nom} · ${s.registrationNumber}` }))];
  }, [students, selectedClass]);

  const selectedStudent = useMemo(() => students.find(s => s.id === studentId), [students, studentId]);

  // Résultats de la recherche directe d'élève
  const matchingStudents = useMemo(() => {
    if (!studentSearch.trim() || studentSearch.length < 2) return [];
    const q = studentSearch.toLowerCase().trim();
    return students.filter(s => {
      const full = `${s.prenom} ${s.nom} ${s.postnom || ''} ${s.registrationNumber} ${s.nomClasse || ''}`.toLowerCase();
      return full.includes(q);
    }).slice(0, 8);
  }, [students, studentSearch]);

  // Auto-sélection lors du choix d'un élève dans la recherche rapide
  const handleSelectStudentDirect = (st: Eleve) => {
    setStudentId(st.id);
    setStudentSearch(`${st.prenom} ${st.nom} (${st.registrationNumber})`);
    setShowSearchResults(false);
    setChosenFeeItems([]);
    setActiveItemKey(null);
    setError(null);

    // Auto-déduction de la classe et du cycle
    const foundClass = classes.find(c => c.id === st.classId || c.nom === st.nomClasse);
    if (foundClass) {
      setClassName(foundClass.nom);
      if (foundClass.salle) setRoom(foundClass.salle);
      if (foundClass.cycleId) setCycle(foundClass.cycleId);
    }
  };

  // Auto-sélection de l'élève si passé en prop (ex: depuis la table des factures)
  useEffect(() => {
    if (!loading && students.length > 0 && !initialHandledRef.current) {
      let targetStudentId = initialStudentId;
      if (!targetStudentId && initialInvoiceId) {
        const inv = invoices.find(i => i.id === initialInvoiceId);
        if (inv) targetStudentId = inv.eleveId;
      }
      if (targetStudentId) {
        const st = students.find(s => s.id === targetStudentId);
        if (st) {
          handleSelectStudentDirect(st);
          initialHandledRef.current = true;
        }
      }
    }
  }, [loading, students, initialStudentId, initialInvoiceId, invoices, classes]);

  const feeApplies = (ft: TypeFraisScolaire, cls?: ClasseScolaire) => {
    const option = cls?.optionCode || selectedStudent?.optionEPST || 'TRONC_COMMUN';
    return isFeeTypeApplicable(ft, {
      schoolYearId: yearId,
      classId: cls?.id || selectedStudent?.classId,
      className: cls?.nom || selectedStudent?.nomClasse,
      cycleId: cls?.cycleId || cycle,
      option,
      salleId: selectedStudent?.salleId || undefined,
      regime: selectedStudent?.regime,
    }, CYCLE_LABELS);
  };

  const getTranches = (ft: TypeFraisScolaire): FraisTranche[] => {
    if (ft.modePaiement && ft.modePaiement !== 'UNIQUE' && ft.tranches && ft.tranches.length > 0) {
      return ft.tranches;
    }
    return [{ id: ft.id, nom: 'Paiement unique', montant: ft.montant, devise: ft.devise, ordre: 1 }];
  };

  // Détermine le solde réel d'une ligne de facture dans la devise d'affichage.
  // Privilégie les allocations de paiement, sinon répartit le montant payé stocké
  // sur la facture (montantPaye) proportionnellement aux lignes.
  const lineBalance = (inv: FactureEleve, l: LigneFacture) => {
    const invPayments = payments.filter(p => p.invoiceId === inv.id);
    const lineTotal = round2(convertCurrency(l.montant, l.devise || inv.devise, currency, exchangeRate));

    // Paiement exact par allocations
    const fromAllocations = invPayments.reduce((sum, p) => {
      const alloc = p.allocations?.find(a =>
        a.feeTypeId === l.feeTypeId &&
        (l.trancheId ? a.trancheId === l.trancheId : !a.trancheId)
      );
      if (alloc) return sum + convertCurrency(alloc.montant, p.devise, currency, exchangeRate);
      return sum;
    }, 0);

    if (fromAllocations > 0.001) {
      return { expected: lineTotal, paid: round2(fromAllocations), remaining: round2(Math.max(0, lineTotal - fromAllocations)) };
    }

    // Fallback proportionnel basé sur le montant payé stocké sur la facture
    const invTotal = round2(
      (inv.lignes?.length ? inv.lignes : [])
        .reduce((sum, line) => sum + round2(convertCurrency(line.montant, line.devise || inv.devise, currency, exchangeRate)), 0)
    ) || round2(convertCurrency(inv.montantTotal, inv.devise, currency, exchangeRate));
    const invPaid = round2(convertCurrency(inv.montantPaye, inv.devise, currency, exchangeRate));
    let paid = 0;
    if (invTotal > 0.001 && invPaid > 0.001) {
      paid = (invPaid * lineTotal) / invTotal;
    }
    const remaining = round2(Math.max(0, lineTotal - paid));
    return { expected: lineTotal, paid: round2(paid), remaining };
  };

  const trancheBalance = (ft: TypeFraisScolaire, tranche: FraisTranche) => {
    const expected = round2(convertCurrency(tranche.montant, tranche.devise, currency, exchangeRate));
    let paid = 0;
    const studentInvoices = invoices.filter(inv =>
      (inv.eleveId === studentId || inv.studentId === studentId || inv.studentId === selectedStudent?.registrationNumber) &&
      (inv.anneeScolaireId === yearId || inv.anneeScolaire === activeYear?.nom || inv.schoolYearId === yearId)
    );
    for (const inv of studentInvoices) {
      for (const l of inv.lignes || []) {
        if (l.feeTypeId !== ft.id) continue;
        if (tranche.id !== ft.id && l.trancheId && l.trancheId !== tranche.id) continue;
        const bal = lineBalance(inv, l);
        paid += bal.paid;
      }
    }
    paid = round2(paid);
    const remainingRaw = round2(Math.max(0, expected - paid));
    const remaining = remainingRaw <= 0.10 ? 0 : remainingRaw;
    return { expected, paid, remaining };
  };

  // Liste de tous les frais impayés pour l'élève, calculée d'abord sur les
  // lignes de facture réelles, puis complétée par les frais applicables non facturés.
  // Cela évite les "solde résiduel" fantômes et lie les montants aux vrais frais.
  const unpaidTranches = useMemo(() => {
    if (!selectedStudent) return [];
    const cls = selectedClass || classes.find(c => c.id === selectedStudent.classId);
    const list: {
      fee: TypeFraisScolaire;
      tranche: FraisTranche;
      key: string;
      label: string;
      invoiceId?: string;
      ligneId?: string;
      balance: { expected: number; paid: number; remaining: number };
    }[] = [];
    const existingKeys = new Set<string>();

    const studentInvoices = invoices.filter(inv =>
      (inv.eleveId === studentId || inv.studentId === studentId || inv.studentId === selectedStudent?.registrationNumber) &&
      (inv.anneeScolaireId === yearId || inv.anneeScolaire === activeYear?.nom || inv.schoolYearId === yearId)
    );

    // 1. Lignes de facture impayées réelles (source de vérité prioritaire)
    for (const inv of studentInvoices) {
      for (const l of inv.lignes || []) {
        const bal = lineBalance(inv, l);
        if (bal.remaining <= 0.001) continue;
        const fee = feeTypes.find(ft => ft.id === l.feeTypeId);
        const trancheId = l.trancheId || l.feeTypeId;
        const key = trancheId === l.feeTypeId ? l.feeTypeId : `${l.feeTypeId}#${trancheId}`;

        if (existingKeys.has(key)) {
          const existing = list.find(i => i.key === key)!;
          existing.balance.remaining = round2(existing.balance.remaining + bal.remaining);
          // Ne pas additionner le montant du tranche : on garde le montant de référence (le plus grand).
          const newMontant = Math.max(existing.tranche.montant, l.montant);
          existing.tranche = { ...existing.tranche, montant: newMontant };
          existing.balance.expected = round2(convertCurrency(existing.tranche.montant, existing.tranche.devise, currency, exchangeRate));
          existing.balance.paid = round2(Math.max(0, existing.balance.expected - existing.balance.remaining));
          continue;
        }

        const matchedTranche = fee?.tranches?.find(t => t.id === l.trancheId);
        const tranche: FraisTranche = matchedTranche
          ? { ...matchedTranche }
          : {
              id: trancheId,
              nom: (l.nom && l.nom.includes(' — ') ? l.nom.split(' — ').pop()! : 'Paiement unique') as string,
              montant: l.montant,
              devise: l.devise || inv.devise,
              ordre: 1,
            };
        // Si on a trouvé une tranche mais qu'elle est utilisée avec un montant de ligne différent,
        // on crée un tranche "instance" pour conserver le montant réel de la facture.
        if (matchedTranche && l.montant !== matchedTranche.montant) {
          tranche.montant = l.montant;
        }
        const feeSynthetic: TypeFraisScolaire = fee || {
          id: l.feeTypeId,
          code: l.categorie || 'AUTRE',
          nom: l.nom,
          categorie: (l.categorie || 'AUTRE') as any,
          montant: l.montant,
          devise: l.devise || inv.devise,
          obligatoire: false,
          actif: true,
        };
        const label = tranche.nom === 'Paiement unique' ? feeSynthetic.nom : `${feeSynthetic.nom} — ${tranche.nom}`;
        existingKeys.add(key);
        list.push({ fee: feeSynthetic, tranche, key, label, invoiceId: inv.id, ligneId: l.id, balance: bal });
      }
    }

    // 2. Frais applicables n'apparaissant pas encore dans une facture.
    // On ne les ajoute automatiquement que s'ils sont OBLIGATOIRES : un frais
    // optionnel (uniforme, transport, cantine, etc.) ne doit pas être présumé dû
    // tant que l'élève n'a jamais été facturé pour ce frais (évite les fausses
    // dettes quand un frais est configuré pour toute l'école mais optionnel).
    for (const ft of feeTypes.filter(f => f.obligatoire && feeApplies(f, cls))) {
      for (const t of getTranches(ft)) {
        const key = t.id === ft.id ? ft.id : `${ft.id}#${t.id}`;
        if (existingKeys.has(key)) continue;
        const balance = trancheBalance(ft, t);
        if (balance.remaining > 0.001) {
          const label = t.nom === 'Paiement unique' ? ft.nom : `${ft.nom} — ${t.nom}`;
          existingKeys.add(key);
          list.push({ fee: ft, tranche: t, key, label, balance });
        }
      }
    }

    // 3. Dédoublonnage par nom de frais + tranche (merge les doublons de même nom).
    // Le nom est normalisé pour ignorer les suffixes de portée/ciblage
    // (ex: "Tricot" et "Tricot — Toute l'école" doivent fusionner).
    const normalizeFeeName = (nom: string) =>
      nom
        .toLowerCase()
        .replace(/\s*[—-]\s*toute\s+l.?[ée]cole.*$/i, '')
        .replace(/\s*\(tronc commun\)\s*/gi, '')
        .trim();
    const dedup = new Map<string, typeof list[0]>();
    for (const item of list) {
      const feeName = normalizeFeeName(item.fee.nom || item.label);
      const trancheName = (item.tranche.nom || '').toLowerCase().trim();
      const dedupKey = trancheName === 'paiement unique' ? feeName : `${feeName}|||${trancheName}`;
      const existing = dedup.get(dedupKey);
      if (existing) {
        existing.balance.remaining = round2(existing.balance.remaining + item.balance.remaining);
        // On garde le montant de référence le plus grand, on ne les additionne pas
        const newMontant = Math.max(existing.tranche.montant, item.tranche.montant);
        existing.tranche = { ...existing.tranche, montant: newMontant };
        existing.balance.expected = round2(convertCurrency(existing.tranche.montant, existing.tranche.devise, currency, exchangeRate));
        existing.balance.paid = round2(Math.max(0, existing.balance.expected - existing.balance.remaining));
        if (item.invoiceId && !existing.invoiceId) {
          existing.invoiceId = item.invoiceId;
          existing.ligneId = item.ligneId;
        }
      } else {
        dedup.set(dedupKey, { ...item });
      }
    }

    // 4. S'assurer qu'aucun solde résiduel ne reste invisible
    const result = Array.from(dedup.values());
    const totalFromItems = result.reduce((acc, t) => acc + t.balance.remaining, 0);
    const globalDue = getStudentTotalDue(studentInvoices, currency);
    let globalPaid = payments
      .filter(p => p.eleveId === studentId || p.studentId === studentId || p.studentId === selectedStudent?.registrationNumber)
      .reduce((sum, p) => sum + getPaymentAmount(p, currency), 0);
    const paidFromInvoices = studentInvoices.reduce(
      (sum, inv) => sum + round2(convertCurrency(inv.montantPaye, inv.devise, currency, exchangeRate)),
      0
    );
    if (globalPaid < paidFromInvoices - 0.01) {
      globalPaid = paidFromInvoices;
    }
    const actualUnpaid = Math.max(0, round2(globalDue - globalPaid));
    if (actualUnpaid > totalFromItems + 0.10) {
      result.push({
        fee: {
          id: 'solde-residuel',
          code: 'RESIDUEL',
          nom: 'Solde résiduel',
          categorie: 'FRAIS_CONNEXES',
          montant: actualUnpaid - totalFromItems,
          devise: currency,
          obligatoire: false,
          actif: true,
        } as TypeFraisScolaire,
        tranche: {
          id: 'solde-residuel',
          nom: 'Paiement unique',
          montant: actualUnpaid - totalFromItems,
          devise: currency,
          ordre: 999,
        },
        key: 'solde-residuel',
        label: 'Solde résiduel',
        ligneId: 'synthetic',
        balance: { expected: actualUnpaid - totalFromItems, paid: 0, remaining: actualUnpaid - totalFromItems },
      });
    }

    return result.sort((a, b) =>
      ((a.fee.priorite as any) || 0) - ((b.fee.priorite as any) || 0) ||
      (a.tranche.ordre || 0) - (b.tranche.ordre || 0)
    );
  }, [feeTypes, selectedClass, selectedStudent, yearId, invoices, payments, currency, exchangeRate, studentId, classes, activeYear]);

  // Solde impayé réel de l'élève : dérivé de la même liste dédoublonnée que le
  // panier (unpaidTranches), afin que le total affiché en en-tête et la somme
  // des frais du panier ne divergent jamais.
  const globalUnpaid = useMemo(() => {
    return round2(unpaidTranches.reduce((sum, t) => sum + t.balance.remaining, 0));
  }, [unpaidTranches]);

  // Recharger factures/paiements quand l'élève change pour éviter les données vides/stalées
  useEffect(() => {
    if (!studentId) return;
    const reload = async () => {
      try { await LocalDatabaseService.cleanupDuplicateInvoices(); } catch (e) { console.warn('[PayFeesModal] Cleanup reload:', e); }
      const [inv, pmt] = await Promise.all([
        LocalDatabaseService.getInvoices(),
        LocalDatabaseService.getPayments(),
      ]);
      setInvoices(inv);
      setPayments(pmt);
    };
    reload();
  }, [studentId]);
  useEffect(() => {
    if (studentId && unpaidTranches.length > 0 && !autoCartFilledRef.current && (initialStudentId || initialInvoiceId)) {
      const items = unpaidTranches.map(t => ({
        key: t.key,
        amount: round2(t.balance.remaining),
      }));
      setChosenFeeItems(items);
      if (items.length > 0) setActiveItemKey(items[0].key);
      autoCartFilledRef.current = true;
    }
  }, [studentId, unpaidTranches, initialStudentId, initialInvoiceId]);

  // Options du sélecteur "Ajouter un frais"
  const availableFeeOptions = useMemo(() => {
    const alreadyChosenKeys = new Set(chosenFeeItems.map(i => i.key));
    const unchosen = unpaidTranches.filter(t => !alreadyChosenKeys.has(t.key));
    return [
      { value: '', label: unchosen.length > 0 ? 'Choisir un frais à encaisser...' : 'Tous les frais sont dans le panier' },
      ...unchosen.map(t => ({
        value: t.key,
        label: `${t.label} (Solde dû : ${fmt(t.balance.remaining)})`,
      })),
    ];
  }, [unpaidTranches, chosenFeeItems, currency, exchangeRate]);

  // AJOUT AUTOMATIQUE DÈS SÉLECTION DANS LE MENU
  const handleAutoAddFee = (key: string) => {
    if (!key) return;
    const target = unpaidTranches.find(t => t.key === key);
    if (!target) return;
    if (chosenFeeItems.some(i => i.key === key)) return;

    const newAmount = round2(target.balance.remaining);
    setChosenFeeItems(prev => [...prev, { key, amount: newAmount }]);
    setActiveItemKey(key);
    setError(null);
  };

  // Supprimer un frais du panier
  const handleRemoveFeeItem = (key: string) => {
    setChosenFeeItems(prev => prev.filter(i => i.key !== key));
    if (activeItemKey === key) {
      const remaining = chosenFeeItems.filter(i => i.key !== key);
      setActiveItemKey(remaining.length > 0 ? remaining[0].key : null);
    }
  };

  // Mettre à jour le montant d'un frais dans le panier (Strictement 2 décimales)
  const handleSetAmount = (key: string, val: number) => {
    const target = unpaidTranches.find(t => t.key === key);
    const max = target ? round2(target.balance.remaining) : 0;
    const clamped = round2(Math.max(0, Math.min(val, max)));
    setChosenFeeItems(prev => prev.map(i => i.key === key ? { ...i, amount: clamped } : i));
  };

  // Ajouter tous les frais en 1 clic
  const handleAddAllFees = () => {
    const all = unpaidTranches.map(t => ({
      key: t.key,
      amount: round2(t.balance.remaining),
    }));
    setChosenFeeItems(all);
    if (all.length > 0) setActiveItemKey(all[0].key);
  };

  // FRAIS ACTIF POUR LE PAVÉ NUMÉRIQUE TACTILE (POS PINPAD)
  const currentActiveKey = activeItemKey || (chosenFeeItems.length > 0 ? chosenFeeItems[chosenFeeItems.length - 1].key : null);
  const currentActiveItem = chosenFeeItems.find(i => i.key === currentActiveKey);
  const currentActiveTranche = unpaidTranches.find(t => t.key === currentActiveKey);

  // GESTION DU PAVÉ TACTILE (PINPAD POS) SANS DÉBORDEMENT DÉCIMAL
  const handlePinpadDigit = (digit: string) => {
    if (!currentActiveKey || !currentActiveTranche) return;
    const curVal = currentActiveItem ? round2(currentActiveItem.amount) : 0;
    let str = curVal === 0 ? '' : curVal.toString();

    if (digit === 'C') {
      handleSetAmount(currentActiveKey, 0);
      return;
    }
    if (digit === 'BACKSPACE') {
      str = str.slice(0, -1);
      const val = str === '' || str === '.' ? 0 : parseFloat(str);
      handleSetAmount(currentActiveKey, round2(val));
      return;
    }
    if (digit === '.') {
      if (!str.includes('.')) {
        str = (str || '0') + '.';
      }
    } else if (digit === '00') {
      if (str && !str.includes('.')) {
        str += '00';
      }
    } else {
      if (str.includes('.')) {
        const parts = str.split('.');
        if (parts[1] && parts[1].length >= 2) {
          // Limiter strictement à 2 chiffres après la virgule
          return;
        }
      }
      str = str === '0' ? digit : str + digit;
    }

    const parsed = parseFloat(str) || 0;
    handleSetAmount(currentActiveKey, round2(parsed));
  };

  const handleQuickAdd = (addition: number) => {
    if (!currentActiveKey || !currentActiveTranche) return;
    const cur = currentActiveItem ? round2(currentActiveItem.amount) : 0;
    handleSetAmount(currentActiveKey, round2(cur + addition));
  };

  const handleQuickMax = () => {
    if (!currentActiveKey || !currentActiveTranche) return;
    handleSetAmount(currentActiveKey, round2(currentActiveTranche.balance.remaining));
  };

  // Total à encaisser (Strictement arrondi)
  const totalToPay = useMemo(() => {
    return round2(chosenFeeItems.reduce((sum, item) => sum + (item.amount || 0), 0));
  }, [chosenFeeItems]);

  // Validation de l'encaissement
  const handleSubmit = async () => {
    if (!selectedStudent) {
      setError('Veuillez sélectionner un élève valide.');
      return;
    }
    const validItems = chosenFeeItems.filter(item => item.amount > 0.001);
    if (validItems.length === 0) {
      setError('Veuillez ajouter au moins un frais scolaire et saisir un montant à encaisser.');
      return;
    }

    const cls = selectedClass || classes.find(c => c.id === selectedStudent.classId) || { nom: selectedStudent.nomClasse || 'Classe' };
    setError(null);
    setSubmitting(true);

    try {
      // Groupement par devise pour les items choisis (une nouvelle facture par encaissement)
      const groups: Record<string, { items: typeof validItems; invoiceId?: string }> = {};
      for (const item of validItems) {
        const u = unpaidTranches.find(u => u.key === item.key)!;
        const groupKey = u.fee.devise || currency || '__new__';
        if (!groups[groupKey]) groups[groupKey] = { items: [], invoiceId: undefined };
        groups[groupKey].items.push(item);
      }

      const createdPayments: TransactionPaiement[] = [];
      const createdInvoices: FactureEleve[] = [];

      for (const group of Object.values(groups)) {
        const invoiceDevise = group.items[0] ? unpaidTranches.find(u => u.key === group.items[0].key)?.fee.devise || currency : currency;

        const allocations: { feeTypeId: string; trancheId?: string; montant: number }[] = [];
        const newLines: LigneFacture[] = [];

        for (const item of group.items) {
          const u = unpaidTranches.find(u => u.key === item.key)!;
          const amountInInvoiceDevise = round2(convertCurrency(item.amount, currency, invoiceDevise, exchangeRate));
          allocations.push({
            feeTypeId: u.ligneId === 'synthetic' ? '' : u.fee.id,
            trancheId: u.ligneId === 'synthetic' ? undefined : (u.tranche.id !== u.fee.id ? u.tranche.id : undefined),
            montant: amountInInvoiceDevise,
          });

          if (u.ligneId === 'synthetic') {
            const lineMontant = round2(convertCurrency(item.amount, currency, invoiceDevise, exchangeRate));
            newLines.push({
              id: uuid(),
              invoiceId: '',
              feeTypeId: '',
              nom: u.fee.nom || 'Règlement solde',
              categorie: 'FRAIS_CONNEXES',
              montant: lineMontant,
              devise: invoiceDevise,
            });
          } else if (u.ligneId !== 'synthetic') {
            const lineMontant = round2(convertCurrency(u.tranche.montant, u.tranche.devise || u.fee.devise, invoiceDevise, exchangeRate));
            newLines.push({
              id: uuid(),
              invoiceId: '',
              feeTypeId: u.fee.id,
              trancheId: u.tranche.id !== u.fee.id ? u.tranche.id : undefined,
              nom: u.tranche.nom === 'Paiement unique' ? u.fee.nom : `${u.fee.nom} — ${u.tranche.nom}`,
              categorie: u.fee.categorie,
              montant: lineMontant,
              devise: invoiceDevise,
            });
          }
        }

        const totalLignes = round2(newLines.reduce((a, l) => a + l.montant, 0));
        const invoice: FactureEleve = {
          id: uuid(),
          anneeScolaireId: yearId,
          anneeScolaire: activeYear?.nom,
          numeroFacture: `F-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eleveId: selectedStudent.id,
          studentId: selectedStudent.registrationNumber,
          nomEleve: `${selectedStudent.prenom || ''} ${selectedStudent.nom}`.trim(),
          nomClasse: cls.nom,
          montantTotal: totalLignes,
          montantPaye: 0,
          devise: invoiceDevise,
          statut: 'NON_PAYE',
          dateEcheance: new Date().toISOString().split('T')[0],
          lignes: newLines,
        };
        newLines.forEach(l => { l.invoiceId = invoice.id; });

        const savedInvoice = await LocalDatabaseService.addInvoice(invoice);
        const invId = savedInvoice?.id || invoice.id;
        const targetInvoice = savedInvoice || invoice;

        const paymentMontantPaye = round2(allocations.reduce((a, alloc) => a + alloc.montant, 0));
        const payment: TransactionPaiement = {
          id: uuid(),
          anneeScolaireId: yearId,
          invoiceId: invId,
          eleveId: selectedStudent.id,
          studentId: selectedStudent.registrationNumber,
          nomEleve: `${selectedStudent.prenom || ''} ${selectedStudent.nom}`.trim(),
          registrationNumber: selectedStudent.registrationNumber,
          montantPaye: paymentMontantPaye,
          devise: invoiceDevise,
          moyenPaiement: method as any,
          reference,
          numeroRecu: `R-${Date.now()}`,
          dateCreation: new Date().toISOString(),
          nomCaissier: caissier,
          jetonQrCode: `qr-${selectedStudent.registrationNumber}-${Date.now()}`,
          allocations,
        };

        await LocalDatabaseService.addPayment(payment);
        createdPayments.push(payment);
        createdInvoices.push(targetInvoice);
      }

      // Nettoyer les factures en double créées par ce nouvel encaissement
      // et recharger les données pour que le panier ne double pas les montants.
      try { await LocalDatabaseService.cleanupDuplicateInvoices(); } catch (e) { console.warn('[PayFeesModal] Cleanup submit:', e); }
      const [inv, pmt] = await Promise.all([
        LocalDatabaseService.getInvoices(),
        LocalDatabaseService.getPayments(),
      ]);
      setInvoices(inv);
      setPayments(pmt);
      setChosenFeeItems([]);
      setActiveItemKey(null);

      setSubmitting(false);

      const lastPayment = createdPayments[createdPayments.length - 1];
      const lastInvoice = createdInvoices[createdInvoices.length - 1];

      showToast('Encaissement réussi !', `${createdPayments.length} reçu(s) enregistré(s) pour ${selectedStudent.prenom} ${selectedStudent.nom}.`, 'success');

      setCreatedInvoice(lastInvoice);
      setCreatedPayment(lastPayment);
      setShowReceiptModal(true);
    } catch (err: any) {
      console.error('[PayFeesModal] Erreur encaissement :', err);
      setError(err?.message || 'Une erreur est survenue lors de l\'encaissement.');
      setSubmitting(false);
    }
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    onSaved?.();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in select-none overflow-y-auto">
      <div
        className="w-full max-w-6xl rounded-3xl border shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-scale-in relative my-auto"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--elevation-3)',
        }}
      >
        {/* ═══ EN-TÊTE POS MODERNE AVEC PADDING CONFORTABLE ═══ */}
        <div
          className="px-7 py-5 border-b flex items-center justify-between shrink-0"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-sunken)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shadow-xs shrink-0">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug" style={{ color: 'var(--text-primary)' }}>
                  Guichet d'Encaissement & POS Caisse
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  Direct Checkout
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Sélectionnez l'élève, ajustez les frais au pavé tactile et validez le reçu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-500/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ═══ CORPS EN 2 COLONNES (PANIER CHECKOUT + PAVÉ NUMÉRIQUE TACTILE) ═══ */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {loading ? (
            <div className="flex-1 py-28 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-bold text-slate-400">Initialisation du terminal de caisse...</p>
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════
                  COLONNE GAUCHE (60%) : RECHERCHE, ÉLÈVE & PANIER DE FRAIS
                 ═══════════════════════════════════════════════════════ */}
              <div className="flex-1 p-6 sm:p-7 space-y-6 overflow-y-auto sidebar-scroll border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border)' }}>
                {/* ── SECTION 1 : RECHERCHE & SÉLECTION ÉLÈVE ── */}
                <div
                  className="p-6 rounded-3xl border space-y-5 shadow-xs"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      1. Identification de l'Élève
                    </span>
                    {selectedStudent && (
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Élève Vérifié
                      </span>
                    )}
                  </div>

                  {/* BARRE DE RECHERCHE RAPIDE AUTO-COMPLÉTIVE */}
                  <div className="relative" ref={searchBoxRef}>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={e => {
                          setStudentSearch(e.target.value);
                          setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="Recherche rapide d'élève par nom, prénom ou matricule national..."
                        className="w-full h-11 pl-11 pr-4 rounded-xl border text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-indigo-500/30"
                        style={{
                          background: 'var(--bg-surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      {studentSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setStudentSearch('');
                            setStudentId('');
                            setChosenFeeItems([]);
                            setActiveItemKey(null);
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown des résultats de recherche */}
                    {showSearchResults && matchingStudents.length > 0 && (
                      <div
                        className="absolute left-0 right-0 top-full mt-2 rounded-2xl border shadow-2xl z-30 p-2 space-y-1 max-h-56 overflow-y-auto sidebar-scroll"
                        style={{
                          background: 'var(--bg-surface)',
                          borderColor: 'var(--border)',
                          boxShadow: 'var(--elevation-3)',
                        }}
                      >
                        {matchingStudents.map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleSelectStudentDirect(st)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs flex items-center justify-between hover:bg-indigo-500/10 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                                {st.prenom[0]}{st.nom[0]}
                              </div>
                              <div>
                                <p className="font-black group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                                  {st.prenom} {st.nom} {st.postnom || ''}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Matricule : {st.registrationNumber} · {st.nomClasse || 'Classe'}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SÉLECTEURS EN GRILLE 2x2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Cycle
                      </label>
                      <CustomSelect
                        options={cycleOptions}
                        value={cycle}
                        onChange={v => { setCycle(v); setClassName(''); setRoom(''); setStudentId(''); setChosenFeeItems([]); setActiveItemKey(null); }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Classe
                      </label>
                      <CustomSelect
                        options={classOptions}
                        value={className}
                        onChange={v => { setClassName(v); setRoom(''); setStudentId(''); setChosenFeeItems([]); setActiveItemKey(null); }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Salle
                      </label>
                      <CustomSelect
                        options={roomOptions}
                        value={room}
                        onChange={v => { setRoom(v); setStudentId(''); setChosenFeeItems([]); setActiveItemKey(null); }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Élève
                      </label>
                      <CustomSelect
                        options={studentOptions}
                        value={studentId}
                        onChange={v => {
                          setStudentId(v);
                          setChosenFeeItems([]);
                          setActiveItemKey(null);
                          const st = students.find(s => s.id === v);
                          if (st) setStudentSearch(`${st.prenom} ${st.nom} (${st.registrationNumber})`);
                        }}
                        searchable
                      />
                    </div>
                  </div>

                  {/* CARTE PROFIL ÉLÈVE SÉLECTIONNÉ */}
                  {selectedStudent && (
                    <div
                      className="p-4.5 rounded-2xl border flex items-center justify-between gap-4 animate-fade-in shadow-xs"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                          {selectedStudent.prenom[0]}{selectedStudent.nom[0]}
                        </div>
                        <div>
                          <h4 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                            {selectedStudent.prenom} {selectedStudent.nom} {selectedStudent.postnom || ''}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 flex-wrap mt-0.5">
                            <span>Matricule : <strong className="font-mono text-indigo-500">{selectedStudent.registrationNumber}</strong></span>
                            <span>·</span>
                            <span>Classe : <strong>{selectedClass?.nom || selectedStudent.nomClasse || '—'}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Solde Impayé Global</span>
                        <span className="text-base font-black text-rose-500 font-mono">
                          {fmt(globalUnpaid)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SECTION 2 : COMPOSITION DU PANIER D'ENCAISSEMENT ── */}
                {selectedStudent && (
                  <div
                    className="p-6 rounded-3xl border space-y-4 shadow-xs animate-fade-in"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          2. Frais à Encaisser (Panier)
                        </span>
                        <p className="text-[11px] font-medium text-slate-400 mt-1">
                          Cliquez sur une ligne pour l'ajuster via le pavé tactile
                        </p>
                      </div>
                      {unpaidTranches.length > 0 && chosenFeeItems.length < unpaidTranches.length && (
                        <button
                          type="button"
                          onClick={handleAddAllFees}
                          className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tout ajouter ({unpaidTranches.length})
                        </button>
                      )}
                    </div>

                    {/* AJOUT AUTOMATIQUE DÈS SÉLECTION */}
                    <div className="pt-1">
                      <CustomSelect
                        options={availableFeeOptions}
                        value=""
                        onChange={handleAutoAddFee}
                      />
                    </div>

                    {/* LIGNES DE FRAIS DU PANIER */}
                    <div className="space-y-3 pt-2">
                      {chosenFeeItems.map(item => {
                        const t = unpaidTranches.find(u => u.key === item.key);
                        if (!t) return null;
                        const remainingMax = round2(t.balance.remaining);
                        const isActive = currentActiveKey === item.key;
                        const safeAmount = round2(item.amount);

                        return (
                          <div
                            key={item.key}
                            onClick={() => setActiveItemKey(item.key)}
                            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all cursor-pointer ${
                              isActive
                                ? 'border-emerald-500/80 bg-emerald-500/10 shadow-sm ring-2 ring-emerald-500/25'
                                : 'hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                            style={{
                              background: isActive ? undefined : 'var(--bg-sunken)',
                              borderColor: isActive ? undefined : 'var(--border)',
                            }}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-emerald-500 text-white shadow-xs' : 'bg-indigo-500/10 text-indigo-600'}`}>
                                <ReceiptText className="w-4.5 h-4.5" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-black text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                                  {t.label}
                                </h5>
                                <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-400 flex-wrap mt-0.5">
                                  <span>Total : <strong>{fmt(t.balance.expected)}</strong></span>
                                  <span>·</span>
                                  <span>Reste : <strong className="text-rose-500 font-mono">{fmt(remainingMax)}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <NumberInput
                                  value={safeAmount}
                                  onChange={v => handleSetAmount(item.key, v)}
                                  min={0}
                                  max={remainingMax}
                                  step={0.01}
                                  className="w-32 py-2 px-3 text-sm sm:text-base font-black font-mono text-right rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs focus:ring-2 focus:ring-emerald-500/30"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSetAmount(item.key, remainingMax)}
                                  className="h-10 px-3.5 rounded-xl text-xs font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/25 transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-95"
                                  title="Régler la totalité"
                                >
                                  Max
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFeeItem(item.key)}
                                className="h-10 w-10 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                                title="Retirer ce frais"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {chosenFeeItems.length === 0 && (
                        <div
                          className="py-9 px-4 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2.5"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <Layers className="w-7 h-7 text-slate-400" />
                          <p className="text-xs font-bold text-slate-400">
                            Aucun frais ajouté. Choisissez un type de frais ci-dessus pour l'ajouter au panier.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── SECTION 3 : MODE DE PAIEMENT EN DROPDOWN ÉLÉGANT ── */}
                {selectedStudent && chosenFeeItems.length > 0 && (
                  <div
                    className="p-6 rounded-3xl border space-y-4 shadow-xs animate-fade-in"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-indigo-500" />
                      3. Mode de Règlement
                    </span>

                    {/* LISTE DÉROULANTE DES MODES DE PAIEMENT */}
                    <div>
                      <CustomSelect
                        options={PAYMENT_METHOD_OPTIONS}
                        value={method}
                        onChange={v => setMethod(v)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                          N° Référence / Bordereau
                        </label>
                        <input
                          type="text"
                          value={reference}
                          onChange={e => setReference(e.target.value)}
                          placeholder="Ex: TX-902148, Bordereau..."
                          className="w-full h-11 px-4 rounded-xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                          Caissier
                        </label>
                        <input
                          type="text"
                          value={caissier}
                          onChange={e => setCaissier(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* MESSAGE D'ERREUR */}
                {error && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2.5 animate-shake">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════
                  COLONNE DROITE (40%) : PAVÉ NUMÉRIQUE TACTILE & CHECKOUT TOTAL
                 ═══════════════════════════════════════════════════════ */}
              <div
                className="w-full lg:w-[400px] p-6 sm:p-7 flex flex-col justify-between shrink-0 space-y-5"
                style={{ background: 'var(--bg-sunken)' }}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-500" />
                      Terminal de Saisie Tactile
                    </span>
                    {currentActiveTranche && (
                      <span className="text-[10.5px] font-black px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                        {currentActiveTranche.fee.categorie || 'Frais'}
                      </span>
                    )}
                  </div>

                  {/* ÉCRAN D'AFFICHAGE DU MONTANT ACTIF */}
                  <div
                    className="p-5 rounded-3xl border shadow-inner text-right relative overflow-hidden"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                  >
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      {currentActiveTranche ? currentActiveTranche.label : 'Montant à Encaisser'}
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight my-2">
                      {fmt(currentActiveItem ? round2(currentActiveItem.amount) : totalToPay)}
                    </div>
                    {currentActiveTranche && (
                      <span className="text-[11px] font-bold text-slate-400 block mt-1">
                        Reste dû max : <strong className="text-rose-500 font-mono">{fmt(currentActiveTranche.balance.remaining)}</strong>
                      </span>
                    )}
                  </div>

                  {/* RACCOURCIS DE MONTANTS RAPIDES */}
                  <div className="grid grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={handleQuickMax}
                      disabled={!currentActiveTranche}
                      className="h-11 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center justify-center"
                    >
                      Max
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(10)}
                      disabled={!currentActiveTranche}
                      className="h-11 rounded-xl text-xs font-black border hover:bg-slate-500/10 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center justify-center"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(50)}
                      disabled={!currentActiveTranche}
                      className="h-11 rounded-xl text-xs font-black border hover:bg-slate-500/10 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center justify-center"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      +50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(100)}
                      disabled={!currentActiveTranche}
                      className="h-11 rounded-xl text-xs font-black border hover:bg-slate-500/10 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center justify-center"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      +100
                    </button>
                  </div>

                  {/* PAVÉ NUMÉRIQUE TACTILE (POS PINPAD 4x3) HARMONIEUX ET DESIGN */}
                  <div className="grid grid-cols-3 gap-3">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(digit => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handlePinpadDigit(digit)}
                        disabled={!currentActiveTranche}
                        className="h-14 sm:h-16 rounded-2xl text-xl sm:text-2xl font-bold font-mono border hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handlePinpadDigit('C')}
                      disabled={!currentActiveTranche}
                      className="h-14 sm:h-16 rounded-2xl text-sm sm:text-base font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>C</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinpadDigit('0')}
                      disabled={!currentActiveTranche}
                      className="h-14 sm:h-16 rounded-2xl text-xl sm:text-2xl font-bold font-mono border hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinpadDigit('BACKSPACE')}
                      disabled={!currentActiveTranche}
                      className="h-14 sm:h-16 rounded-2xl text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-xs"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* RÉCAPITULATIF CHECKOUT & ACTION PRINCIPALE */}
                <div className="pt-5 border-t space-y-4 shrink-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Total Checkout
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {fmt(totalToPay)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={submitting || totalToPay <= 0 || !selectedStudent}
                    onClick={handleSubmit}
                    className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer border border-emerald-500/40"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Printer className="w-5 h-5" />
                    )}
                    <span>Valider & Imprimer le Reçu</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    Annuler l'opération
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ MODALE APERÇU ET IMPRESSION DIRECTE DU REÇU ═══ */}
      {showReceiptModal && createdPayment && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={handleCloseReceiptModal}
          payment={createdPayment}
          invoice={createdInvoice || undefined}
          feeTypes={feeTypes}
        />
      )}
    </div>,
    document.body
  );
};
