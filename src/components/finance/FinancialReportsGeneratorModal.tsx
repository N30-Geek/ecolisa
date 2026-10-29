import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, FileSpreadsheet, FileType, Printer, Calendar, Filter,
  Search, Columns, Square, Loader2, Download,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { getInvoiceTotal, getInvoicePaid, getInvoiceStatus, round2 } from '../../utils/financeCalculations';
import { getStudentOption, getOptionLabel, normalizeOptionCode } from '../../utils/options';
import { normalizeAccessCycle } from '../../utils/permissions';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import type {
  FactureEleve, TransactionPaiement, OperationCaisse, Eleve,
  ClasseScolaire, TypeFraisScolaire, AnneeScolaireConfig, BudgetPrevisionnel,
} from '../../types';

export type FinancialReportTemplate =
  | 'CAHIER_PERCEPTION'
  | 'LIVRE_CAISSE'
  | 'CARNET_RECUS'
  | 'FACTURIER'
  | 'BON_DECAISSEMENT'
  | 'FICHE_PREVISION_BUDGETAIRE'
  | 'CAHIER_RECETTES_AUTOFINANCEMENT'
  | 'RAPPORT_FINANCIER_PERIODIQUE';

interface FinancialReportsGeneratorModalProps {
  onClose: () => void;
  activeSchoolYear?: string;
}

interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: number;
  format?: 'text' | 'currency' | 'date' | 'number';
  currencySource?: string;
}

interface ReportRow {
  [key: string]: any;
}

interface ReportData {
  title: string;
  subtitle: string;
  columns: ColumnDef[];
  rows: ReportRow[];
  totals?: ReportRow;
}

interface FilterState {
  yearId: string;
  dateFrom: string;
  dateTo: string;
  classId: string;
  cycleId: string;
  optionId: string;
  feeCategory: string;
  paymentMethod: string;
  invoiceStatus: string;
  search: string;
}

const REPORT_TEMPLATES: { value: FinancialReportTemplate; label: string; icon: any; category: string }[] = [
  { value: 'CAHIER_PERCEPTION', label: 'Cahier de perception', icon: FileText, category: 'Paiements' },
  { value: 'LIVRE_CAISSE', label: 'Livre de caisse', icon: FileText, category: 'Trésorerie' },
  { value: 'CARNET_RECUS', label: 'Carnet de reçus', icon: FileText, category: 'Paiements' },
  { value: 'FACTURIER', label: 'Facturier', icon: FileText, category: 'Facturation' },
  { value: 'BON_DECAISSEMENT', label: 'Bon de décaissement', icon: FileText, category: 'Dépenses' },
  { value: 'FICHE_PREVISION_BUDGETAIRE', label: 'Fiche de prévision budgétaire', icon: FileSpreadsheet, category: 'Budget' },
  { value: 'CAHIER_RECETTES_AUTOFINANCEMENT', label: 'Cahier des recettes autofinancement', icon: FileText, category: 'Trésorerie' },
  { value: 'RAPPORT_FINANCIER_PERIODIQUE', label: 'Rapport financier périodique', icon: FileType, category: 'Synthèse' },
];

const FEE_CATEGORY_LABELS: Record<string, string> = {
  FRAIS_INSCRIPTION: 'Inscription', FRAIS_REINSCRIPTION: 'Réinscription',
  FRAIS_MINERVAL: 'Minerval', FRAIS_CONNEXES: 'Frais connexes',
  FRAIS_CARTE: 'Carte scolaire', FRAIS_EXAMEN: 'Examens',
  FRAIS_KITS_EQUIPEMENTS: 'Kits & équipements', FRAIS_UNIFORME: 'Uniforme',
  FRAIS_BUS: 'Transport', FRAIS_ACTIVITE: 'Activités', FRAIS_CANTINE: 'Cantine',
  FRAIS_INTERNAT: 'Internat', AUTRE: 'Autres',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces', ESPECES: 'Espèces', BANK: 'Virement bancaire',
  BANQUE: 'Virement bancaire', CHEQUE: 'Chèque', MOBILE_MONEY: 'Mobile Money',
  MPESA: 'M-Pesa', FLEXPAY_MPESA: 'M-Pesa', FLEXPAY_ORANGE: 'Orange Money',
  FLEXPAY_AIRTEL: 'Airtel Money', FLEXPAY_CARTE: 'Carte bancaire',
  ORANGE_MONEY: 'Orange Money', AIRTEL_MONEY: 'Airtel Money',
  CARTE_BANCAIRE: 'Carte bancaire',
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  SALAIRES: 'Salaires & primes', SALAIRE: 'Salaires & primes',
  FOURNITURES: 'Fournitures', MAINTENANCE: 'Maintenance', LOYER: 'Loyer',
  TRANSPORT: 'Transport', ENERGIE: 'Eau & électricité', TAXES: 'Taxes & impôts',
  FORMATION: 'Formation', EVENEMENT: 'Événements', AUTRE: 'Autres',
};

const humanizeCode = (code: string, dictionary: Record<string, string>): string =>
  dictionary[code?.toUpperCase().trim()] || (code ? code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : '—');

const fmtDate = (d?: string | Date) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR');
  } catch { return '—'; }
};

