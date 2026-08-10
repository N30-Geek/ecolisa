/**
 * ECOLISA LocalDatabaseService — MOTEUR DE STOCKAGE SQLITE EXCLUSIF
 * ─────────────────────────────────────────────────────────────────────────────
 * En production (Electron), toutes les données métier sont persistées
 * EXCLUSIVEMENT dans la base SQLite locale via IPC (better-sqlite3).
 * Aucun `localStorage` JavaScript n'est utilisé pour stocker des données métier.
 */

import {
  Eleve,
  ClasseScolaire,
  Discipline,
  FactureEleve,
  TransactionPaiement,
  OperationCaisse,
  TypeFraisScolaire,
  CompteComptable,
  JournalComptable,
  EcritureComptable,
  DocumentScolaire,
  MembrePersonnel,
  LicenceOffline,
  StatutSynchro,
  RôleSystème,
  AnneeScolaireConfig,
  UserAccount,
  RolePermissions,
  Cote,
  Presence,
  SchoolEvent,
  SalleConfig,
} from '../types';

export type DepenseCaisse = OperationCaisse;

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export interface UserSession {
  id: string;
  email: string;
  nom: string;
  role: RôleSystème;
  token: string;
  pinCode?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Acces a l'API Electron IPC SQLite
// ─────────────────────────────────────────────────────────────────────────────
const api = () => (window as any).electronAPI as Record<string, (...args: any[]) => Promise<any>> | undefined;
const isElectron = () => !!(window as any).electronAPI?.isElectron;

// ─────────────────────────────────────────────────────────────────────────────
//  MOTEUR SQLITE VIRTUELE EN MÉMOIRE (pour mode Web Preview hors Electron)
//  Aucune utilisation de localStorage pour les collections métier.
// ─────────────────────────────────────────────────────────────────────────────
const memoryDb: Record<string, any[]> = {
  schoolYears: [],
  classes: [],
  eleves: [],
  invoices: [],
  payments: [],
  expenses: [],
  feeTypes: [],
  cashOperations: [],
  comptes: [],
  journaux: [],
  ecritures: [],
  staff: [],
  cotes: [],
  presences: [],
  schoolEvents: [],
  subjects: [],
  users: [],
  salles: [],
};

const memGet = <T>(key: string): T[] => memoryDb[key] as T[] || [];
const memAdd = <T extends { id: string }>(key: string, item: T): T => {
  if (!memoryDb[key]) memoryDb[key] = [];
  const idx = memoryDb[key].findIndex((i) => i.id === item.id);
  if (idx === -1) memoryDb[key].push(item);
  else memoryDb[key][idx] = item;
  return item;
};
const memUpdate = <T extends { id: string }>(key: string, id: string, updates: Partial<T>): T | null => {
  if (!memoryDb[key]) return null;
  const idx = memoryDb[key].findIndex((i) => i.id === id);
  if (idx === -1) return null;
  memoryDb[key][idx] = { ...memoryDb[key][idx], ...updates };
  return memoryDb[key][idx];
};
const memDelete = (key: string, id: string): void => {
  if (memoryDb[key]) {
    memoryDb[key] = memoryDb[key].filter((i) => i.id !== id);
  }
};

const memFilter = <T>(items: T[], filters?: Record<string, any>): T[] => {
  if (!filters) return items;
  return items.filter((item: any) => {
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null) continue;
      if (item[k] !== v) return false;
    }
    return true;
  });
};

const safeElectronCall = async <T>(call: (() => any) | undefined, fallbackKey?: string): Promise<T> => {
  if (isElectron() && call) {
    try {
      const res = await call();
      if (res !== undefined && res !== null) return res as T;
    } catch (e) {
      console.warn('[DB SQLite] Échec IPC Electron :', e);
    }
  }
  return (fallbackKey ? (memoryDb[fallbackKey] || []) : null) as unknown as T;
};

