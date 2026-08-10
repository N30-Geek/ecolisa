import { LocalDatabaseService, DepenseCaisse } from './localDatabase';
import { convertCurrency, formatCurrency } from '../utils/currency';
import {
  Eleve,
  ClasseScolaire,
  AnneeScolaireConfig,
  Discipline,
  MembrePersonnel,
  FactureEleve,
  TransactionPaiement,
  Cote,
  Presence,
  SchoolEvent,
} from '../types';

export interface DashboardData {
  loading: boolean;
  students: Eleve[];
  classes: ClasseScolaire[];
  schoolYears: AnneeScolaireConfig[];
  subjects: Discipline[];
  staff: MembrePersonnel[];
  invoices: FactureEleve[];
  payments: TransactionPaiement[];
  expenses: DepenseCaisse[];
  cotes: Cote[];
  presences: Presence[];
  schoolEvents: SchoolEvent[];
  selectedYear: AnneeScolaireConfig | undefined;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  girlsCount: number;
  boysCount: number;
  totalStaff: number;
  totalSubjects: number;
  totalClasses: number;
  totalRevenue: number;
  totalInvoiced: number;
  totalPaid: number;
  totalUnpaid: number;
  totalExpenses: number;
  cashBalance: number;
  recoveryRate: number;
  averageScore: number;
  presenceRate: number;
  studentsByCycle: { name: string; code: string; value: number; color: string }[];
  monthlyPerformance: { mois: string; moyenneCotes: number; tauxPresence: number }[];
  quarterlyFinance: { trimestre: string; encaisse: number; objectif: number }[];
  recentActivity: {
    id: string;
    nomAuteur: string;
    titre: string;
    ilYA: string;
    necessiteApprobation: boolean;
    avatarUrl: string;
  }[];
  upcomingEvents: {
    id: string;
    titre: string;
    heureLieu: string;
    dateJour: string;
  }[];
  paymentMethods: { method: string; amount: number; pct: number }[];
  topUnpaidInvoices: { nomEleve: string; montant: number }[];
  attendanceByCycle: {
    id: string;
    nom: string;
    code: string;
    isPresentInSchool: boolean;
    hasPointage: boolean;
    effectifTotal: number;
    presentsTotal: number;
    fillesTotal: number;
    fillesPresents: number;
    garconsTotal: number;
    garconsPresents: number;
  }[];
}

const MONTH_LABELS = ['Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil'];

/**
 * Normalise intelligemment les cycles en RDC :
 * Maternelle, Primaire, CTEB (7e-8e), Humanités (1e-4e)
 */
const normalizeCycle = (cycleStr?: string, classNameStr?: string): string => {
  const target = `${cycleStr || ''} ${classNameStr || ''}`.toUpperCase();
  if (target.includes('MATERNELLE') || target.includes('PRESCHOOL') || target.includes('MAT')) return 'MATERNELLE';
  if (target.includes('PRIMAIRE') || target.includes('PRI')) return 'PRIMAIRE';
  if (target.includes('CTEB') || target.includes('7') || target.includes('8') || target.includes('SECONDAIRE BASE')) return 'CTEB';
  if (target.includes('HUMANITE') || target.includes('HUMAN') || target.includes('MATH') || target.includes('BIO') || target.includes('COMMER')) return 'HUMANITES';
  if (target.includes('SECONDAIRE')) return 'CTEB';
  return 'PRIMAIRE'; // Fallback par défaut sur le cycle principal
};

const cycleName = (cycleId?: string) => {
  const c = normalizeCycle(cycleId);
  const m: Record<string, string> = {
    MATERNELLE: 'Cycle Maternelle',
    PRIMAIRE: 'Cycle Primaire',
    CTEB: 'Secondaire CTEB (7è-8è)',
    HUMANITES: 'Humanités (1è-4è)',
  };
  return m[c] || 'Cycle Primaire';
};