export const FinancialReportsGeneratorModal: React.FC<FinancialReportsGeneratorModalProps> = ({
  onClose, activeSchoolYear,
}) => {
  const { currency, exchangeRate, config, referenceCurrency } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [template, setTemplate] = useState<FinancialReportTemplate>('CAHIER_PERCEPTION');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [generating, setGenerating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    yearId: activeSchoolYear || '', dateFrom: '', dateTo: '', classId: '', cycleId: '',
    optionId: '', feeCategory: '', paymentMethod: '', invoiceStatus: '', search: '',
  });

  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [cashOps, setCashOps] = useState<OperationCaisse[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [budgets, setBudgets] = useState<BudgetPrevisionnel[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [inv, pmt, cash, el, cl, ft, yrs, bud] = await Promise.all([
        LocalDatabaseService.getInvoices(),
        LocalDatabaseService.getPayments(),
        LocalDatabaseService.getCashOperations(),
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getFeeTypes(),
        LocalDatabaseService.getSchoolYears(),
        LocalDatabaseService.getBudgets().catch(() => [] as BudgetPrevisionnel[]),
      ]);
      setInvoices(inv || []);
      setPayments(pmt || []);
      setCashOps(cash || []);
      setStudents(el || []);
      setClasses(cl || []);
      setFeeTypes(ft || []);
      setYears(yrs || []);
      setBudgets(bud || []);
      if (!filters.yearId && yrs?.length) {
        const active = yrs.find(y => y.statut === 'EN_COURS') || yrs[0];
        setFilters(prev => ({ ...prev, yearId: active?.id || '' }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const activeYear = useMemo(() =>
    years.find(y => y.id === filters.yearId) || years.find(y => y.statut === 'EN_COURS') || years[0],
  [years, filters.yearId]);

  const inDateRange = (d?: string) => {
    if (!d) return false;
    const day = d.split('T')[0];
    if (filters.dateFrom && day < filters.dateFrom) return false;
    if (filters.dateTo && day > filters.dateTo) return false;
    return true;
  };

  const yearMatches = (item: { anneeScolaireId?: string; schoolYearId?: string }) =>
    !filters.yearId || item.anneeScolaireId === filters.yearId || item.schoolYearId === filters.yearId;

  const getClassOfStudent = (s?: Eleve) => classes.find(c => c.id === s?.classId);

  const getStudentName = (s?: Eleve) => s ? `${s.prenom || ''} ${s.nom || ''}`.trim() : '—';

  const getStudentFilterData = (studentId?: string) => {
    const stu = students.find(s => s.id === studentId || s.registrationNumber === studentId);
    const cls = stu ? getClassOfStudent(stu) : undefined;
    const cycle = normalizeAccessCycle(cls?.cycleId || cls?.cycleCode) || '';
    const option = normalizeOptionCode(stu?.optionCode || stu?.optionEPST || cls?.optionCode) || '';
    return { classId: stu?.classId || '', cycle, option };
  };

  const getClassFilterData = (classId?: string) => {
    const cls = classes.find(c => c.id === classId);
    const cycle = normalizeAccessCycle(cls?.cycleId || cls?.cycleCode) || '';
    const option = normalizeOptionCode(cls?.optionCode) || '';
    return { classId: cls?.id || '', cycle, option };
  };

  const paymentMatchesFeeCategory = (p: TransactionPaiement) => {
    if (!filters.feeCategory) return true;
    if (!p.allocations?.length) return false;
    return p.allocations.some(a => {
      const ft = feeTypes.find(f => f.id === a.feeTypeId);
      return ft?.categorie === filters.feeCategory;
    });
  };

  const filteredPayments = useMemo(() => payments.filter(p => {
    if (!yearMatches(p)) return false;
    if (!inDateRange(p.dateCreation)) return false;
    if (filters.paymentMethod && p.moyenPaiement !== filters.paymentMethod) return false;
    if (filters.feeCategory && !paymentMatchesFeeCategory(p)) return false;
    const ctx = getStudentFilterData(p.studentId);
    if (filters.classId && ctx.classId !== filters.classId) return false;
    if (filters.cycleId && ctx.cycle !== filters.cycleId) return false;
    if (filters.optionId && ctx.option !== filters.optionId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [
        p.nomEleve, p.studentId, p.registrationNumber, p.numeroRecu,
        p.invoiceId, p.reference,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [payments, filters, feeTypes, students, classes]);

  const invoiceMatchesFeeCategory = (i: FactureEleve) => {
    if (!filters.feeCategory) return true;
    if (i.lignes?.length) return i.lignes.some(l => l.categorie === filters.feeCategory);
    return false;
  };

  const filteredInvoices = useMemo(() => invoices.filter(i => {
    if (!yearMatches(i)) return false;
    if (!inDateRange(i.dateEcheance)) return false;
    if (filters.invoiceStatus) {
      const status = getInvoiceStatus(i, payments, currency);
      if (status !== filters.invoiceStatus) return false;
    }
    if (filters.feeCategory && !invoiceMatchesFeeCategory(i)) return false;
    const ctx = i.classeId ? getClassFilterData(i.classeId) : getStudentFilterData(i.studentId);
    if (filters.classId && ctx.classId !== filters.classId) return false;
    if (filters.cycleId && ctx.cycle !== filters.cycleId) return false;
    if (filters.optionId && ctx.option !== filters.optionId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [
        i.nomEleve, i.numeroFacture, i.studentId, i.nomClasse,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [invoices, filters, students, classes, payments, currency, feeTypes]);

  const filteredCash = useMemo(() => cashOps.filter(o => {
    if (!yearMatches(o)) return false;
    if (!inDateRange(o.date)) return false;
    if (filters.paymentMethod && o.modePaiement !== filters.paymentMethod) return false;
    if (filters.classId && o.classId !== filters.classId) return false;
    if (filters.cycleId) {
      const opCycle = normalizeAccessCycle(o.cycleId) || '';
      if (opCycle !== filters.cycleId) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [
        o.libelle, o.reference, o.beneficiaire, o.caissier, o.motif,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [cashOps, filters, classes]);

  const filteredBudgets = useMemo(() => budgets.filter(b => {
    if (filters.yearId && b.schoolYearId !== filters.yearId) return false;
    if (filters.feeCategory && b.categorie !== filters.feeCategory) return false;
    return true;
  }), [budgets, filters]);

  const cahierPerception = useMemo((): ReportData => {
    const rows: ReportRow[] = [];
    for (const p of filteredPayments) {
      const stu = students.find(s => s.id === p.eleveId || s.id === p.studentId);
      const cls = getClassOfStudent(stu);
      if (p.allocations?.length) {
        p.allocations.forEach(a => {
          const ft = feeTypes.find(f => f.id === a.feeTypeId);
          rows.push({
            date: fmtDate(p.dateCreation),
            recu: p.numeroRecu,
            matricule: p.studentId || p.registrationNumber || '—',
            eleve: p.nomEleve || getStudentName(stu),
            classe: cls?.nom || stu?.nomClasse || '—',
            frais: ft?.nom || 'Frais scolaires',
            montant: a.montant,
            devise: p.devise,
            mode: humanizeCode(p.moyenPaiement, PAYMENT_METHOD_LABELS),
            caissier: p.nomCaissier || '—',
          });
        });
      } else {
        rows.push({
          date: fmtDate(p.dateCreation),
          recu: p.numeroRecu,
          matricule: p.studentId || p.registrationNumber || '—',
          eleve: p.nomEleve || getStudentName(stu),
          classe: cls?.nom || stu?.nomClasse || '—',
          frais: 'Règlement global',
          montant: p.montantPaye,
          devise: p.devise,
          mode: humanizeCode(p.moyenPaiement, PAYMENT_METHOD_LABELS),
          caissier: p.nomCaissier || '—',
        });
      }
    }
    const total = round2(rows.reduce((s, r) => s + convertCurrency(r.montant, r.devise, currency, exchangeRate), 0));
    return {
      title: 'CAHIER DE PERCEPTION',
      subtitle: `Du ${filters.dateFrom || '—'} au ${filters.dateTo || '—'} — Année ${activeYear?.nom || '—'}`,
      columns: [
        { key: 'date', label: 'Date', width: 22 },
        { key: 'recu', label: 'N° Reçu', width: 30 },
        { key: 'matricule', label: 'Matricule', width: 30 },
        { key: 'eleve', label: 'Élève', width: 45 },
        { key: 'classe', label: 'Classe', width: 35 },
        { key: 'frais', label: 'Frais', width: 50 },
        { key: 'montant', label: 'Montant', align: 'right', format: 'currency', currencySource: 'devise', width: 28 },
        { key: 'devise', label: 'Dev.', align: 'center', width: 15 },
        { key: 'mode', label: 'Mode', width: 35 },
        { key: 'caissier', label: 'Percepteur', width: 35 },
      ],
      rows,
      totals: { date: 'TOTAL', montant: total, devise: currency, mode: '', caissier: '' },
    };
  }, [filteredPayments, feeTypes, students, classes, currency, exchangeRate, filters, activeYear]);

  const livreCaisse = useMemo((): ReportData => {
    const sorted = [...filteredCash].sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());
    let balance = 0;
    const rows = sorted.map(o => {
      const val = convertCurrency(o.montant || 0, o.devise, currency, exchangeRate);
      if (o.type === 'ENTREE') balance += val;
      else if (o.type === 'SORTIE') balance -= val;
      return {
        date: fmtDate(o.date),
        reference: o.reference || o.id,
        type: o.type === 'ENTREE' ? 'Entrée' : o.type === 'SORTIE' ? 'Sortie' : 'Transfert',
        categorie: humanizeCode(o.categorie, EXPENSE_CATEGORY_LABELS),
        libelle: o.libelle,
        entrees: o.type === 'ENTREE' ? o.montant : 0,
        sorties: o.type === 'SORTIE' ? o.montant : 0,
        devise: o.devise,
        solde: balance,
      };
    });
    const totalEntrees = round2(sorted.filter(o => o.type === 'ENTREE').reduce((s, o) => s + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0));
    const totalSorties = round2(sorted.filter(o => o.type === 'SORTIE').reduce((s, o) => s + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0));
    return {
      title: 'LIVRE DE CAISSE',
      subtitle: `Registre chronologique des entrées et sorties — ${activeYear?.nom || ''}`,
      columns: [
        { key: 'date', label: 'Date', width: 22 },
        { key: 'reference', label: 'Référence', width: 30 },
        { key: 'type', label: 'Type', width: 25 },
        { key: 'categorie', label: 'Catégorie', width: 45 },
        { key: 'libelle', label: 'Libellé', width: 60 },
        { key: 'entrees', label: 'Entrées', align: 'right', format: 'currency', currencySource: 'devise', width: 28 },
        { key: 'sorties', label: 'Sorties', align: 'right', format: 'currency', currencySource: 'devise', width: 28 },
        { key: 'solde', label: `Solde (${currency})`, align: 'right', format: 'currency', width: 30 },
      ],
      rows,
      totals: { date: 'TOTAL', entrees: totalEntrees, sorties: totalSorties, solde: round2(totalEntrees - totalSorties), devise: currency, reference: '', type: '', categorie: '', libelle: '' },
    };
  }, [filteredCash, currency, exchangeRate, activeYear]);

  const carnetRecus = useMemo((): ReportData => {
    const rows = filteredPayments.map(p => {
      const stu = students.find(s => s.id === p.eleveId || s.id === p.studentId);
      const cls = getClassOfStudent(stu);
      return {
        recu: p.numeroRecu,
        date: fmtDate(p.dateCreation),
        matricule: p.studentId || p.registrationNumber || '—',
        eleve: p.nomEleve || getStudentName(stu),
        classe: cls?.nom || stu?.nomClasse || '—',
        montant: p.montantPaye,
        devise: p.devise,
        mode: humanizeCode(p.moyenPaiement, PAYMENT_METHOD_LABELS),
        reference: p.reference || '—',
        caissier: p.nomCaissier || '—',
        facture: p.invoiceId || '—',
      };
    });
    const total = round2(rows.reduce((s, r) => s + convertCurrency(r.montant, r.devise, currency, exchangeRate), 0));
    return {
      title: 'CARNET DE REÇUS',
      subtitle: `Souche des reçus émis — ${activeYear?.nom || ''}`,
      columns: [
        { key: 'recu', label: 'N° Reçu', width: 30 },
        { key: 'date', label: 'Date', width: 22 },
        { key: 'matricule', label: 'Matricule', width: 30 },
        { key: 'eleve', label: 'Élève', width: 50 },
        { key: 'classe', label: 'Classe', width: 35 },
        { key: 'montant', label: 'Montant', align: 'right', format: 'currency', currencySource: 'devise', width: 28 },
        { key: 'devise', label: 'Dev.', align: 'center', width: 15 },
        { key: 'mode', label: 'Mode', width: 35 },
        { key: 'reference', label: 'Référence', width: 35 },
        { key: 'caissier', label: 'Caissier', width: 35 },
      ],
      rows,
      totals: { recu: 'TOTAL', montant: total, devise: currency, date: '', mode: '', reference: '', caissier: '', matricule: '', classe: '', facture: '' },
    };
  }, [filteredPayments, students, classes, currency, exchangeRate, activeYear]);

  const facturier = useMemo((): ReportData => {
    const rows = filteredInvoices.map(i => {
      const total = getInvoiceTotal(i, currency);
      const paye = getInvoicePaid(i, payments, currency);
      const solde = Math.max(0, total - paye);
      const stu = students.find(s => s.id === i.eleveId || s.id === i.studentId);
      return {
        facture: i.numeroFacture,
        date: fmtDate(i.dateEcheance),
        matricule: i.studentId || '—',
        eleve: i.nomEleve || getStudentName(stu),
        classe: i.nomClasse || stu?.nomClasse || '—',
        total,
        paye,
        solde,
        statut: getInvoiceStatus(i, payments, currency),
      };
    });
    const total = round2(rows.reduce((s, r) => s + r.total, 0));
    const paye = round2(rows.reduce((s, r) => s + r.paye, 0));
    const solde = round2(total - paye);
    return {
      title: 'FACTURIER',
      subtitle: `Classement des factures émises — ${activeYear?.nom || ''}`,
      columns: [
        { key: 'facture', label: 'N° Facture', width: 35 },
        { key: 'date', label: 'Date', width: 22 },
        { key: 'matricule', label: 'Matricule', width: 30 },
        { key: 'eleve', label: 'Élève', width: 50 },
        { key: 'classe', label: 'Classe', width: 40 },
        { key: 'total', label: 'Total', align: 'right', format: 'currency', width: 30 },
        { key: 'paye', label: 'Payé', align: 'right', format: 'currency', width: 30 },
        { key: 'solde', label: 'Solde', align: 'right', format: 'currency', width: 30 },
        { key: 'statut', label: 'Statut', width: 25 },
      ],
      rows,
      totals: { facture: 'TOTAL', total, paye, solde, statut: '', date: '', matricule: '', eleve: '', classe: '' },
    };
  }, [filteredInvoices, payments, students, currency, activeYear]);

  const bonDecaissement = useMemo((): ReportData => {
    const rows = filteredCash
      .filter(o => o.type === 'SORTIE')
      .map(o => ({
        date: fmtDate(o.date),
        reference: o.reference || o.id,
        beneficiaire: o.beneficiaire || '—',
        libelle: o.libelle,
        categorie: humanizeCode(o.categorie, EXPENSE_CATEGORY_LABELS),
        montant: o.montant,
        devise: o.devise,
        mode: humanizeCode(o.modePaiement, PAYMENT_METHOD_LABELS),
        caissier: o.caissier || '—',
      }));
    const total = round2(rows.reduce((s, r) => s + convertCurrency(r.montant, r.devise, currency, exchangeRate), 0));
    return {
      title: 'BON DE DÉCAISSEMENT',
      subtitle: `Sorties de caisse autorisées — ${activeYear?.nom || ''}`,
      columns: [
        { key: 'date', label: 'Date', width: 22 },
        { key: 'reference', label: 'Référence', width: 30 },
        { key: 'beneficiaire', label: 'Bénéficiaire', width: 50 },
        { key: 'libelle', label: 'Motif / Libellé', width: 60 },
        { key: 'categorie', label: 'Catégorie', width: 45 },
        { key: 'montant', label: 'Montant', align: 'right', format: 'currency', currencySource: 'devise', width: 28 },
        { key: 'devise', label: 'Dev.', align: 'center', width: 15 },
        { key: 'mode', label: 'Mode', width: 35 },
        { key: 'caissier', label: 'Caissier', width: 35 },
      ],
      rows,
      totals: { date: 'TOTAL', montant: total, devise: currency, reference: '', beneficiaire: '', libelle: '', categorie: '', mode: '', caissier: '' },
    };
  }, [filteredCash, currency, exchangeRate, activeYear]);

  const cahierRecettesAutofinancement = useMemo((): ReportData => {
    const rows = filteredCash
      .filter(o => o.type === 'ENTREE' && o.origine !== 'PAYMENT')
      .map(o => ({
        date: fmtDate(o.date),
        reference: o.reference || o.id,
        source: o.origine || 'Interne',
        categorie: humanizeCode(o.categorie, EXPENSE_CATEGORY_LABELS),
        libelle: o.libelle,
        montant: o.montant,
        devise: o.devise,
        caissier: o.caissier || '—',
      }));
    const total = round2(rows.reduce((s, r) => s + convertCurrency(r.montant, r.devise, currency, exchangeRate), 0));
    return {
      title: "CAHIER DES RECETTES D'AUTOFINANCEMENT",
      subtitle: `Recettes hors frais scolaires (dons, activités, contributions) — ${activeYear?.nom || ''}`,
      columns: [
        { key: 'date', label: 'Date', width: 22 },
        { key: 'reference', label: 'Référence', width: 30 },
        { key: 'source', label: 'Source', width: 35 },
        { key: 'categorie', label: 'Catégorie', width: 45 },
        { key: 'libelle', label: 'Libellé', width: 60 },
        { key: 'montant', label: 'Montant', align: 'right', format: 'currency', currencySource: 'devise', width: 28 },
        { key: 'devise', label: 'Dev.', align: 'center', width: 15 },
        { key: 'caissier', label: 'Caissier', width: 35 },
      ],
      rows,
      totals: { date: 'TOTAL', montant: total, devise: currency, reference: '', source: '', categorie: '', libelle: '', caissier: '' },
    };
  }, [filteredCash, currency, exchangeRate, activeYear]);

  const fichePrevisionBudgetaire = useMemo((): ReportData => {
    const actuals = new Map<string, { prevu: number; realise: number; type: 'REVENU' | 'DEPENSE' }>();
    for (const b of filteredBudgets) {
      const key = `${b.type}||${b.categorie}`;
      const cur = actuals.get(key) || { prevu: 0, realise: 0, type: b.type };
      cur.prevu += convertCurrency(b.montant, b.devise, currency, exchangeRate);
      actuals.set(key, cur);
    }
    // Réalisé : revenus = paiements par catégorie de frais, dépenses = sorties de caisse
    for (const p of filteredPayments) {
      const cats = p.allocations?.length
        ? p.allocations.map(a => feeTypes.find(f => f.id === a.feeTypeId)?.categorie).filter(Boolean) as string[]
        : ['PAIEMENT'];
      const amount = convertCurrency(p.montantPaye, p.devise, currency, exchangeRate);
      for (const c of [...new Set(cats)]) {
        const key = `REVENU||${c}`;
        const cur = actuals.get(key) || { prevu: 0, realise: 0, type: 'REVENU' as const };
        cur.realise += amount / cats.length;
        actuals.set(key, cur);
      }
    }
    for (const o of filteredCash.filter(x => x.type === 'SORTIE')) {
      const key = `DEPENSE||${o.categorie}`;
      const cur = actuals.get(key) || { prevu: 0, realise: 0, type: 'DEPENSE' as const };
      cur.realise += convertCurrency(o.montant, o.devise, currency, exchangeRate);
      actuals.set(key, cur);
    }
    const rows = Array.from(actuals.entries()).map(([key, v]) => {
      const [, categorie] = key.split('||');
      const ecart = round2(v.realise - v.prevu);
      return {
        type: v.type,
        categorie: humanizeCode(categorie, { ...FEE_CATEGORY_LABELS, ...EXPENSE_CATEGORY_LABELS }),
        prevu: v.prevu,
        realise: v.realise,
        ecart,
        taux: v.prevu > 0 ? `${round2((v.realise / v.prevu) * 100)}%` : '—',
      };
    }).filter(r => r.prevu > 0.001 || r.realise > 0.001)
      .sort((a, b) => b.realise - a.realise);
    const prevuTotal = round2(rows.filter(r => r.type === 'REVENU').reduce((s, r) => s + r.prevu, 0) - rows.filter(r => r.type === 'DEPENSE').reduce((s, r) => s + r.prevu, 0));
    const realiseTotal = round2(rows.filter(r => r.type === 'REVENU').reduce((s, r) => s + r.realise, 0) - rows.filter(r => r.type === 'DEPENSE').reduce((s, r) => s + r.realise, 0));
    return {
      title: 'FICHE DE PRÉVISION BUDGÉTAIRE',
      subtitle: `Prévisions vs réalisations — ${activeYear?.nom || ''} — du ${filters.dateFrom || '—'} au ${filters.dateTo || '—'}`,
      columns: [
        { key: 'type', label: 'Type', width: 20 },
        { key: 'categorie', label: 'Catégorie', width: 50 },
        { key: 'prevu', label: 'Prévu', align: 'right', format: 'currency', width: 30 },
        { key: 'realise', label: 'Réalisé', align: 'right', format: 'currency', width: 30 },
        { key: 'ecart', label: 'Écart', align: 'right', format: 'currency', width: 30 },
        { key: 'taux', label: '% Réal.', align: 'center', width: 22 },
      ],
      rows,
      totals: { type: 'SOLDE', categorie: 'Résultat prévisionnel', prevu: prevuTotal, realise: realiseTotal, ecart: round2(realiseTotal - prevuTotal), taux: '' },
    };
  }, [filteredBudgets, filteredPayments, filteredCash, feeTypes, currency, exchangeRate, activeYear, filters]);

  const rapportFinancierPeriodique = useMemo((): ReportData => {
    const totalBilled = filteredInvoices.reduce((s, i) => s + getInvoiceTotal(i, currency), 0);
    const totalPaid = filteredInvoices.reduce((s, i) => s + getInvoicePaid(i, payments, currency), 0);
    const totalUnpaid = Math.max(0, totalBilled - totalPaid);
    const totalEntrees = filteredCash.filter(o => o.type === 'ENTREE').reduce((s, o) => s + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0);
    const totalSorties = filteredCash.filter(o => o.type === 'SORTIE').reduce((s, o) => s + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0);
    const netCash = totalEntrees - totalSorties;
    const recoveryRate = totalBilled > 0 ? round2((totalPaid / totalBilled) * 100) : 0;
    const rows: ReportRow[] = [
      { rubrique: 'Total facturé', montant: totalBilled, commentaire: 'Montants facturés sur la période' },
      { rubrique: 'Total encaissé', montant: totalPaid, commentaire: 'Paiements reçus et validés' },
      { rubrique: 'Reste à payer', montant: totalUnpaid, commentaire: `Taux de recouvrement : ${recoveryRate}%` },
      { rubrique: 'Total entrées caisse', montant: totalEntrees, commentaire: 'Recettes de trésorerie' },
      { rubrique: 'Total sorties caisse', montant: totalSorties, commentaire: 'Dépenses de trésorerie' },
      { rubrique: 'Solde caisse', montant: netCash, commentaire: netCash >= 0 ? 'Excédent de trésorerie' : 'Déficit de trésorerie' },
    ];
    return {
      title: 'RAPPORT FINANCIER PÉRIODIQUE',
      subtitle: `Synthèse de trésorerie et recouvrement — ${activeYear?.nom || ''} — du ${filters.dateFrom || '—'} au ${filters.dateTo || '—'}`,
      columns: [
        { key: 'rubrique', label: 'Rubrique', width: 70 },
        { key: 'montant', label: 'Montant', align: 'right', format: 'currency', width: 40 },
        { key: 'commentaire', label: 'Commentaire', width: 90 },
      ],
      rows,
    };
  }, [filteredInvoices, filteredCash, payments, currency, exchangeRate, activeYear, filters]);

  const reportData = useMemo<ReportData>(() => {
    switch (template) {
      case 'CAHIER_PERCEPTION': return cahierPerception;
      case 'LIVRE_CAISSE': return livreCaisse;
      case 'CARNET_RECUS': return carnetRecus;
      case 'FACTURIER': return facturier;
      case 'BON_DECAISSEMENT': return bonDecaissement;
      case 'FICHE_PREVISION_BUDGETAIRE': return fichePrevisionBudgetaire;
      case 'CAHIER_RECETTES_AUTOFINANCEMENT': return cahierRecettesAutofinancement;
      case 'RAPPORT_FINANCIER_PERIODIQUE': return rapportFinancierPeriodique;
    }
  }, [template, cahierPerception, livreCaisse, carnetRecus, facturier, bonDecaissement, fichePrevisionBudgetaire, cahierRecettesAutofinancement, rapportFinancierPeriodique]);

  const schoolName = config?.schoolName || 'ÉTABLISSEMENT SCOLAIRE';
  const schoolAddress = config?.address || '';
  const schoolPhone = config?.phone || '';
  const schoolEmail = config?.email || '';
  const lieu = config?.subDivision?.trim() || config?.province?.trim() || 'Lieu à configurer';
  const signataireName = config?.promoterName?.trim() || '................................';
  const signataireRole = config?.promoterRole?.trim() || "Chef d'Établissement";

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerText = [
    'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
    "MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE",
    schoolName.toUpperCase(),
    [schoolAddress, [schoolPhone, schoolEmail].filter(Boolean).join(' — ')].filter(Boolean).join('  |  '),
  ].filter(Boolean);

  const formatCell = (row: ReportRow | undefined | null, col: ColumnDef) => {
    if (!row) return '—';
    const raw = row[col.key];
    if (raw === undefined || raw === null) return '—';
    if (col.format === 'currency') {
      const src = col.currencySource ? (row[col.currencySource] || currency) : currency;
      return formatCurrency(raw, currency, src, exchangeRate);
    }
    if (col.format === 'date') return fmtDate(raw);
    if (col.format === 'number') return typeof raw === 'number' ? raw.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(raw);
    return String(raw);
  };

  const exportPDF = async () => {
    setGenerating('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = (autoTableModule as any).default || autoTableModule;
      const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const marge = 10;

      let y = 8;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(headerText[0] || '', pageW / 2, y, { align: 'center' });
      y += 4;
      if (headerText[1]) { doc.text(headerText[1], pageW / 2, y, { align: 'center' }); y += 4; }
      if (headerText[2]) { doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(headerText[2], pageW / 2, y, { align: 'center' }); y += 5; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      if (headerText[3]) { doc.text(headerText[3], pageW / 2, y, { align: 'center' }); y += 5; }

      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(reportData.title, pageW / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(reportData.subtitle, pageW / 2, y, { align: 'center' });
      y += 8;

      const head = [reportData.columns.map(c => c.label)];
      const body = reportData.rows.map(row => reportData.columns.map(c => formatCell(row, c)));
      if (reportData.totals) {
        body.push(reportData.columns.map(c => formatCell(reportData.totals, c)));
      }

      autoTable(doc, {
        head,
        body,
        startY: y,
        margin: { top: 18, left: marge, right: marge, bottom: 22 },
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.2, lineColor: [180, 180, 180], lineWidth: 0.1, halign: 'left' },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { textColor: 0, halign: 'left' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: reportData.columns.reduce((acc, c, i) => {
          acc[i] = { halign: c.align || 'left', cellWidth: c.width ? c.width / 5.4 : 'auto' };
          return acc;
        }, {} as any),
        theme: 'grid',
        showHead: 'everyPage',
        rowPageBreak: 'avoid',
        didParseCell: (data: any) => {
          if (data.row.index === body.length - 1 && reportData.totals) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        },
      });

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.text(`Fait à ${lieu}, le ${new Date().toLocaleDateString('fr-FR')}`, pageW - 14, doc.internal.pageSize.getHeight() - 16, { align: 'right' });
        doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.25);
        doc.line(pageW - 70, doc.internal.pageSize.getHeight() - 15, pageW - 14, doc.internal.pageSize.getHeight() - 15);
        doc.setFont('helvetica', 'bold'); doc.text(signataireName, pageW - 14, doc.internal.pageSize.getHeight() - 12, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.text(signataireRole, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
        doc.text(`Page ${i} / ${pages}`, pageW - 14, doc.internal.pageSize.getHeight() - 4, { align: 'right' });
      }

      const d = new Date().toISOString().slice(0, 10);
      doc.save(`${reportData.title.toLowerCase().replace(/\s+/g, '_').replace(/[']/g, '')}_${d}.pdf`);
    } finally { setGenerating(null); }
  };

  const exportXLSX = async () => {
    setGenerating('xlsx');
    try {
      const XLSX = await import('xlsx');
      const headers = reportData.columns.map(c => c.label);
      const rows = reportData.rows.map(row => reportData.columns.map(c => formatCell(row, c)));
      if (reportData.totals) rows.push(reportData.columns.map(c => formatCell(reportData.totals, c)));
      const contact = [schoolAddress, [schoolPhone, schoolEmail].filter(Boolean).join(' — ')].filter(Boolean).join(' | ');
      const ws = XLSX.utils.aoa_to_sheet([
        [schoolName.toUpperCase()],
        [contact],
        [reportData.title],
        [reportData.subtitle],
        [],
        headers,
        ...rows,
      ]);
      const colCount = headers.length;
      ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }));
      ws['!cols'] = reportData.columns.map(c => ({ wch: (c.width || 20) / 2.2 }));
      ws['!autofilter'] = { ref: `A6:${String.fromCharCode(64 + colCount)}${6 + rows.length}` };
      ws['!freeze'] = { xSplit: 0, ySplit: 6 };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Document');
      const d = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `${reportData.title.toLowerCase().replace(/\s+/g, '_').replace(/[']/g, '')}_${d}.xlsx`);
    } finally { setGenerating(null); }
  };

  const exportDOCX = async () => {
    setGenerating('docx');
    try {
      const docx = await import('docx');
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, PageOrientation, BorderStyle, VerticalAlign } = docx;
      const cell = (text: string, bold = false, header = false) => new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({
          alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 0, line: 240, lineRule: 'auto' },
          children: [new TextRun({ text, font: 'Arial', size: header ? 16 : 14, bold: bold || header, color: header ? 'FFFFFF' : '000000' })],
        })],
        shading: header ? { fill: '1E293B' } : undefined,
      });
      const headerRows = [
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', bold: true, size: 18, font: 'Arial' })], alignment: AlignmentType.CENTER })] })] }),
      ];
      const bodyRows = [
        new TableRow({ tableHeader: true, children: reportData.columns.map(c => cell(c.label, true, true)) }),
        ...reportData.rows.map(row => new TableRow({
          children: reportData.columns.map(c => cell(formatCell(row, c))),
        })),
      ];
      if (reportData.totals) {
        bodyRows.push(new TableRow({
          children: reportData.columns.map(c => cell(formatCell(reportData.totals, c), true)),
        }));
      }
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { width: orientation === 'landscape' ? 16838 : 11906, height: orientation === 'landscape' ? 11906 : 16838, orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
              margin: { top: 720, right: 720, bottom: 1100, left: 720 },
            },
          },
          children: [
            new Paragraph({ children: [new TextRun({ text: schoolName.toUpperCase(), bold: true, size: 24, font: 'Arial' })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: [schoolAddress, [schoolPhone, schoolEmail].filter(Boolean).join(' — ')].filter(Boolean).join('  |  '), size: 16, font: 'Arial' })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: reportData.title, bold: true, size: 28, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
            new Paragraph({ children: [new TextRun({ text: reportData.subtitle, size: 16, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: bodyRows,
              borders: { top: { style: BorderStyle.SINGLE, size: 8, color: '000000' }, bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' }, left: { style: BorderStyle.SINGLE, size: 8, color: '000000' }, right: { style: BorderStyle.SINGLE, size: 8, color: '000000' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
            }),
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      const d = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `${reportData.title.toLowerCase().replace(/\s+/g, '_').replace(/[']/g, '')}_${d}.docx`);
    } finally { setGenerating(null); }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${reportData.title}</title>
          <style>
            @page { size: ${orientation}; margin: 15mm; }
            body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
            .header { text-align: center; margin-bottom: 10px; }
            .header h1 { font-size: 14pt; margin: 0; }
            .header p { font-size: 8pt; margin: 2px 0; }
            .title { font-size: 16pt; font-weight: bold; text-align: center; margin: 10px 0; }
            .subtitle { font-size: 10pt; text-align: center; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            thead { display: table-header-group; }
            th, td { border: 0.5pt solid #999; padding: 4pt 6pt; font-size: 8.5pt; vertical-align: middle; }
            th { background: #1e293b; color: #fff; font-weight: bold; text-align: center; }
            tr { page-break-inside: avoid; }
            td.right { text-align: right; } td.center { text-align: center; }
            .total-row td { font-weight: bold; background: #f1f5f9; }
            .footer { margin-top: 20px; text-align: right; font-size: 9pt; }
          </style>
        </head>
        <body>
          <div class="header">
            <p>RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</p>
            <p>MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE</p>
            <h1>${schoolName.toUpperCase()}</h1>
            <p>${[schoolAddress, [schoolPhone, schoolEmail].filter(Boolean).join(' — ')].filter(Boolean).join('  |  ')}</p>
          </div>
          <div class="title">${reportData.title}</div>
          <div class="subtitle">${reportData.subtitle}</div>
          ${content}
          <div class="footer">
            <p>Fait à ${lieu}, le ${new Date().toLocaleDateString('fr-FR')}</p>
            <p style="font-weight:bold">${signataireName}</p>
            <p>${signataireRole}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const applyPeriodPreset = (preset: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let from = ''; let to = today;
    switch (preset) {
      case 'today': from = today; break;
      case 'this_week': { const s = new Date(now); s.setDate(now.getDate() - ((now.getDay() + 6) % 7)); from = s.toISOString().split('T')[0]; break; }
      case 'this_month': from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break;
      case 'last_month': { from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]; to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]; break; }
      case 'this_quarter': { const q = Math.floor(now.getMonth() / 3); from = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0]; break; }
      case 'this_year': from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; break;
      case 'last_year': { from = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]; to = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]; break; }
      default: from = ''; to = '';
    }
    setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to }));
  };

  const currentUser = LocalDatabaseService.getCurrentUser();

  const yearOptions = useMemo(() => [{ value: '', label: 'Toutes les années' }, ...years.map(y => ({ value: y.id, label: y.nom }))], [years]);
  const classOptions = useMemo(() => [{ value: '', label: 'Toutes les classes' }, ...classes.map(c => ({ value: c.id, label: c.nom }))], [classes]);

  const cycleOptions = useMemo(() => {
    const raw = classes.map(c => normalizeAccessCycle(c.cycleId || c.cycleCode)).filter(Boolean) as ('MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE')[];
    if (currentUser?.role === 'PROMOTEUR_ADMIN' || currentUser?.role === 'DIRECTEUR_ECOLE') {
      raw.push('MATERNELLE', 'PRIMAIRE');
    }
    const unique = Array.from(new Set(raw)).sort();
    const labels: Record<string, string> = { MATERNELLE: 'Maternelle', PRIMAIRE: 'Primaire', SECONDAIRE: 'Secondaire' };
    return [{ value: '', label: 'Tous cycles' }, ...unique.map(c => ({ value: c, label: labels[c] || c }))];
  }, [classes, currentUser?.role]);

  const optionOptions = useMemo(() => {
    const codes = new Set<string>();
    classes.forEach(c => {
      if (c.optionCode) codes.add(normalizeOptionCode(c.optionCode) || c.optionCode);
      (c.options || []).forEach(o => { if (o) codes.add(normalizeOptionCode(o) || o); });
    });
    students.forEach(s => {
      if (s.optionCode) codes.add(normalizeOptionCode(s.optionCode) || s.optionCode);
      if (s.optionEPST) codes.add(normalizeOptionCode(s.optionEPST) || s.optionEPST);
    });
    const list = Array.from(codes)
      .filter(Boolean)
      .map(code => ({ value: code, label: getOptionLabel(code) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: '', label: 'Toutes options' }, ...list];
  }, [classes, students]);

  const feeCategoryOptions = useMemo(() => [{ value: '', label: 'Toutes catégories' }, ...Object.entries(FEE_CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))], []);
  const methodOptions = useMemo(() => [{ value: '', label: 'Tous modes' }, ...Object.entries(PAYMENT_METHOD_LABELS).filter(([k]) => !['BANQUE', 'ESPECES', 'MPESA'].includes(k)).map(([k, v]) => ({ value: k, label: v }))], []);
  const statusOptions = useMemo(() => [{ value: '', label: 'Tous statuts' }, { value: 'NON_PAYE', label: 'Non payé' }, { value: 'PARTIEL', label: 'Partiel' }, { value: 'PAYE', label: 'Payé' }], []);

  const FILTER_FIELDS_BY_TEMPLATE: Record<FinancialReportTemplate, string[]> = {
    CAHIER_PERCEPTION: ['year', 'period', 'dateFrom', 'dateTo', 'class', 'cycle', 'option', 'feeCategory', 'paymentMethod', 'search'],
    CARNET_RECUS: ['year', 'period', 'dateFrom', 'dateTo', 'class', 'cycle', 'option', 'feeCategory', 'paymentMethod', 'search'],
    LIVRE_CAISSE: ['year', 'period', 'dateFrom', 'dateTo', 'class', 'cycle', 'paymentMethod', 'search'],
    BON_DECAISSEMENT: ['year', 'period', 'dateFrom', 'dateTo', 'class', 'cycle', 'paymentMethod', 'search'],
    CAHIER_RECETTES_AUTOFINANCEMENT: ['year', 'period', 'dateFrom', 'dateTo', 'class', 'cycle', 'paymentMethod', 'search'],
    FACTURIER: ['year', 'period', 'dateFrom', 'dateTo', 'class', 'cycle', 'option', 'feeCategory', 'status', 'search'],
    FICHE_PREVISION_BUDGETAIRE: ['year', 'feeCategory', 'search'],
    RAPPORT_FINANCIER_PERIODIQUE: ['year', 'period', 'dateFrom', 'dateTo', 'class', 'cycle', 'option', 'feeCategory', 'status', 'search'],
  };

  const showFilter = (field: string) => FILTER_FIELDS_BY_TEMPLATE[template].includes(field);

  const resetFilters = () => setFilters({
    yearId: activeYear?.id || '', dateFrom: '', dateTo: '', classId: '', cycleId: '',
    optionId: '', feeCategory: '', paymentMethod: '', invoiceStatus: '', search: '',
  });

  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([k, v]) => {
    if (k === 'yearId') return false; // year is default
    return !!v;
  }).length, [filters]);

  const a4Class = orientation === 'portrait' ? 'w-[210mm] min-h-[297mm]' : 'w-[297mm] min-h-[210mm]';

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-7xl max-h-[96vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black">Documents comptables & financiers</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Génération PDF, Word, Excel et impression</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${orientation === 'landscape' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200/50'}`}>
              <Columns className="w-3.5 h-3.5" /> Paysage
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/50"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar templates */}
          <div className="w-72 border-r overflow-y-auto p-3 space-y-1 shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
            {REPORT_TEMPLATES.map(t => (
              <button
                key={t.value}
                onClick={() => setTemplate(t.value)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2 transition-all ${template === t.value ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-500/5'}`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Filters */}
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 items-end">
                {showFilter('year') && <CustomSelect options={yearOptions} value={filters.yearId} onChange={v => setFilters(f => ({ ...f, yearId: v }))} />}
                {showFilter('period') && <CustomSelect options={[
                  { value: '', label: 'Période' },
                  { value: 'today', label: 'Aujourd\'hui' },
                  { value: 'this_week', label: 'Cette semaine' },
                  { value: 'this_month', label: 'Ce mois' },
                  { value: 'last_month', label: 'Mois dernier' },
                  { value: 'this_quarter', label: 'Ce trimestre' },
                  { value: 'this_year', label: 'Cette année' },
                  { value: 'last_year', label: 'Année dernière' },
                ]} value="" onChange={v => v && applyPeriodPreset(v)} />}
                {showFilter('dateFrom') && <CustomDatePicker value={filters.dateFrom} onChange={d => setFilters(f => ({ ...f, dateFrom: d }))} placeholder="Du" />}
                {showFilter('dateTo') && <CustomDatePicker value={filters.dateTo} onChange={d => setFilters(f => ({ ...f, dateTo: d }))} placeholder="Au" />}
                {showFilter('class') && <CustomSelect options={classOptions} value={filters.classId} onChange={v => setFilters(f => ({ ...f, classId: v }))} />}
                {showFilter('cycle') && <CustomSelect options={cycleOptions} value={filters.cycleId} onChange={v => setFilters(f => ({ ...f, cycleId: v }))} />}
                {showFilter('option') && <CustomSelect options={optionOptions} value={filters.optionId} onChange={v => setFilters(f => ({ ...f, optionId: v }))} />}
                {showFilter('feeCategory') && <CustomSelect options={feeCategoryOptions} value={filters.feeCategory} onChange={v => setFilters(f => ({ ...f, feeCategory: v }))} />}
                {showFilter('paymentMethod') && <CustomSelect options={methodOptions} value={filters.paymentMethod} onChange={v => setFilters(f => ({ ...f, paymentMethod: v }))} />}
                {showFilter('status') && <CustomSelect options={statusOptions} value={filters.invoiceStatus} onChange={v => setFilters(f => ({ ...f, invoiceStatus: v }))} />}
                {showFilter('search') && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={filters.search}
                      onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                      placeholder="Rechercher élève / référence..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border text-xs font-bold"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                )}
                <button onClick={resetFilters} className="px-3 py-2 rounded-xl text-xs font-black border hover:bg-slate-500/5" style={{ borderColor: 'var(--border)' }}>
                  Réinitialiser {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
              </div>
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {filters.dateFrom && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Du {fmtDate(filters.dateFrom)}</span>}
                  {filters.dateTo && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Au {fmtDate(filters.dateTo)}</span>}
                  {filters.classId && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{classOptions.find(o => o.value === filters.classId)?.label}</span>}
                  {filters.cycleId && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{cycleOptions.find(o => o.value === filters.cycleId)?.label}</span>}
                  {filters.optionId && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{optionOptions.find(o => o.value === filters.optionId)?.label}</span>}
                  {filters.feeCategory && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{feeCategoryOptions.find(o => o.value === filters.feeCategory)?.label}</span>}
                  {filters.paymentMethod && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{methodOptions.find(o => o.value === filters.paymentMethod)?.label}</span>}
                  {filters.invoiceStatus && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{statusOptions.find(o => o.value === filters.invoiceStatus)?.label}</span>}
                  {filters.search && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Rech. « {filters.search} »</span>}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--bg-sunken)' }}>
              <div className={`mx-auto bg-white text-slate-900 p-8 shadow-2xl ${a4Class}`} ref={printRef}>
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                  <p className="text-[10px]">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</p>
                  <p className="text-[10px]">MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE</p>
                  <h1 className="text-base font-black uppercase text-slate-900">{schoolName}</h1>
                  <p className="text-[9px] text-slate-500">{[schoolAddress, [schoolPhone, schoolEmail].filter(Boolean).join(' — ')].filter(Boolean).join('  |  ')}</p>
                </div>
                <h2 className="text-center text-lg font-black uppercase tracking-wider mb-1">{reportData.title}</h2>
                <p className="text-center text-[10px] text-slate-500 mb-4">{reportData.subtitle}</p>
                <table className="w-full border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      {reportData.columns.map(c => (
                        <th key={c.key} className={`border border-slate-300 p-1.5 font-bold ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row, i) => (
                      <tr key={i} className="even:bg-slate-50">
                        {reportData.columns.map(c => (
                          <td key={c.key} className={`border border-slate-300 p-1.5 ${c.align === 'right' ? 'text-right font-mono font-bold' : c.align === 'center' ? 'text-center' : ''}`}>
                            {formatCell(row, c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {reportData.totals && (
                      <tr className="bg-slate-200 font-black">
                        {reportData.columns.map(c => (
                          <td key={c.key} className={`border border-slate-300 p-1.5 ${c.align === 'right' ? 'text-right font-mono' : ''}`}>
                            {formatCell(reportData.totals, c)}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="mt-8 text-right text-[10px]">
                  <p>Fait à {lieu}, le {new Date().toLocaleDateString('fr-FR')}</p>
                  <p className="font-black mt-4">{signataireName}</p>
                  <p>{signataireRole}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {loading ? 'Chargement...' : `${reportData.rows.length} ligne(s) · ${Math.max(1, Math.ceil(reportData.rows.length / (orientation === 'landscape' ? 22 : 36)))} page(s) estimée(s) · ${currency}`}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} disabled={loading} className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black">
                  <Printer className="w-3.5 h-3.5" /> Imprimer
                </button>
                <button onClick={exportDOCX} disabled={loading || generating === 'docx'} className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black">
                  {generating === 'docx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileType className="w-3.5 h-3.5" />} Word
                </button>
                <button onClick={exportXLSX} disabled={loading || generating === 'xlsx'} className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black">
                  {generating === 'xlsx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel
                </button>
                <button onClick={exportPDF} disabled={loading || generating === 'pdf'} className="btn-primary flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white">
                  {generating === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