// ─────────────────────────────────────────────────────────────────────────────
//  PERMISSIONS PAR ROLE
// ─────────────────────────────────────────────────────────────────────────────
const PERMISSIONS_MAP: Record<string, RolePermissions> = {
  PROMOTEUR_ADMIN: {
    role: 'PROMOTEUR_ADMIN' as RôleSystème,
    label: 'Promoteur & Administrateur General',
    description: "Acces sans restriction a l'ensemble du logiciel, finances, personnel et parametres systeme.",
    allowedTabs: ['dashboard','students','apprenants','classes','subjects','years','teachers','schedule','grades','examens','invoices','payroll','expenses','discipline','hr','leaves','infirmerie','cantine','ressources','transport','library','documents','messages','license','settings'],
    canEditConfig: true, canManageUsers: true, canManageFinance: true, canManagePedagogy: true, canEnterGrades: true
  },
  PREFET_DIRECTEUR: {
    role: 'PREFET_DIRECTEUR' as RôleSystème,
    label: "Prefet des Etudes / Directeur d'Etablissement",
    description: 'Pilotage pedagogique, rapports officiels, suivi des eleves, effectifs et personnel.',
    allowedTabs: ['dashboard','students','apprenants','classes','subjects','years','teachers','schedule','grades','examens','discipline','hr','leaves','infirmerie','cantine','transport','library','documents','messages'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: true, canEnterGrades: true
  },
  DIRECTEUR_ETUDES: {
    role: 'DIRECTEUR_ETUDES' as RôleSystème,
    label: 'Directeur des Etudes (DE)',
    description: "Gestion des programmes, grille d'horaires, cotes, bulletins et examens.",
    allowedTabs: ['dashboard','students','apprenants','classes','subjects','years','schedule','grades','examens','documents'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: true, canEnterGrades: true
  },
  DIRECTEUR_DISCIPLINE: {
    role: 'DIRECTEUR_DISCIPLINE' as RôleSystème,
    label: 'Directeur de Discipline (DD)',
    description: 'Registre de discipline, suivi du comportement, autorisations de sortie et absences.',
    allowedTabs: ['dashboard','students','discipline','schedule','documents'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: false
  },
  COMPTABLE: {
    role: 'COMPTABLE' as RôleSystème,
    label: 'Comptable Intendant General',
    description: 'Gestion de la caisse, encaissements minerval, facturation, paie du personnel et depenses.',
    allowedTabs: ['dashboard','invoices','payroll','expenses','documents','students'],
    canEditConfig: false, canManageUsers: false, canManageFinance: true, canManagePedagogy: false, canEnterGrades: false
  },
  TITULAIRE: {
    role: 'TITULAIRE' as RôleSystème,
    label: 'Enseignant Titulaire de Classe',
    description: 'Saisie des cotes de sa promotion, presences, journal de classe et bulletins.',
    allowedTabs: ['dashboard','students','grades','schedule','classes'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: true
  },
  ENSEIGNANT: {
    role: 'ENSEIGNANT' as RôleSystème,
    label: 'Enseignant / Professeur de Cours',
    description: "Saisie des notes d'interrogations et d'examens pour ses matieres attribuees.",
    allowedTabs: ['dashboard','grades','schedule'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: true
  },
  PARENT_ELEVE: {
    role: 'PARENT_ELEVE' as RôleSystème,
    label: 'Espace Parent & Tuteur',
    description: 'Consultation du bulletin numerique et suivi des paiements de scolarite.',
    allowedTabs: ['dashboard','grades','invoices'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: false
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SERVICE PRINCIPAL SQLITE EXCLUSIF
// ─────────────────────────────────────────────────────────────────────────────
export class LocalDatabaseService {
  private static _currentUser: UserSession | null = null;

  public static async init(): Promise<void> {
    // 1. Purger toutes les clés de données métier historiques du localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ecolisa_') && !k.startsWith('ecolisa_config_') && k !== 'ecolisa_theme') {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      if (keysToRemove.length > 0) {
        console.log(`[DB SQLite] Purge effectuee de ${keysToRemove.length} anciennes cles localStorage.`);
      }
    } catch (e) {}

    // 2. Initialiser les structures mémoire vides (mode Web hors Electron uniquement)
    if (!isElectron()) {
      this.seedMemoryStore();
    }

    // 3. Restaurer la session depuis SQLite si Electron disponible
    if (isElectron()) {
      try {
        const sess = await api()!.getCurrentSession();
        if (sess) this._currentUser = sess;
      } catch (e) {
        console.warn('[DB SQLite] Erreur de restauration de la session :', e);
      }
    }
  }

  public static seedMemoryStore(): void {
    console.log('[ECOLISA] Base propre initialisée — aucune donnée de démonstration.');

    // Base 100% vide — toutes les collections initialisées à zéro
    memoryDb.schoolYears = [];
    memoryDb.classes = [];
    memoryDb.salles = [];
    memoryDb.subjects = [];
    memoryDb.staff = [];
    memoryDb.eleves = [];
    memoryDb.invoices = [];
    memoryDb.payments = [];
    memoryDb.cotes = [];
    memoryDb.presences = [];
    memoryDb.expenses = [];
    console.log('[ECOLISA] ✅ Base de données initialisée à propre (0 élèves, 0 enseignants, 0 classes).');
  }

  public static async resetDatabase(): Promise<void> {
    if (isElectron()) {
      await api()?.setCurrentSession(null);
      await api()?.deleteConfig('onboarding_completed');
      await api()?.deleteConfig('school_config');
    }
    localStorage.removeItem('ecolisa_theme');
    this._currentUser = null;
  }

  // ── CONFIG (onboarding, school_config) ────────────────────────────────────
  public static async getConfig(key: string): Promise<any> {
    if (isElectron()) {
      try {
        return await api()?.getConfig(key);
      } catch (e) {
        console.warn(`[DB SQLite] Erreur getConfig (${key}) :`, e);
        return null;
      }
    }
    try {
      const raw = localStorage.getItem(`ecolisa_config_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public static async setConfig(key: string, value: any): Promise<void> {
    if (isElectron()) {
      try {
        await api()?.setConfig(key, value);
      } catch (e) {
        console.warn(`[DB SQLite] Erreur setConfig (${key}) :`, e);
      }
      return;
    }
    try {
      localStorage.setItem(`ecolisa_config_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn(`[DB Web] Erreur setConfig (${key}) :`, e);
    }
  }

  // ── SESSION UTILISATEUR ───────────────────────────────────────────────────
  public static getCurrentUser(): UserSession | null {
    return this._currentUser;
  }

  public static async setCurrentUser(user: UserSession | null): Promise<void> {
    this._currentUser = user;
    if (isElectron()) {
      await api()?.setCurrentSession(user);
    }
  }

  public static async logout(): Promise<void> {
    await this.setCurrentUser(null);
  }

  // ── UTILISATEURS (CRUD SQLITE) ───────────────────────────────────────────
  public static async getUsers(): Promise<UserAccount[]> {
    if (isElectron()) return (await api()?.getUsers()) || [];
    return memGet<UserAccount>('users');
  }

  public static async getUserByEmail(email: string): Promise<UserAccount | null> {
    if (isElectron()) return api()?.getUserByEmail(email) || null;
    return memGet<UserAccount>('users').find((u) => u.email === email) || null;
  }

  public static async verifyCredentials(email: string, password: string): Promise<UserAccount | null> {
    if (isElectron()) return api()?.verifyCredentials(email, password) || null;
    const user = memGet<any>('users').find((u: any) => u.email === email);
    return user && user.password === password ? user : null;
  }

  public static async addUser(user: UserAccount & { password?: string }): Promise<UserAccount | null> {
    if (isElectron()) return api()?.addUser(user) || null;
    return memAdd('users', user);
  }

  public static async updateUser(id: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    if (isElectron()) return api()?.updateUser(id, updates) || null;
    return memUpdate<UserAccount>('users', id, updates);
  }

  public static async deleteUser(id: string): Promise<void> {
    if (isElectron()) { await api()?.deleteUser(id); return; }
    memDelete('users', id);
  }

  public static async authenticateUser(email: string, pinCode?: string): Promise<UserAccount | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    if (user.pinCode && pinCode && user.pinCode !== pinCode) return null;
    return user;
  }

  // ── ANNEES SCOLAIRES (SQLITE EXCLUSIF) ────────────────────────────────────
  public static async getSchoolYears(): Promise<AnneeScolaireConfig[]> {
    return safeElectronCall<AnneeScolaireConfig[]>(() => api()?.getSchoolYears(), 'schoolYears');
  }

  public static async addSchoolYear(year: AnneeScolaireConfig): Promise<AnneeScolaireConfig | null> {
    const fromDb = await safeElectronCall<AnneeScolaireConfig | null>(() => api()?.addSchoolYear(year));
    const stored = fromDb || year;
    return memAdd('schoolYears', stored);
  }

  public static async updateSchoolYear(id: string, updates: Partial<AnneeScolaireConfig>): Promise<AnneeScolaireConfig | null> {
    const fromDb = await safeElectronCall<AnneeScolaireConfig | null>(() => api()?.updateSchoolYear(id, updates));
    if (fromDb) return memUpdate<AnneeScolaireConfig>('schoolYears', id, fromDb);
    return memUpdate<AnneeScolaireConfig>('schoolYears', id, updates);
  }

  public static async deleteSchoolYear(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteSchoolYear(id));
    memDelete('schoolYears', id);

    // ── PURGE RELATIONNELLE EN CASCADE DANS SQLITE ──
    const classes = memGet<ClasseScolaire>('classes');
    classes.filter(c => c.schoolYearId === id).forEach(c => memDelete('classes', c.id));

    const eleves = memGet<Eleve>('eleves');
    eleves.filter(e => e.schoolYearId === id || (e as any).anneeScolaireId === id).forEach(e => memDelete('eleves', e.id));

    const invoices = memGet<FactureEleve>('invoices');
    const invoicesToDelete = invoices.filter(inv => inv.anneeScolaireId === id || inv.anneeScolaire === id);
    invoicesToDelete.forEach(inv => memDelete('invoices', inv.id));

    const payments = memGet<TransactionPaiement>('payments');
    payments.filter(p => p.anneeScolaireId === id || invoicesToDelete.some(inv => inv.id === p.invoiceId)).forEach(p => memDelete('payments', p.id));

    const cotes = memGet<Cote>('cotes');
    cotes.filter(c => c.anneeScolaireId === id).forEach(c => memDelete('cotes', c.id));

    const presences = memGet<Presence>('presences');
    presences.filter(p => p.anneeScolaireId === id).forEach(p => memDelete('presences', p.id));
  }

  // ── CLASSES (SQLITE EXCLUSIF) ─────────────────────────────────────────────
  public static async getClasses(yearId?: string): Promise<ClasseScolaire[]> {
    const merged = await safeElectronCall<ClasseScolaire[]>(() => api()?.getClasses(yearId), 'classes');
    const years = await this.getSchoolYears();
    if (years.length === 0) return []; // Aucune année scolaire -> 0 classe

    const validYearIds = new Set(years.map(y => y.id));
    const validMerged = merged.filter(c => !c.schoolYearId || validYearIds.has(c.schoolYearId));
    return yearId ? memFilter(validMerged, { schoolYearId: yearId }) : validMerged;
  }

  public static async addClass(cls: ClasseScolaire): Promise<ClasseScolaire | null> {
    const fromDb = await safeElectronCall<ClasseScolaire | null>(() => api()?.addClass(cls));
    const stored = fromDb || cls;
    return memAdd('classes', stored);
  }

  public static async updateClass(id: string, updates: Partial<ClasseScolaire>): Promise<ClasseScolaire | null> {
    const fromDb = await safeElectronCall<ClasseScolaire | null>(() => api()?.updateClass(id, updates));
    if (fromDb) return memUpdate<ClasseScolaire>('classes', id, fromDb);
    return memUpdate<ClasseScolaire>('classes', id, updates);
  }

  public static async deleteClass(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteClass(id));
    memDelete('classes', id);
  }

  // ── SALLES PHYSIQUES (SQLITE EXCLUSIF) ────────────────────────────────────
  public static async getSalles(cycleCode?: string): Promise<SalleConfig[]> {
    const merged = await safeElectronCall<SalleConfig[]>(() => api()?.getSalles?.(cycleCode), 'salles');
    return cycleCode ? memFilter(merged, { cycleCode }) : merged;
  }

  public static async addSalle(salle: SalleConfig): Promise<SalleConfig | null> {
    const fromDb = await safeElectronCall<SalleConfig | null>(() => api()?.addSalle?.(salle));
    const stored = fromDb || salle;
    return memAdd('salles', stored);
  }

  public static async updateSalle(id: string, updates: Partial<SalleConfig>): Promise<SalleConfig | null> {
    const fromDb = await safeElectronCall<SalleConfig | null>(() => api()?.updateSalle?.(id, updates));
    if (fromDb) return memUpdate<SalleConfig>('salles', id, fromDb);
    return memUpdate<SalleConfig>('salles', id, updates);
  }

  public static async deleteSalle(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteSalle?.(id));
    memDelete('salles', id);
  }

  // ── MATIERES (SQLITE EXCLUSIF) ────────────────────────────────────────────
  public static async getSubjects(): Promise<Discipline[]> {
    return safeElectronCall<Discipline[]>(() => api()?.getSubjects(), 'subjects');
  }

  public static async addSubject(s: Discipline): Promise<Discipline | null> {
    const fromDb = await safeElectronCall<Discipline | null>(() => api()?.addSubject(s));
    return memAdd('subjects', fromDb || s);
  }

  public static async updateSubject(id: string, updates: Partial<Discipline>): Promise<Discipline | null> {
    const fromDb = await safeElectronCall<Discipline | null>(() => api()?.updateSubject?.(id, updates));
    if (fromDb) return memUpdate<Discipline>('subjects', id, fromDb);
    return memUpdate<Discipline>('subjects', id, updates);
  }

  public static async deleteSubject(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteSubject(id));
    memDelete('subjects', id);
  }

  // ── COTES & EVALUATIONS (SQLITE EXCLUSIF) ─────────────────────────────────
  public static async getGrades(studentId?: string): Promise<any[]> {
    return safeElectronCall<any[]>(() => api()?.getGrades?.(studentId), 'grades');
  }

  public static async addGrade(g: any): Promise<any | null> {
    const fromDb = await safeElectronCall<any | null>(() => api()?.addGrade?.(g));
    return memAdd('grades', fromDb || g);
  }

  public static async saveCotes(cotes: Cote[]): Promise<void> {
    for (const c of cotes) {
      await safeElectronCall(() => api()?.addGrade?.(c));
      memAdd('grades', c);
    }
  }

  // ── ELEVES (SQLITE EXCLUSIF) ──────────────────────────────────────────────
  public static async getEleves(filters?: { classId?: string; schoolYearId?: string }): Promise<Eleve[]> {
    const merged = await safeElectronCall<Eleve[]>(() => api()?.getEleves(filters), 'eleves');
    if (!filters || (filters.schoolYearId === 'ALL' && !filters.classId)) {
      return merged;
    }

    const years = await this.getSchoolYears();
    const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
    const targetYearId = filters?.schoolYearId;

    let result = merged;
    if (targetYearId && targetYearId !== 'ALL') {
      result = result.filter(e => {
        if (!e.schoolYearId) return true;
        if (e.schoolYearId === targetYearId) return true;
        if (activeYear && (e.schoolYearId === activeYear.nom || e.schoolYearId === activeYear.id)) return true;
        const targetYearConfig = years.find(y => y.id === targetYearId || y.nom === targetYearId);
        if (targetYearConfig && (e.schoolYearId === targetYearConfig.id || e.schoolYearId === targetYearConfig.nom)) return true;
        return false;
      });
    }

    if (filters.classId) {
      result = result.filter(e => e.classId === filters.classId || e.nomClasse === filters.classId);
    }

    return result;
  }

  public static async addEleve(eleve: Eleve): Promise<Eleve | null> {
    const years = await this.getSchoolYears();
    const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
    if (activeYear && !eleve.schoolYearId) {
      eleve.schoolYearId = activeYear.id;
    }
    const fromDb = await safeElectronCall<Eleve | null>(() => api()?.addEleve(eleve));
    const stored = fromDb || eleve;
    return memAdd('eleves', stored);
  }

  public static async addStudent(eleve: Eleve): Promise<Eleve | null> {
    return this.addEleve(eleve);
  }

  public static async updateEleve(id: string, updates: Partial<Eleve>): Promise<Eleve | null> {
    const fromDb = await safeElectronCall<Eleve | null>(() => api()?.updateEleve(id, updates));
    if (fromDb) return memUpdate<Eleve>('eleves', id, fromDb);
    return memUpdate<Eleve>('eleves', id, updates);
  }

  public static async updateStudent(id: string, updates: Partial<Eleve>): Promise<Eleve | null> {
    return this.updateEleve(id, updates);
  }

  public static async deleteEleve(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteEleve(id));
    memDelete('eleves', id);
  }

  // ── FINANCES (SQLITE EXCLUSIF) ────────────────────────────────────────────

  private static compteProduitForCategorie(categorie?: string): string {
    if (categorie === 'FRAIS_MINERVAL') return 'cpt_minerval';
    if (categorie === 'FRAIS_INSCRIPTION' || categorie === 'FRAIS_REINSCRIPTION') return 'cpt_inscript';
    if (categorie === 'FRAIS_SCOLAIRES' || categorie === 'FRAIS_CONNEXES' || categorie === 'FRAIS_KITS_EQUIPEMENTS') return 'cpt_frais_ks';
    return 'cpt_produit';
  }

  public static async getInvoices(yearId?: string): Promise<FactureEleve[]> {
    const years = await this.getSchoolYears();
    if (years.length === 0) return []; // Aucune année scolaire -> 0 facture

    const targetYearId = yearId;

    const invoices = await safeElectronCall<FactureEleve[]>(() => api()?.getInvoices(targetYearId), 'invoices');
    if (!targetYearId) return invoices;

    const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
    return invoices.filter(inv => inv.anneeScolaireId === targetYearId || inv.anneeScolaire === targetYearId || inv.anneeScolaire === activeYear?.nom);
  }

  public static async addInvoice(inv: FactureEleve): Promise<FactureEleve | null> {
    const years = await this.getSchoolYears();
    const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
    if (activeYear && !inv.anneeScolaireId) {
      inv.anneeScolaireId = activeYear.id;
      inv.anneeScolaire = activeYear.nom;
    }
    inv.eleveId = inv.eleveId || inv.studentId || undefined;
    inv.lignes = Array.isArray(inv.lignes) ? inv.lignes : [];
    if (!inv.montantTotal && inv.lignes.length) {
      inv.montantTotal = inv.lignes.reduce((a, l) => a + (l.montant || 0), 0);
    }
    inv.montantPaye = inv.montantPaye || 0;
    inv.statut = inv.statut || 'NON_PAYE';
    inv.numeroFacture = inv.numeroFacture || `F-${uuid()}`;
    const fromDb = await safeElectronCall<FactureEleve | null>(() => api()?.addInvoice(inv));
    const stored = memAdd('invoices', fromDb || inv);

    if (!isElectron()) {
      const lignesEcriture: any[] = [];
      for (const l of (inv.lignes || [])) {
        const compteProduit = this.compteProduitForCategorie(l.categorie || 'PRODUIT');
        lignesEcriture.push({ compteId: 'cpt_client', debit: l.montant, credit: 0 });
        lignesEcriture.push({ compteId: compteProduit, debit: 0, credit: l.montant });
      }
      if (lignesEcriture.length) {
        await this.addEcriture({
          id: uuid(),
          journalCode: 'JV',
          date: inv.dateEcheance || new Date().toISOString(),
          reference: inv.id,
          libelle: `Facture ${inv.numeroFacture}`,
          lignes: lignesEcriture,
        } as EcritureComptable);
      }
    }
    return stored;
  }

  public static async updateInvoice(id: string, updates: Partial<FactureEleve>): Promise<FactureEleve | null> {
    const fromDb = await safeElectronCall<FactureEleve | null>(() => api()?.updateInvoice(id, updates));
    if (fromDb) return memUpdate<FactureEleve>('invoices', id, fromDb);
    return memUpdate<FactureEleve>('invoices', id, updates);
  }

  public static async deleteInvoice(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteInvoice(id));
    memDelete('invoices', id);
  }

  public static async getPayments(invoiceId?: string): Promise<TransactionPaiement[]> {
    const items = await safeElectronCall<TransactionPaiement[]>(() => api()?.getPayments(invoiceId), 'payments');
    return invoiceId ? items.filter(p => p.invoiceId === invoiceId) : items;
  }

  public static async addPayment(p: TransactionPaiement): Promise<TransactionPaiement | null> {
    const years = await this.getSchoolYears();
    const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
    if (activeYear && !p.anneeScolaireId) p.anneeScolaireId = activeYear.id;
    p.numeroRecu = p.numeroRecu || `R-${uuid()}`;
    p.jetonQrCode = p.jetonQrCode || p.id;
    p.montantPaye = p.montantPaye || 0;
    p.reference = p.reference || '';
    p.moyenPaiement = p.moyenPaiement || 'CASH';
    const fromDb = await safeElectronCall<TransactionPaiement | null>(() => api()?.addPayment(p));
    const stored = fromDb || p;

    if (!isElectron()) {
      const inv = memGet<FactureEleve>('invoices').find(i => i.id === p.invoiceId);
      if (inv) {
        const totalPaye = (inv.montantPaye || 0) + p.montantPaye;
        const statut = totalPaye >= inv.montantTotal ? 'PAYE' : totalPaye > 0 ? 'PARTIEL' : inv.statut;
        await this.updateInvoice(p.invoiceId, { montantPaye: totalPaye, statut });
      }

      const defaultAlloc = [{ feeTypeId: '', montant: p.montantPaye }];
      const allocations = p.allocations?.length ? p.allocations : defaultAlloc;

      // Récupération des catégories de frais pour la comptabilité par type
      const feeTypes = await this.getFeeTypes(p.anneeScolaireId);
      const feeCategories = allocations
        .map(a => feeTypes.find(f => f.id === a.feeTypeId)?.categorie)
        .filter(Boolean) as string[];
      const cashCategorie = feeCategories[0] || 'PAIEMENT';

      const cash: OperationCaisse = {
        id: uuid(),
        date: p.dateCreation || new Date().toISOString(),
        libelle: `Encaissement ${p.nomEleve} — ${p.numeroRecu}`.trim(),
        montant: p.montantPaye,
        devise: p.devise || 'USD',
        type: 'ENTREE',
        categorie: cashCategorie,
        modePaiement: p.moyenPaiement,
        reference: p.numeroRecu,
        caissier: p.nomCaissier,
        schoolYearId: p.anneeScolaireId,
        origine: 'PAYMENT',
        origineId: p.id,
      };
      await this.addCashOperation(cash);

      const lignesEcriture: any[] = [];
      for (const alloc of allocations) {
        if (inv) {
          // Paiement d'une facture : caisse vs créance client
          lignesEcriture.push({ compteId: 'cpt_caisse', debit: alloc.montant, credit: 0 });
          lignesEcriture.push({ compteId: 'cpt_client', debit: 0, credit: alloc.montant });
        } else {
          // Encaissement direct : caisse vs produit par catégorie de frais
          const ft = feeTypes.find(f => f.id === alloc.feeTypeId);
          const compteProduit = this.compteProduitForCategorie(ft?.categorie || 'PRODUIT');
          lignesEcriture.push({ compteId: 'cpt_caisse', debit: alloc.montant, credit: 0 });
          lignesEcriture.push({ compteProduit, debit: 0, credit: alloc.montant });
        }
      }
      await this.addEcriture({
        id: uuid(),
        journalId: 'jnl_caisse',
        journalCode: 'JC',
        date: cash.date,
        reference: p.numeroRecu,
        libelle: `Encaissement ${p.nomEleve || ''}`.trim(),
        lignes: lignesEcriture,
      } as EcritureComptable);
    }
    return memAdd('payments', stored);
  }

  public static async getExpenses(): Promise<DepenseCaisse[]> {
    return safeElectronCall<DepenseCaisse[]>(() => api()?.getExpenses(), 'expenses');
  }

  public static async addExpense(e: DepenseCaisse): Promise<DepenseCaisse | null> {
    e.montant = e.montant || 0;
    e.devise = e.devise || 'USD';
    e.categorie = e.categorie || 'GENERAL';
    e.modePaiement = e.modePaiement || 'CASH';
    e.date = e.date || new Date().toISOString();
    e.libelle = e.libelle || e.motif || '';
    e.caissier = e.caissier || e.validePar || '';
    const fromDb = await safeElectronCall<DepenseCaisse | null>(() => api()?.addExpense(e));
    const stored = fromDb || e;

    if (!isElectron()) {
      const cash: OperationCaisse = {
        id: uuid(),
        date: e.date,
        libelle: e.libelle,
        montant: e.montant,
        devise: e.devise,
        type: 'SORTIE',
        categorie: e.categorie,
        modePaiement: e.modePaiement,
        reference: e.reference,
        caissier: e.caissier,
        beneficiaire: e.beneficiaire,
        pieceJustificative: e.pieceJustificative,
        schoolYearId: e.schoolYearId || e.anneeScolaireId,
        origine: 'EXPENSE',
        origineId: e.id,
      };
      await this.addCashOperation(cash);
      const compteCharge = e.categorie === 'SALAIRES' ? 'cpt_salaire' : e.categorie === 'FOURNITURES' ? 'cpt_fournit' : 'cpt_charge_e';
      await this.addEcriture({
        id: uuid(),
        journalId: 'jnl_od',
        journalCode: 'JO',
        date: e.date,
        reference: e.id,
        libelle: e.libelle,
        lignes: [
          { compteId: compteCharge, debit: e.montant, credit: 0 },
          { compteId: 'cpt_caisse', debit: 0, credit: e.montant },
        ],
      } as EcritureComptable);
    }
    return memAdd('expenses', stored);
  }

  public static async deleteExpense(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteExpense(id));
    memDelete('expenses', id);
    const cashOps = memGet<OperationCaisse>('cashOperations');
    const toDelete = cashOps.filter(c => c.origine === 'EXPENSE' && c.origineId === id).map(c => c.id);
    toDelete.forEach(cid => memDelete('cashOperations', cid));
    const ecritures = memGet<EcritureComptable>('ecritures');
    const toDeleteE = ecritures.filter(ee => ee.reference === id).map(ee => ee.id);
    toDeleteE.forEach(eid => memDelete('ecritures', eid));
  }

  // ── TYPES DE FRAIS ────────────────────────────────────────────────────────
  public static async getFeeTypes(yearId?: string): Promise<TypeFraisScolaire[]> {
    const items = await safeElectronCall<TypeFraisScolaire[]>(() => api()?.getFeeTypes(yearId), 'feeTypes');
    return yearId ? items.filter(f => f.anneeScolaireId === yearId || f.schoolYearId === yearId) : items;
  }

  public static async addFeeType(ft: TypeFraisScolaire): Promise<TypeFraisScolaire | null> {
    const fromDb = await safeElectronCall<TypeFraisScolaire | null>(() => api()?.addFeeType(ft));
    return memAdd('feeTypes', fromDb || ft);
  }

  public static async updateFeeType(id: string, updates: Partial<TypeFraisScolaire>): Promise<TypeFraisScolaire | null> {
    const fromDb = await safeElectronCall<TypeFraisScolaire | null>(() => api()?.updateFeeType(id, updates));
    if (fromDb) return memUpdate<TypeFraisScolaire>('feeTypes', id, fromDb);
    return memUpdate<TypeFraisScolaire>('feeTypes', id, updates);
  }

  public static async deleteFeeType(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteFeeType(id));
    memDelete('feeTypes', id);
  }

  // ── CAISSE ────────────────────────────────────────────────────────────────
  public static async getCashOperations(filters?: { yearId?: string; type?: 'ENTREE' | 'SORTIE' }): Promise<OperationCaisse[]> {
    const items = await safeElectronCall<OperationCaisse[]>(() => api()?.getCashOperations(filters), 'cashOperations');
    if (!filters) return items;
    return items.filter(op => {
      if (filters.yearId && op.schoolYearId !== filters.yearId && op.anneeScolaireId !== filters.yearId) return false;
      if (filters.type && op.type !== filters.type) return false;
      return true;
    });
  }

  public static async addCashOperation(op: OperationCaisse): Promise<OperationCaisse | null> {
    op.id = op.id || uuid();
    op.devise = op.devise || 'USD';
    op.schoolYearId = op.schoolYearId || op.anneeScolaireId;
    const fromDb = await safeElectronCall<OperationCaisse | null>(() => api()?.addCashOperation(op));
    return memAdd('cashOperations', fromDb || op);
  }

  public static async deleteCashOperation(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteCashOperation(id));
    memDelete('cashOperations', id);
    const ecritures = memGet<EcritureComptable>('ecritures');
    const toDelete = ecritures.filter(e => e.piece === id).map(e => e.id);
    toDelete.forEach(eid => memDelete('ecritures', eid));
  }

  // ── PLAN COMPTABLE ────────────────────────────────────────────────────────
  public static async getComptes(): Promise<CompteComptable[]> {
    return safeElectronCall<CompteComptable[]>(() => api()?.getComptes(), 'comptes');
  }

  public static async addCompte(c: CompteComptable): Promise<CompteComptable | null> {
    const fromDb = await safeElectronCall<CompteComptable | null>(() => api()?.addCompte(c));
    return memAdd('comptes', fromDb || c);
  }

  public static async updateCompte(id: string, updates: Partial<CompteComptable>): Promise<CompteComptable | null> {
    const fromDb = await safeElectronCall<CompteComptable | null>(() => api()?.updateCompte(id, updates));
    if (fromDb) return memUpdate<CompteComptable>('comptes', id, fromDb);
    return memUpdate<CompteComptable>('comptes', id, updates);
  }

  public static async deleteCompte(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteCompte(id));
    memDelete('comptes', id);
  }

  // ── JOURNAUX ──────────────────────────────────────────────────────────────
  public static async getJournaux(): Promise<JournalComptable[]> {
    return safeElectronCall<JournalComptable[]>(() => api()?.getJournaux(), 'journaux');
  }

  public static async addJournal(j: JournalComptable): Promise<JournalComptable | null> {
    const fromDb = await safeElectronCall<JournalComptable | null>(() => api()?.addJournal(j));
    return memAdd('journaux', fromDb || j);
  }

  public static async updateJournal(id: string, updates: Partial<JournalComptable>): Promise<JournalComptable | null> {
    const fromDb = await safeElectronCall<JournalComptable | null>(() => api()?.updateJournal(id, updates));
    if (fromDb) return memUpdate<JournalComptable>('journaux', id, fromDb);
    return memUpdate<JournalComptable>('journaux', id, updates);
  }

  public static async deleteJournal(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteJournal(id));
    memDelete('journaux', id);
  }

  // ── ÉCRITURES COMPTABLES ──────────────────────────────────────────────────
  public static async getEcritures(filters?: { compteId?: string; journalId?: string; dateFrom?: string; dateTo?: string }): Promise<EcritureComptable[]> {
    return safeElectronCall<EcritureComptable[]>(() => api()?.getEcritures(filters), 'ecritures');
  }

  public static async addEcriture(e: EcritureComptable): Promise<EcritureComptable | null> {
    e.id = e.id || uuid();
    e.lignes = e.lignes || [];
    e.lignes.forEach(l => { l.id = l.id || uuid(); l.ecritureId = e.id; });
    const fromDb = await safeElectronCall<EcritureComptable | null>(() => api()?.addEcriture(e));
    const stored = (fromDb && typeof fromDb === 'object') ? fromDb : e;
    return memAdd('ecritures', stored);
  }

  public static async deleteEcriture(ecritureId: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteEcriture(ecritureId));
    memDelete('ecritures', ecritureId);
  }

  // ── PERSONNEL & ENSEIGNANTS (SQLITE EXCLUSIF) ──────────────────────────────
  public static async getStaff(): Promise<MembrePersonnel[]> {
    return safeElectronCall<MembrePersonnel[]>(() => api()?.getStaff(), 'staff');
  }

  public static async addStaff(p: MembrePersonnel): Promise<MembrePersonnel | null> {
    const fromDb = await safeElectronCall<MembrePersonnel | null>(() => api()?.addStaff(p));
    return memAdd('staff', fromDb || p);
  }

  public static async updateStaff(id: string, updates: Partial<MembrePersonnel>): Promise<MembrePersonnel | null> {
    const fromDb = await safeElectronCall<MembrePersonnel | null>(() => api()?.updateStaff(id, updates));
    if (fromDb) return memUpdate<MembrePersonnel>('staff', id, fromDb);
    return memUpdate<MembrePersonnel>('staff', id, updates);
  }

  public static async deleteStaff(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteStaff(id));
    memDelete('staff', id);
  }

  // ── COTES & BULLETINS (SQLITE EXCLUSIF) ───────────────────────────────────
  public static async getCotes(filters?: { eleveId?: string; classeId?: string; matiereId?: string; periode?: string; type?: string; evaluationId?: string }): Promise<Cote[]> {
    const items = await safeElectronCall<Cote[]>(() => api()?.getCotes(filters), 'cotes');
    return memFilter(items, filters);
  }

  public static async addCote(cote: Cote): Promise<Cote | null> {
    const fromDb = await safeElectronCall<Cote | null>(() => api()?.addCote(cote));
    return memAdd('cotes', fromDb || cote);
  }

  public static async updateCote(id: string, updates: Partial<Cote>): Promise<Cote | null> {
    const fromDb = await safeElectronCall<Cote | null>(() => api()?.updateCote?.(id, updates));
    if (fromDb) return memUpdate<Cote>('cotes', id, fromDb);
    return memUpdate<Cote>('cotes', id, updates);
  }

  public static async deleteCote(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteCote(id));
    memDelete('cotes', id);
  }

  // ── PRESENCES & REGISTRE (SQLITE EXCLUSIF) ────────────────────────────────
  public static async getPresences(classeId?: string, dateJour?: string): Promise<Presence[]> {
    const items = await safeElectronCall<Presence[]>(() => api()?.getPresences(classeId, dateJour), 'presences');
    if (classeId && dateJour) return memFilter(items, { classeId, dateJour });
    if (classeId) return memFilter(items, { classeId });
    if (dateJour) return memFilter(items, { dateJour });
    return items;
  }

  public static async addPresence(presence: Presence): Promise<Presence | null> {
    const fromDb = await safeElectronCall<Presence | null>(() => api()?.addPresence(presence));
    return memAdd('presences', fromDb || presence);
  }

  // ── CALENDRIER & ÉVÉNEMENTS (SQLITE EXCLUSIF) ──────────────────────────────
  public static async getSchoolEvents(): Promise<SchoolEvent[]> {
    return safeElectronCall<SchoolEvent[]>(() => api()?.getSchoolEvents(), 'schoolEvents');
  }

  public static async addSchoolEvent(ev: SchoolEvent): Promise<SchoolEvent | null> {
    const fromDb = await safeElectronCall<SchoolEvent | null>(() => api()?.addSchoolEvent(ev));
    return memAdd('schoolEvents', fromDb || ev);
  }

  public static async deleteSchoolEvent(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteSchoolEvent(id));
    memDelete('schoolEvents', id);
  }

  // ── DOCUMENTS ENSEIGNANT / PERSONNEL ─────────────────────────────────────
  public static async getStaffDocuments(staffId: string): Promise<DocumentScolaire[]> {
    if (isElectron()) return (await api()?.getStaffDocuments?.(staffId)) || [];
    return memGet<DocumentScolaire>(`staff_docs_${staffId}`);
  }

  public static async uploadStaffDocument(doc: DocumentScolaire & { fileData?: string }): Promise<DocumentScolaire | null> {
    if (isElectron()) return (await api()?.uploadStaffDocument?.(doc)) || null;
    return memAdd(`staff_docs_${doc.eleveId}`, doc);
  }

  public static async deleteStaffDocument(ownerId: string, id?: string): Promise<void> {
    const targetId = id || ownerId;
    if (isElectron()) { await api()?.deleteStaffDocument?.(targetId); return; }
    memDelete('staff_docs', targetId);
  }

  public static async readStaffDocument(id: string): Promise<{ data: string; mimeType: string; originalName: string; isArchive: boolean } | null> {
    if (isElectron()) return (await api()?.readStaffDocument?.(id)) || (await api()?.readStudentDocument(id)) || null;
    return null;
  }

  public static async renameStaffDocument(id: string, newName: string): Promise<DocumentScolaire | null> {
    if (isElectron()) return (await api()?.renameStaffDocument?.(id, newName)) || (await api()?.renameStudentDocument(id, newName)) || null;
    return memUpdate<DocumentScolaire>('staff_docs', id, { originalName: newName, fileName: newName });
  }

  public static async importStaffDocuments(staffId: string, category?: string): Promise<DocumentScolaire[]> {
    if (isElectron()) return (await api()?.importStaffDocuments?.(staffId, category)) || (await api()?.importStudentDocuments(staffId, category)) || [];
    return [];
  }

  public static async importStaffFolder(staffId: string, category?: string): Promise<DocumentScolaire[]> {
    if (isElectron()) return (await api()?.importStaffFolder?.(staffId, category)) || (await api()?.importStudentFolder(staffId, category)) || [];
    return [];
  }

  public static async importStaffImage(staffId: string, name?: string, base64?: string): Promise<DocumentScolaire | null> {
    if (isElectron()) return (await api()?.importStaffImage?.(staffId, name, base64)) || (await api()?.importStudentImage(staffId, name, base64)) || null;
    return null;
  }

  public static async compressStaffDocuments(staffId: string, ids?: string[]): Promise<DocumentScolaire | null> {
    if (isElectron()) return (await api()?.compressStaffDocuments?.(staffId, ids)) || (await api()?.compressStudentDocuments(staffId, ids)) || null;
    return null;
  }

  // ── DOCUMENTS ÉLÈVES (SQLITE EXCLUSIF) ───────────────────────────────────
  public static async getStudentDocuments(eleveId: string): Promise<DocumentScolaire[]> {
    if (isElectron()) return (await api()?.getStudentDocuments(eleveId)) || [];
    return memGet<DocumentScolaire>(`student_docs_${eleveId}`);
  }

  public static async uploadStudentDocument(doc: DocumentScolaire & { fileData?: string }): Promise<DocumentScolaire | null> {
    if (isElectron()) return (await api()?.uploadStudentDocument(doc)) || null;
    return memAdd(`student_docs_${doc.eleveId}`, doc);
  }

  public static async importStudentDocuments(eleveId: string, category?: string): Promise<DocumentScolaire[]> {
    if (isElectron()) return (await api()?.importStudentDocuments(eleveId, category)) || [];
    return [];
  }

  public static async importStudentFolder(eleveId: string, category?: string): Promise<DocumentScolaire[]> {
    if (isElectron()) return (await api()?.importStudentFolder(eleveId, category)) || [];
    return [];
  }

  public static async importStudentImage(eleveId: string, name?: string, base64?: string): Promise<DocumentScolaire | null> {
    if (isElectron()) return (await api()?.importStudentImage(eleveId, name, base64)) || null;
    return null;
  }

  public static async compressStudentDocuments(eleveId: string, ids?: string[]): Promise<DocumentScolaire | null> {
    if (isElectron()) return (await api()?.compressStudentDocuments(eleveId, ids)) || null;
    return null;
  }

  public static async deleteStudentDocument(idOrOwnerId: string, id?: string): Promise<void> {
    const targetId = id || idOrOwnerId;
    if (isElectron()) { await api()?.deleteStudentDocument(targetId); return; }
    memDelete('student_docs', targetId);
  }

  public static async readStudentDocument(id: string): Promise<{ data: string; mimeType: string; originalName: string; isArchive: boolean } | null> {
    if (isElectron()) return (await api()?.readStudentDocument(id)) || null;
    return null;
  }

  public static async renameStudentDocument(id: string, newName: string): Promise<DocumentScolaire | null> {
    if (isElectron()) return (await api()?.renameStudentDocument(id, newName)) || null;
    return memUpdate<DocumentScolaire>('student_docs', id, { originalName: newName, fileName: newName });
  }

  public static async wiaScan(entityId?: string, category?: string, entityType: 'STUDENT' | 'STAFF' = 'STUDENT'): Promise<{ success: boolean; canceled?: boolean; base64?: string; mimeType?: string; error?: string } | null> {
    if (isElectron()) return (await api()?.wiaScan?.(entityId, category, entityType)) || null;
    return null;
  }

  public static async seedDatabase(): Promise<{ success: boolean; count?: number; error?: string }> {
    if (isElectron() && (window as any).electronAPI?.ipcRenderer) {
      try {
        return await (window as any).electronAPI.ipcRenderer.invoke('db:seed-data');
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'Environnement Electron requis.' };
  }

  public static async cleanMockData(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (isElectron() && (window as any).electronAPI?.cleanMockData) {
      try {
        return await (window as any).electronAPI.cleanMockData();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    // Mode Web / Mémoire
    memoryDb.eleves = [];
    memoryDb.staff = [];
    memoryDb.invoices = [];
    memoryDb.payments = [];
    memoryDb.cotes = [];
    memoryDb.presences = [];
    memoryDb.expenses = [];
    memoryDb.classes.forEach(c => c.nombreEleves = 0);
    memoryDb.schoolYears.forEach(y => y.nombreElevesTotal = 0);
    return { success: true, message: 'Base de données nettoyée avec succès (0 élève, 0 enseignant).' };
  }

  // ── RÔLES & PERMISSIONS SYSTEME ──────────────────────────────────────────
  public static getPermissionsForRole(role: RôleSystème): RolePermissions {
    return PERMISSIONS_MAP[role] || PERMISSIONS_MAP['TEACHER'];
  }
}