const cycleColor = (cycleId?: string) => {
  const c = normalizeCycle(cycleId);
  const m: Record<string, string> = {
    MATERNELLE: '#6366f1',
    PRIMAIRE: '#10b981',
    CTEB: '#f59e0b',
    HUMANITES: '#818cf8',
  };
  return m[c] || '#10b981';
};

const parseMonth = (d?: string) => {
  if (!d) return -1;
  const iso = d.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Number(iso[2]) - 1;
  const parts = d.split(/[-/]/).filter(Boolean);
  if (parts.length >= 2) return Number(parts[1]) - 1;
  return -1;
};

const periodFromMonth = (monthIndex: number) => {
  if (monthIndex >= 8 && monthIndex <= 10) return 'T1';
  if (monthIndex >= 11 || monthIndex <= 1) return 'T2';
  if (monthIndex >= 2 && monthIndex <= 4) return 'T3';
  if (monthIndex >= 5 && monthIndex <= 7) return 'T4';
  return 'T1';
};

const quarterName = (q: string, year: string) => {
  if (q === 'T1' && year) return `${q} '${year.slice(-2)}`;
  return q;
};

export const fetchDashboardData = async (targetSchoolYearId?: string): Promise<DashboardData> => {
  const [allStudents, allClasses, schoolYears, subjects, staff, allInvoices, allPayments, expenses, allCotes, allPresences, allSchoolEvents] =
    await Promise.all([
      LocalDatabaseService.getEleves(),
      LocalDatabaseService.getClasses(),
      LocalDatabaseService.getSchoolYears(),
      LocalDatabaseService.getSubjects(),
      LocalDatabaseService.getStaff(),
      LocalDatabaseService.getInvoices(),
      LocalDatabaseService.getPayments(),
      LocalDatabaseService.getExpenses(),
      LocalDatabaseService.getCotes(),
      LocalDatabaseService.getPresences(),
      LocalDatabaseService.getSchoolEvents(),
    ]);

  let selectedYear: AnneeScolaireConfig | undefined;
  if (targetSchoolYearId && targetSchoolYearId !== 'ALL') {
    selectedYear = schoolYears.find(y => y.id === targetSchoolYearId || y.nom === targetSchoolYearId);
  }
  if (!selectedYear) {
    selectedYear = schoolYears.find((y) => y.statut === 'EN_COURS') || schoolYears[0];
  }

  const activeYearId = selectedYear?.id;
  const isAllYears = targetSchoolYearId === 'ALL';

  const classes = (activeYearId && !isAllYears)
    ? allClasses.filter(c => c.schoolYearId === activeYearId || !c.schoolYearId)
    : allClasses;

  const activeClassIds = new Set(classes.map(c => c.id));

  const students = (activeYearId && !isAllYears)
    ? allStudents.filter(s => s.schoolYearId === activeYearId || (s as any).anneeScolaireId === activeYearId || activeClassIds.has(s.classId) || !s.schoolYearId)
    : allStudents;

  const invoices = (activeYearId && !isAllYears)
    ? allInvoices.filter(inv => inv.anneeScolaireId === activeYearId || inv.anneeScolaire === selectedYear?.nom || !inv.anneeScolaireId)
    : allInvoices;

  const activeInvoiceIds = new Set(invoices.map(inv => inv.id));

  const payments = (activeYearId && !isAllYears)
    ? allPayments.filter(p => p.anneeScolaireId === activeYearId || activeInvoiceIds.has(p.invoiceId) || !p.anneeScolaireId)
    : allPayments;

  const cotes = (activeYearId && !isAllYears)
    ? allCotes.filter(c => c.anneeScolaireId === activeYearId || activeClassIds.has(c.classeId || '') || !c.anneeScolaireId)
    : allCotes;

  const presences = (activeYearId && !isAllYears)
    ? allPresences.filter(p => p.anneeScolaireId === activeYearId || activeClassIds.has(p.classeId || '') || !p.anneeScolaireId)
    : allPresences;

  const schoolEvents = (activeYearId && !isAllYears)
    ? allSchoolEvents.filter(ev => ev.anneeScolaireId === activeYearId || !ev.anneeScolaireId)
    : allSchoolEvents;

  return {
    loading: false,
    students,
    classes,
    schoolYears,
    subjects,
    staff,
    invoices,
    payments,
    expenses,
    cotes,
    presences,
    schoolEvents,
    selectedYear,
  };
};

export const computeDashboardStats = (
  data: DashboardData,
  displayCurrency: 'USD' | 'CDF' = 'USD',
  exchangeRate: number = 2850
): DashboardStats => {
  const { students, classes, staff, subjects, invoices, payments, expenses, cotes, presences, schoolEvents, selectedYear } = data;

  const toDisplay = (amount: number, source: 'USD' | 'CDF' | string = 'USD') =>
    convertCurrency(amount, source, displayCurrency, exchangeRate);

  const activeStudentList = students.filter((s) => s.statut === 'ACTIF' || !s.statut);
  const totalStudents = students.length;
  const activeStudents = activeStudentList.length;
  const girlsCount = activeStudentList.filter((s) => s.sexe === 'F').length;
  const boysCount = activeStudentList.filter((s) => s.sexe === 'M' || !s.sexe).length;

  const totalRevenue = payments.reduce((sum, p) => sum + toDisplay((p.montantPaye || p.montantPaye === 0 ? p.montantPaye : (p as any).montant) || 0, ((p as any).devise || (p as any).currency || 'USD')), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + toDisplay(inv.montantTotal || 0, ((inv as any).devise || (inv as any).currency || 'USD')), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + toDisplay(inv.montantPaye || 0, ((inv as any).devise || (inv as any).currency || 'USD')), 0);
  const totalUnpaid = Math.max(0, totalInvoiced - totalPaid);
  const totalExpenses = expenses.reduce((sum, e) => sum + toDisplay(e.montant || 0, (e.devise || 'USD')), 0);
  const cashBalance = totalRevenue - totalExpenses;
  const recoveryRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 1000) / 10 : 0;

  const avgScore =
    cotes.length > 0
      ? Math.round((cotes.reduce((sum, c) => sum + (c.score / (c.maxScore || 100)) * 100, 0) / cotes.length) * 10) / 10
      : 0;

  const presentCount = presences.filter((p) => p.statut === 'PRESENT' || p.statut === 'RETARD').length;
  const presenceRate = presences.length > 0 ? Math.round((presentCount / presences.length) * 1000) / 10 : 0;

  // Répartition des élèves par cycle
  const studentsByCycleMap = new Map<string, number>();
  for (const s of activeStudentList) {
    const cls = classes.find((c) => c.id === s.classId);
    const cycle = normalizeCycle(cls?.cycleId, cls?.nom || s.nomClasse);
    studentsByCycleMap.set(cycle, (studentsByCycleMap.get(cycle) || 0) + 1);
  }

  const cyclesOrder = ['MATERNELLE', 'PRIMAIRE', 'CTEB', 'HUMANITES'];
  const studentsByCycle = cyclesOrder.map((cycle) => ({
    name: cycleName(cycle),
    code: cycle,
    value: studentsByCycleMap.get(cycle) || 0,
    color: cycleColor(cycle),
  }));

  // Performance mensuelle
  const hasGlobalCotes = cotes.length > 0;

  const monthlyPerformance = MONTH_LABELS.map((mois, idx) => {
    const monthCotes = cotes.filter((c) => parseMonth(c.dateCote) === idx);
    const monthPresences = presences.filter((p) => parseMonth(p.dateJour) === idx);
    const moyenneCotes =
      monthCotes.length > 0
        ? Math.round((monthCotes.reduce((sum, c) => sum + (c.score / (c.maxScore || 100)) * 100, 0) / monthCotes.length) * 10) / 10
        : 0;
    const present = monthPresences.filter((p) => p.statut === 'PRESENT' || p.statut === 'RETARD').length;
    const tauxPresence = monthPresences.length > 0
      ? Math.round((present / monthPresences.length) * 1000) / 10
      : 0;
    return { mois, moyenneCotes, tauxPresence };
  });

  const yearStr = selectedYear?.debut ? new Date(selectedYear.debut).getFullYear().toString() : '2026';

  const financeByQuarter = new Map<string, { encaisse: number; objectif: number }>();
  for (const p of payments) {
    const q = periodFromMonth(parseMonth((p as any).dateCreation || (p as any).datePaiement || p.dateCreation));
    const name = quarterName(q, yearStr);
    const cur = financeByQuarter.get(name) || { encaisse: 0, objectif: 0 };
    cur.encaisse += toDisplay((p.montantPaye || p.montantPaye === 0 ? p.montantPaye : (p as any).montant) || 0, ((p as any).devise || (p as any).currency || 'USD'));
    financeByQuarter.set(name, cur);
  }
  for (const inv of invoices) {
    const q = periodFromMonth(parseMonth(inv.dateEcheance));
    const name = quarterName(q, yearStr);
    const cur = financeByQuarter.get(name) || { encaisse: 0, objectif: 0 };
    cur.objectif += toDisplay(inv.montantTotal || 0, ((inv as any).devise || (inv as any).currency || 'USD'));
    financeByQuarter.set(name, cur);
  }

  const quarterOrder = ['T1', 'T2', 'T3', 'T4'];
  const quarterlyFinance = quarterOrder.map((q) => {
    const name = quarterName(q, yearStr);
    const v = financeByQuarter.get(name) || { encaisse: 0, objectif: 0 };
    return { trimestre: name, encaisse: Math.round(v.encaisse), objectif: Math.round(v.objectif) };
  });

  // Activités réelles dynamiques (issue uniquement des données enregistrées dans l'année en cours)
  const recentActivity: {
    id: string;
    nomAuteur: string;
    titre: string;
    ilYA: string;
    necessiteApprobation: boolean;
    avatarUrl: string;
  }[] = [];

  for (const p of payments.slice(0, 4)) {
    recentActivity.push({
      id: `pay-${p.id}`,
      nomAuteur: p.nomCaissier || 'Service Caisse',
      titre: `a perçu un versement de ${formatCurrency((p.montantPaye || 0), displayCurrency, ((p as any).devise || (p as any).currency || 'USD'), exchangeRate)}`,
      ilYA: p.dateCreation ? new Date(p.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Récemment',
      necessiteApprobation: false,
      avatarUrl: `https://ui-avatars.com/api/?name=Caisse&background=10b981&color=fff&size=64`,
    });
  }

  for (const s of students.slice(0, 3)) {
    const studentDate = (s as any).dateCreation || (s as any).registrationDate;
    recentActivity.push({
      id: `std-${s.id}`,
      nomAuteur: s.nomParent || 'Service Inscriptions',
      titre: `a réinscrit l'élève ${s.prenom} ${s.nom} (${s.nomClasse || 'Classe'})`,
      ilYA: studentDate ? new Date(studentDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Récemment',
      necessiteApprobation: false,
      avatarUrl: s.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.prenom + ' ' + s.nom)}&background=6366f1&color=fff&size=64`,
    });
  }

  const upcomingEvents = schoolEvents.map((ev) => {
    const parts = (ev.dateDebut || '').split(' ');
    const dateJour = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : ev.dateDebut;
    return {
      id: ev.id,
      titre: ev.titre,
      heureLieu: ev.subtitre || '—',
      dateJour,
    };
  });

  const methodLabels: Record<string, string> = {
    CASH: 'Caisse Espèces École',
    FLEXPAY_MPESA: 'Mobile Money (M-Pesa Kinshasa)',
    FLEXPAY_ORANGE: 'Orange Money RDC',
    FLEXPAY_AIRTEL: 'Airtel Money RDC',
    FLUTTERWAVE_CARTE: 'Carte Bancaire',
  };

  const paymentTotals = new Map<string, number>();
  for (const p of payments) {
    const raw = (p as any).moyenPaiement || (p as any).methode || 'CASH';
    const method = methodLabels[raw] || raw;
    const amount = toDisplay(
      (p as any).montantPaye ?? (p as any).montant ?? 0,
      ((p as any).devise || (p as any).currency || 'USD')
    );
    paymentTotals.set(method, (paymentTotals.get(method) || 0) + amount);
  }
  const totalForPct = Math.max(1, totalRevenue);
  const paymentMethods = Array.from(paymentTotals.entries())
    .map(([method, amount]) => ({
      method,
      amount: Math.round(amount),
      pct: Math.round((amount / totalForPct) * 1000) / 10,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (paymentMethods.length === 0) {
    paymentMethods.push({ method: 'Caisse Espèces École', amount: totalRevenue, pct: 100 });
  }

  const topUnpaidInvoices = invoices
    .map((inv) => ({
      nomEleve: (inv as any).nomEleve || inv.studentId || 'Élève Enregistré',
      montant: Math.round(toDisplay((inv.montantTotal || 0) - (inv.montantPaye || 0), ((inv as any).devise || (inv as any).currency || 'USD'))),
    }))
    .filter((inv) => inv.montant > 0)
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 5);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPresences = presences.filter(p => p.dateJour === todayStr || (p.dateJour && p.dateJour.startsWith(todayStr)));
  const hasTodayPresences = todayPresences.length > 0;

  const attendanceByCycle = ['MATERNELLE', 'PRIMAIRE', 'CTEB', 'HUMANITES'].map((cycle) => {
    const cycleStudents = activeStudentList.filter((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      return normalizeCycle(cls?.cycleId, cls?.nom || s.nomClasse) === cycle;
    });
    const count = cycleStudents.length;
    const filles = cycleStudents.filter((s) => s.sexe === 'F').length;
    const garcons = count - filles;

    const cycleStudentIds = new Set(cycleStudents.map(s => s.id));
    const cycleTodayPresences = todayPresences.filter(p => cycleStudentIds.has(p.eleveId));

    const hasPointage = cycleTodayPresences.length > 0;
    let presentsTotal = 0;
    let fillesPresents = 0;
    let garconsPresents = 0;

    if (hasPointage) {
      presentsTotal = cycleTodayPresences.filter(p => p.statut === 'PRESENT' || p.statut === 'RETARD').length;
      fillesPresents = cycleTodayPresences.filter(p => {
        if (p.statut !== 'PRESENT' && p.statut !== 'RETARD') return false;
        const st = cycleStudents.find(s => s.id === p.eleveId);
        return st?.sexe === 'F';
      }).length;
      garconsPresents = presentsTotal - fillesPresents;
    }

    return {
      id: cycle.toLowerCase(),
      nom: `${cycleName(cycle)}`,
      code: cycle,
      isPresentInSchool: count > 0,
      hasPointage,
      effectifTotal: count,
      presentsTotal,
      fillesTotal: filles,
      fillesPresents,
      garconsTotal: garcons,
      garconsPresents,
    };
  });

  return {
    totalStudents,
    activeStudents,
    girlsCount,
    boysCount,
    totalStaff: staff.length,
    totalSubjects: subjects.length,
    totalClasses: classes.length,
    totalRevenue,
    totalInvoiced,
    totalPaid,
    totalUnpaid,
    totalExpenses,
    cashBalance,
    recoveryRate,
    averageScore: avgScore,
    presenceRate,
    studentsByCycle,
    monthlyPerformance,
    quarterlyFinance,
    recentActivity,
    upcomingEvents,
    paymentMethods,
    topUnpaidInvoices,
    attendanceByCycle,
  };
};
