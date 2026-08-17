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
  BudgetPrevisionnel,
  NoteFraisProfessionnel,
  HistoriqueEnvoiFacture,
  DocumentScolaire,
  MembrePersonnel,
  FichePaie,
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
  AuditLogEntry,
  ParentTuteur,
  LigneFacture,
} from '../types';
import { isFeeTypeApplicable } from '../utils/feeFilters';
import { getInvoicePaid, getInvoiceStatus } from '../utils/financeCalculations';
import { normalizeRole } from '../utils/permissions';

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

const CYCLE_LABELS: Record<string, string> = {
  MATERNELLE: 'Maternelle',
  PRIMAIRE: 'Primaire',
  SECONDAIRE_CTEB: 'Secondaire / CTEB',
  HUMANITES: 'Humanités',
};

// ─────────────────────────────────────────────────────────────────────────────
//  Acces a l'API Electron IPC SQLite
// ─────────────────────────────────────────────────────────────────────────────
const api = () => (window as any).electronAPI as Record<string, (...args: any[]) => Promise<any>> | undefined;
const isElectron = () => !!(window as any).electronAPI?.isElectron;

let syncingInvoices = false;

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
  auditLog: [],
  parents: [],
  fichesPaie: [],
  budgets: [],
  staffExpenseNotes: [],
  invoiceSendingHistory: [],
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
    label: 'Promoteur & Administrateur Général',
    description: "Accès sans restriction à l'ensemble du logiciel, finances, personnel et paramètres système. Vue multi-établissements.",
    allowedTabs: ['dashboard','students','apprenants','classes','subjects','years','teachers','schedule','grades','examens','invoices','payroll','expenses','fees','cash','accounting','reports','analytics','discipline','hr','leaves','infirmerie','cantine','ressources','transport','library','documents','messages','license','settings','users','audit'],
    canEditConfig: true, canManageUsers: true, canManageFinance: true, canManagePedagogy: true, canEnterGrades: true
  },
  PREFET_DIRECTEUR: {
    role: 'PREFET_DIRECTEUR' as RôleSystème,
    label: "Préfet des Études / Directeur d'Établissement",
    description: 'Pilotage pédagogique, rapports officiels, suivi des élèves, effectifs et personnel. Valide les emplois du temps et les bulletins.',
    allowedTabs: ['dashboard','students','apprenants','classes','subjects','years','teachers','schedule','grades','examens','discipline','hr','leaves','infirmerie','cantine','transport','library','documents','messages','invoices'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: true, canEnterGrades: true
  },
  DIRECTEUR_ETUDES: {
    role: 'DIRECTEUR_ETUDES' as RôleSystème,
    label: 'Directeur des Études (DE)',
    description: "Gestion des programmes, grille d'horaires, cotes, bulletins et examens. Supervise les enseignants pédagogiquement.",
    allowedTabs: ['dashboard','students','apprenants','classes','subjects','years','schedule','grades','examens','documents'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: true, canEnterGrades: true
  },
  DIRECTEUR_DISCIPLINE: {
    role: 'DIRECTEUR_DISCIPLINE' as RôleSystème,
    label: 'Directeur de Discipline (DD)',
    description: 'Registre de discipline, suivi du comportement, autorisations de sortie et gestion des absences et retenues.',
    allowedTabs: ['dashboard','students','discipline','schedule','documents'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: false
  },
  COMPTABLE: {
    role: 'COMPTABLE' as RôleSystème,
    label: 'Comptable Intendant Général',
    description: 'Gestion complète de la caisse, encaissements, facturation, paie du personnel, dépenses et états financiers.',
    allowedTabs: ['dashboard','invoices','payroll','expenses','fees','cash','accounting','reports','analytics','documents','students','apprenants'],
    canEditConfig: false, canManageUsers: false, canManageFinance: true, canManagePedagogy: false, canEnterGrades: false
  },
  SECRETAIRE: {
    role: 'SECRETAIRE' as RôleSystème,
    label: 'Secrétariat & Inscriptions',
    description: "Gestion des inscriptions et réinscriptions, constitution des dossiers élèves, production de documents administratifs (attestations, certificats). Enregistrement des paiements et génération des reçus.",
    allowedTabs: ['dashboard','students','apprenants','classes','years','invoices','cash','documents'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: false
  },
  INTENDANT: {
    role: 'INTENDANT' as RôleSystème,
    label: 'Intendant Financier',
    description: "Opérateur caisse : enregistre les paiements de frais scolaires, génère les reçus et gère les remises et échéanciers. Accès limité aux finances sans modification des types de frais.",
    allowedTabs: ['dashboard','invoices','cash','students','apprenants','documents'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: false
  },
  CENSEUR: {
    role: 'CENSEUR' as RôleSystème,
    label: 'Censeur des Études',
    description: "Assiste le Préfet dans le suivi pédagogique des enseignants et la supervision des programmes et du journal de classe.",
    allowedTabs: ['dashboard','students','apprenants','classes','subjects','schedule','grades','examens','discipline','documents'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: true, canEnterGrades: false
  },
  TITULAIRE: {
    role: 'TITULAIRE' as RôleSystème,
    label: 'Enseignant Titulaire de Classe',
    description: "Saisie des cotes de sa promotion, présences, journal de classe et préparation des bulletins de sa classe.",
    allowedTabs: ['dashboard','students','grades','schedule','classes'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: true
  },
  ENSEIGNANT: {
    role: 'ENSEIGNANT' as RôleSystème,
    label: 'Enseignant / Professeur de Cours',
    description: "Saisie des notes d'interrogations et d'examens pour ses matières attribuées. Consultation de l'emploi du temps et des présences.",
    allowedTabs: ['dashboard','grades','schedule'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: true
  },
  PARENT_ELEVE: {
    role: 'PARENT_ELEVE' as RôleSystème,
    label: 'Espace Parent & Tuteur',
    description: 'Consultation du bulletin numérique, suivi des paiements de scolarité et communications de la direction.',
    allowedTabs: ['dashboard','grades','invoices'],
    canEditConfig: false, canManageUsers: false, canManageFinance: false, canManagePedagogy: false, canEnterGrades: false
  }
};


// ─────────────────────────────────────────────────────────────────────────────
//  SERVICE PRINCIPAL SQLITE EXCLUSIF
// ─────────────────────────────────────────────────────────────────────────────
export class LocalDatabaseService {
  private static _currentUser: UserSession | null = null;

  public static async verifyAdminPassword(inputPassword: string): Promise<boolean> {
    const clean = inputPassword.trim();
    if (!clean) return false;
    if (this._currentUser && (this._currentUser.pinCode === clean || (this._currentUser as any).password === clean)) {
      return true;
    }
    const users = await this.getUsers();
    const matchedUser = users.find((u: any) =>
      (u.role === 'PROMOTEUR_ADMIN' || u.role === 'ADMIN' || u.role === 'PREFET' || u.role === 'COMPTABLE' || u.role === 'PREFET_DIRECTEUR') &&
      (u.password === clean || u.pinCode === clean || u.pin === clean)
    );
    // Vérification stricte — plus de master PINs universels
    return !!matchedUser;
  }

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
    console.log('[ECOLISA] ✅ Base de données initialisée à propre (0 élève, 0 enseignant, 0 classes).');
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

  /**
   * Retourne la liste des noms de classes assignées à l'utilisateur connecté.
   * Si l'utilisateur est Administrateur, Préfet, DE, Comptable ou Secrétaire -> retourne null (aucun filtre, accès global).
   * Si l'utilisateur est Enseignant ou Titulaire -> retourne la liste exacte de ses classes/salles assignées.
   */
  public static async getCurrentUserAssignedClasses(): Promise<string[] | null> {
    const user = this.getCurrentUser();
    if (!user) return null;

    const fullAccessRoles = [
      'PROMOTEUR_ADMIN',
      'PREFET_DIRECTEUR',
      'DIRECTEUR_ETUDES',
      'DIRECTEUR_DISCIPLINE',
      'COMPTABLE',
      'SECRETAIRE',
      'INTENDANT',
      'CENSEUR',
    ];

    if (fullAccessRoles.includes(user.role as string)) {
      return null; // Accès total sans restriction
    }

    // Pour ENSEIGNANT ou TITULAIRE : chercher le dossier RH du membre du personnel
    const staffList = await this.getStaff();
    const emailLower = (user.email || '').toLowerCase().trim();
    const nameLower = (user.nom || '').toLowerCase().trim();

    const teacher = staffList.find(s => {
      if (s.email && s.email.toLowerCase().trim() === emailLower) return true;
      if (s.id === user.id) return true;
      const staffFullName = `${s.prenom || ''} ${s.nom || ''}`.toLowerCase().trim();
      if (staffFullName && staffFullName === nameLower) return true;
      return false;
    });

    if (!teacher) {
      return []; // Enseignant sans affectation -> restriction par sécurité
    }

    const assignedSet = new Set<string>();
    (teacher.classesAssignees || []).forEach(c => { if (c) assignedSet.add(c.trim()); });
    (teacher.classesTitularisees || []).forEach(c => { if (c) assignedSet.add(c.trim()); });
    if (teacher.salleUniqueId) assignedSet.add(teacher.salleUniqueId.trim());
    if (teacher.classeTitulaireId) assignedSet.add(teacher.classeTitulaireId.trim());
    if (teacher.optionTitulaireCode) assignedSet.add(teacher.optionTitulaireCode.trim());

    return Array.from(assignedSet);
  }

  /**
   * Vérifie si un élève est accessible par l'utilisateur connecté.
   */
  public static async isStudentAccessibleForCurrentUser(student: Eleve): Promise<boolean> {
    const assignedClasses = await this.getCurrentUserAssignedClasses();
    if (assignedClasses === null) return true;
    if (assignedClasses.length === 0) return false;

    const studentClass = (student.nomClasse || (student as any).classe || (student as any).salle || '').toLowerCase().trim();
    return assignedClasses.some(c => {
      const cLower = c.toLowerCase().trim();
      return studentClass === cLower || studentClass.includes(cLower) || cLower.includes(studentClass);
    });
  }

  // ── UTILISATEURS (CRUD SQLITE + ENRICHISSEMENT RH) ───────────────────────
  public static async getUsers(): Promise<UserAccount[]> {
    const [rawUsers, staffList] = await Promise.all([
      safeElectronCall<UserAccount[]>(() => api()?.getUsers(), 'users'),
      this.getStaff().catch(() => []),
    ]);

    // Map canonique indexée par ID uniquement (source de vérité : table users)
    const usersById = new Map<string, UserAccount>();

    // 1. Charger UNIQUEMENT les vrais comptes créés dans la table users
    (rawUsers || []).forEach((u) => {
      usersById.set(u.id, {
        ...u,
        role: normalizeRole(u.role),
      });
    });

    // 2. Enrichir les comptes existants avec les photos/avatars et matricules RH correspondants
    usersById.forEach((u, uid) => {
      const emailLower = (u.email || '').toLowerCase().trim();
      const staffMatch = (staffList || []).find((s) =>
        (s.id && (s.id === u.id || `usr_${s.id}` === u.id)) ||
        (s.email && emailLower && s.email.toLowerCase().trim() === emailLower) ||
        (s.nom && u.nom && s.nom.toLowerCase() === u.nom.toLowerCase() &&
         s.prenom && u.prenom && s.prenom.toLowerCase() === u.prenom.toLowerCase())
      );

      if (staffMatch) {
        usersById.set(uid, {
          ...u,
          avatarUrl: u.avatarUrl || staffMatch.avatarUrl || staffMatch.photoUrl,
          telephone: u.telephone || staffMatch.telephone || '',
          usernameGenerated: u.usernameGenerated || (staffMatch.matricule ? staffMatch.matricule.toLowerCase() : undefined),
        });
      }
    });

    return Array.from(usersById.values());
  }

  public static async getUserByStaff(staff: { id?: string; email?: string; nom?: string; prenom?: string }): Promise<UserAccount | null> {
    if (!staff) return null;
    const users = await this.getUsers();
    const emailClean = (staff.email || '').toLowerCase().trim();
    const nomClean = (staff.nom || '').toLowerCase().trim();
    const prenomClean = (staff.prenom || '').toLowerCase().trim();

    return users.find((u) =>
      (staff.id && (u.id === staff.id || u.id === `usr_${staff.id}`)) ||
      (emailClean && u.email && u.email.toLowerCase().trim() === emailClean) ||
      (nomClean && u.nom && u.nom.toLowerCase().trim() === nomClean &&
       prenomClean && u.prenom && u.prenom.toLowerCase().trim() === prenomClean)
    ) || null;
  }

  public static async getUserByEmail(email: string): Promise<UserAccount | null> {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    const users = await this.getUsers();
    return users.find((u) =>
      u.email.toLowerCase().trim() === clean ||
      (u.usernameGenerated && u.usernameGenerated.toLowerCase().trim() === clean) ||
      (u.telephone && u.telephone.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, ''))
    ) || null;
  }

  public static async verifyCredentials(identifier: string, password: string): Promise<UserAccount | null> {
    const cleanId = (identifier || '').trim();
    const cleanPwd = (password || '').trim();
    if (!cleanId) return null;

    // 1. Essai IPC natif si Electron disponible
    if (isElectron() && api()?.verifyCredentials) {
      try {
        const u = await api()!.verifyCredentials(cleanId, cleanPwd);
        if (u) {
          return {
            ...u,
            role: normalizeRole(u.role),
          };
        }
      } catch (e) {
        console.warn('[DB SQLite] verifyCredentials IPC error:', e);
      }
    }

    // 2. Recherche multi-critères dans le registre unifié
    const users = await this.getUsers();
    const cleanIdLower = cleanId.toLowerCase();
    const cleanIdDigits = cleanId.replace(/[^0-9]/g, '');

    const matchedUser = users.find((u: any) => {
      if (u.statut === 'SUSPENDU') return false;
      const userEmail = (u.email || '').toLowerCase().trim();
      const userUsername = (u.usernameGenerated || '').toLowerCase().trim();
      const userTelDigits = (u.telephone || '').replace(/[^0-9]/g, '');
      const userFullName = `${u.prenom || ''} ${u.nom || ''}`.toLowerCase().trim();
      const userNom = (u.nom || '').toLowerCase().trim();
      const userId = (u.id || '').toLowerCase().trim();

      if (userEmail === cleanIdLower) return true;
      if (userUsername && userUsername === cleanIdLower) return true;
      if (userId === cleanIdLower) return true;
      if (cleanIdDigits.length >= 6 && userTelDigits.includes(cleanIdDigits)) return true;
      if (userFullName === cleanIdLower || userNom === cleanIdLower) return true;
      return false;
    });

    if (!matchedUser) return null;

    // 3. Vérification stricte du mot de passe / code PIN
    //    Pas de master PINs universels — chaque compte est protégé par ses propres identifiants.
    const userPass = (matchedUser as any).password || (matchedUser as any).generatedPassword || '';
    const userPin = matchedUser.pinCode || '';

    const isMatch =
      (cleanPwd !== '' && (userPass === cleanPwd || userPin === cleanPwd));

    if (isMatch) {
      return {
        ...matchedUser,
        role: normalizeRole(matchedUser.role),
      };
    }

    return null;
  }

  public static async addUser(user: UserAccount & { password?: string }): Promise<UserAccount | null> {
    const normalizedRole = normalizeRole(user.role);
    const toSave = { ...user, role: normalizedRole };
    const fromDb = await safeElectronCall<UserAccount | null>(() => api()?.addUser(toSave));
    return memAdd('users', fromDb || toSave);
  }

  public static async updateUser(id: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    const normalizedUpdates = updates.role ? { ...updates, role: normalizeRole(updates.role) } : updates;
    const fromDb = await safeElectronCall<UserAccount | null>(() => api()?.updateUser(id, normalizedUpdates));
    if (fromDb) return memUpdate<UserAccount>('users', id, fromDb);
    return memUpdate<UserAccount>('users', id, normalizedUpdates);
  }

  public static async deleteUser(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteUser(id));
    memDelete('users', id);
  }

  public static async authenticateUser(email: string, pinCode?: string): Promise<UserAccount | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    // Vérification stricte du PIN — plus de passe-partout
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
    if (!eleve.id) {
      eleve.id = `student_${Date.now()}`;
    }
    try {
      const fromDb = await safeElectronCall<Eleve | null>(() => api()?.addEleve(eleve));
      if (!fromDb && isElectron()) {
        console.error('[LocalDatabaseService.addEleve] Échec persistance SQLite :', eleve);
        throw new Error("L'enregistrement de l'élève a échoué en base de données.");
      }
      const stored = fromDb || eleve;
      return memAdd('eleves', stored);
    } catch (err) {
      console.error('[LocalDatabaseService.addEleve] Exception:', err);
      throw err;
    }
  }

  public static async addStudent(eleve: Eleve): Promise<Eleve | null> {
    return this.addEleve(eleve);
  }

  public static async updateEleve(id: string, updates: Partial<Eleve>): Promise<Eleve | null> {
    const fromDb = await safeElectronCall<Eleve | null>(() => api()?.updateEleve(id, updates));
    if (fromDb) return memUpdate<Eleve>('eleves', id, fromDb);
    if (isElectron()) throw new Error("La mise à jour de l'élève en base de données a échoué.");
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

  public static async syncStudentInvoices(): Promise<FactureEleve[]> {
    if (syncingInvoices) {
      // Éviter les appels parallèles qui créent des factures en double
      return await safeElectronCall<FactureEleve[]>(() => api()?.getInvoices(), 'invoices');
    }
    syncingInvoices = true;

    try {
      const [eleves, invoices, feeTypes, years, classes] = await Promise.all([
        this.getEleves(),
        safeElectronCall<FactureEleve[]>(() => api()?.getInvoices(), 'invoices'),
        this.getFeeTypes(),
        this.getSchoolYears(),
        this.getClasses(),
      ]);

      const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
      const yearId = activeYear?.id || 'default_year';

      const hasInvoiceForYear = (studentId: string) => invoices.some(inv =>
      (inv.eleveId === studentId || inv.studentId === studentId) &&
      (inv.anneeScolaireId === yearId || inv.schoolYearId === yearId || inv.anneeScolaire === activeYear?.nom)
    );

    const missingEleves = eleves.filter(s => !hasInvoiceForYear(s.id));

    for (const eleve of missingEleves) {
      const cls = classes.find(c => c.id === eleve.classId || c.nom === eleve.nomClasse);
      const option = cls?.optionCode || eleve.optionEPST || 'TRONC_COMMUN';
      const applicableFees = feeTypes.filter(ft => isFeeTypeApplicable(ft, {
        schoolYearId: yearId,
        classId: cls?.id || eleve.classId,
        className: cls?.nom || eleve.nomClasse,
        cycleId: cls?.cycleId,
        option,
        salleId: eleve.salleId,
        regime: eleve.regime,
      }, CYCLE_LABELS));

      let lignes: LigneFacture[] = [];
      if (applicableFees.length > 0) {
        lignes = applicableFees.map(f => ({
          id: `l_${uuid()}_${f.id}`,
          invoiceId: '',
          feeTypeId: f.id,
          nom: f.nom,
          montant: f.montant,
          devise: f.devise,
          categorie: f.categorie,
        }));
      } else {
        lignes = [{
          id: `l_${uuid()}_default`,
          invoiceId: '',
          feeTypeId: 'frais_minerval_default',
          nom: 'Frais de Minerval Scolaire Annuel',
          montant: 180,
          devise: 'USD',
          categorie: 'FRAIS_MINERVAL',
        }];
      }

      const montantTotal = lignes.reduce((a, l) => a + (l.montant || 0), 0);
      const newInv: FactureEleve = {
        id: `inv_${eleve.id}_${Date.now()}`,
        numeroFacture: `FAC-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        studentId: eleve.id,
        eleveId: eleve.id,
        nomEleve: `${eleve.prenom} ${eleve.nom}`,
        anneeScolaireId: yearId,
        anneeScolaire: activeYear?.nom || '2025-2026',
        nomClasse: eleve.nomClasse || cls?.nom || 'Non spécifiée',
        statut: 'NON_PAYE',
        devise: 'USD',
        montantTotal,
        montantPaye: 0,
        dateEcheance: new Date().toISOString().split('T')[0],
        lignes,
      };

      await this.addInvoice(newInv);
    }

    return safeElectronCall<FactureEleve[]>(() => api()?.getInvoices(), 'invoices');
  } finally {
    syncingInvoices = false;
  }
}

  public static async getInvoices(yearId?: string): Promise<FactureEleve[]> {
    const years = await this.getSchoolYears();
    if (years.length === 0) return [];

    const targetYearId = yearId;
    // Récupérer toutes les factures : le filtre SQL par school_year_id est parfois
    // inopérant sur les anciennes données (colonne null), on filtre en JS.
    let invoices = await safeElectronCall<FactureEleve[]>(() => api()?.getInvoices(), 'invoices');

    const eleves = await this.getEleves();
    const existingStudentIds = new Set(invoices.map(i => i.eleveId || i.studentId).filter(Boolean));
    const hasMissingInvoices = eleves.some(e => !existingStudentIds.has(e.id));
    if (hasMissingInvoices && !syncingInvoices) {
      await this.syncStudentInvoices();
      invoices = await safeElectronCall<FactureEleve[]>(() => api()?.getInvoices(), 'invoices');
    }

    if (!targetYearId) return invoices;
    const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
    return invoices.filter(inv =>
      inv.anneeScolaireId === targetYearId ||
      inv.schoolYearId === targetYearId ||
      inv.anneeScolaire === targetYearId ||
      inv.anneeScolaire === activeYear?.nom
    );
  }

  public static async addInvoice(inv: FactureEleve): Promise<FactureEleve | null> {
    const years = await this.getSchoolYears();
    const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
    if (activeYear && !inv.anneeScolaireId) {
      inv.anneeScolaireId = activeYear.id;
      inv.anneeScolaire = activeYear.nom;
    }
    // schoolYearId est utilisé par SQLite pour la colonne school_year_id
    inv.schoolYearId = inv.anneeScolaireId || activeYear?.id || inv.schoolYearId || 'default_year';
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
        lignesEcriture.push({ compteId: 'cpt_client', debit: l.montant, credit: 0, devise: inv.devise || 'USD' });
        lignesEcriture.push({ compteId: compteProduit, debit: 0, credit: l.montant, devise: inv.devise || 'USD' });
      }
      if (lignesEcriture.length) {
        await this.addEcriture({
          id: uuid(),
          journalCode: 'JV',
          date: inv.dateEcheance || new Date().toISOString(),
          reference: inv.id,
          libelle: `Facture ${inv.numeroFacture}`,
          devise: inv.devise || 'USD',
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
    const apiRef = api();
    if (!apiRef?.deleteInvoice) {
      throw new Error('[deleteInvoice] Le pont Electron n\'est pas chargé. Relance l\'application pour charger le nouveau preload.');
    }
    await safeElectronCall(() => apiRef.deleteInvoice(id));
    memDelete('invoices', id);
    // Supprimer en mémoire les paiements et opérations liées pour éviter les données fantômes jusqu'au prochain rechargement
    const payments = memGet<TransactionPaiement>('payments');
    const toDeletePayments = payments.filter(p => p.invoiceId === id).map(p => p.id);
    toDeletePayments.forEach(pid => memDelete('payments', pid));
    const cashOps = memGet<OperationCaisse>('cashOperations');
    cashOps.filter(c => c.origine === 'PAYMENT' && toDeletePayments.includes(c.origineId || '')).forEach(c => memDelete('cashOperations', c.id));
    const ecritures = memGet<EcritureComptable>('ecritures');
    ecritures.filter(e => toDeletePayments.includes(e.reference || '')).forEach(e => memDelete('ecritures', e.id));
  }

  public static async cleanupDuplicateInvoices(): Promise<number> {
    return await safeElectronCall<number>(() => api()?.cleanupDuplicateInvoices?.(), 'invoices') || 0;
  }

  public static async cleanupDuplicateFeeTypes(): Promise<number> {
    return await safeElectronCall<number>(() => api()?.cleanupDuplicateFeeTypes?.(), 'feeTypes') || 0;
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

    // Recalculer montantPaye/statut de la facture depuis les vrais paiements
    // pour éviter les statuts incohérents (PAYE alors qu'il reste un solde, etc.)
    let inv: FactureEleve | undefined;
    if (p.invoiceId) {
      inv = (await this.getInvoices()).find(i => i.id === p.invoiceId);
      if (inv) {
        const allPayments = await this.getPayments(p.invoiceId);
        const paid = getInvoicePaid(inv, allPayments, inv.devise);
        const statut = getInvoiceStatus(inv, allPayments, inv.devise);
        await this.updateInvoice(p.invoiceId, { montantPaye: paid, statut });
      }
    }

    if (!isElectron()) {
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
        const lineDevise = p.devise || 'USD';
        if (inv) {
          // Paiement d'une facture : caisse vs créance client
          lignesEcriture.push({ compteId: 'cpt_caisse', debit: alloc.montant, credit: 0, devise: lineDevise });
          lignesEcriture.push({ compteId: 'cpt_client', debit: 0, credit: alloc.montant, devise: lineDevise });
        } else {
          // Encaissement direct : caisse vs produit par catégorie de frais
          const ft = feeTypes.find(f => f.id === alloc.feeTypeId);
          const compteProduit = this.compteProduitForCategorie(ft?.categorie || 'PRODUIT');
          lignesEcriture.push({ compteId: 'cpt_caisse', debit: alloc.montant, credit: 0, devise: lineDevise });
          lignesEcriture.push({ compteProduit, debit: 0, credit: alloc.montant, devise: lineDevise });
        }
      }
      await this.addEcriture({
        id: uuid(),
        journalId: 'jnl_caisse',
        journalCode: 'JC',
        date: cash.date,
        reference: p.numeroRecu,
        libelle: `Encaissement ${p.nomEleve || ''}`.trim(),
        devise: cash.devise,
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
      const expenseDevise = e.devise || cash.devise || 'USD';
      await this.addEcriture({
        id: uuid(),
        journalId: 'jnl_od',
        journalCode: 'JO',
        date: e.date,
        reference: e.id,
        libelle: e.libelle,
        devise: expenseDevise,
        lignes: [
          { compteId: compteCharge, debit: e.montant, credit: 0, devise: expenseDevise },
          { compteId: 'cpt_caisse', debit: 0, credit: e.montant, devise: expenseDevise },
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
    ft.id = ft.id || uuid();
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
  public static async getCashOperations(filters?: { yearId?: string; type?: 'ENTREE' | 'SORTIE' | 'TRANSFERT' }): Promise<OperationCaisse[]> {
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

  // ── BUDGETS PRÉVISIONNELS ─────────────────────────────────────────────────
  public static async getBudgets(filters?: { schoolYearId?: string; periode?: string; type?: 'REVENU' | 'DEPENSE' }): Promise<BudgetPrevisionnel[]> {
    return safeElectronCall<BudgetPrevisionnel[]>(() => api()?.getBudgets(filters), 'budgets');
  }

  public static async addBudget(b: BudgetPrevisionnel): Promise<BudgetPrevisionnel | null> {
    b.id = b.id || uuid();
    const fromDb = await safeElectronCall<BudgetPrevisionnel | null>(() => api()?.addBudget(b));
    const stored = (fromDb && typeof fromDb === 'object') ? fromDb : b;
    return memAdd('budgets', stored);
  }

  public static async updateBudget(id: string, upd: Partial<BudgetPrevisionnel>): Promise<BudgetPrevisionnel | null> {
    const fromDb = await safeElectronCall<BudgetPrevisionnel | null>(() => api()?.updateBudget(id, upd));
    const existing = memGet<BudgetPrevisionnel>('budgets');
    const current = existing.find(x => x.id === id);
    const stored = (fromDb && typeof fromDb === 'object') ? fromDb : (current ? { ...current, ...upd } : null);
    if (!stored) return null;
    return memAdd('budgets', stored as BudgetPrevisionnel);
  }

  public static async deleteBudget(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteBudget(id));
    memDelete('budgets', id);
  }

  // ── NOTES DE FRAIS PROFESSIONNELS ─────────────────────────────────────────
  public static async getStaffExpenseNotes(filters?: { schoolYearId?: string; staffId?: string; statut?: string }): Promise<NoteFraisProfessionnel[]> {
    return safeElectronCall<NoteFraisProfessionnel[]>(() => api()?.getStaffExpenseNotes(filters), 'staffExpenseNotes');
  }

  public static async addStaffExpenseNote(n: NoteFraisProfessionnel): Promise<NoteFraisProfessionnel | null> {
    n.id = n.id || uuid();
    n.statut = n.statut || 'SOUMIS';
    n.dateCreation = n.dateCreation || new Date().toISOString();
    const fromDb = await safeElectronCall<NoteFraisProfessionnel | null>(() => api()?.addStaffExpenseNote(n));
    const stored = (fromDb && typeof fromDb === 'object') ? fromDb : n;
    return memAdd('staffExpenseNotes', stored);
  }

  public static async updateStaffExpenseNote(id: string, upd: Partial<NoteFraisProfessionnel>): Promise<NoteFraisProfessionnel | null> {
    const fromDb = await safeElectronCall<NoteFraisProfessionnel | null>(() => api()?.updateStaffExpenseNote(id, upd));
    const existing = memGet<NoteFraisProfessionnel>('staffExpenseNotes');
    const current = existing.find(x => x.id === id);
    const stored = (fromDb && typeof fromDb === 'object') ? fromDb : (current ? { ...current, ...upd } : null);
    if (!stored) return null;
    return memAdd('staffExpenseNotes', stored as NoteFraisProfessionnel);
  }

  public static async deleteStaffExpenseNote(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteStaffExpenseNote(id));
    memDelete('staffExpenseNotes', id);
  }

  public static async reimburseStaffExpenseNote(id: string, data: { montantRembourse?: number; devise?: string; dateRemboursement?: string; modeRemboursement?: string; referenceRemboursement?: string; validePar?: string }): Promise<NoteFraisProfessionnel | null> {
    const fromDb = await safeElectronCall<NoteFraisProfessionnel | null>(() => api()?.reimburseStaffExpenseNote(id, data));
    const existing = memGet<NoteFraisProfessionnel>('staffExpenseNotes');
    const current = existing.find(x => x.id === id);
    const stored = (fromDb && typeof fromDb === 'object') ? fromDb : (current ? { ...current, ...data, statut: 'REMBOURSE' } : null);
    if (!stored) return null;
    return memAdd('staffExpenseNotes', stored as NoteFraisProfessionnel);
  }

  // ── HISTORIQUE D'ENVOI DE FACTURES ────────────────────────────────────────
  public static async getInvoiceSendingHistory(filters?: { invoiceId?: string; methode?: string }): Promise<HistoriqueEnvoiFacture[]> {
    return safeElectronCall<HistoriqueEnvoiFacture[]>(() => api()?.getInvoiceSendingHistory(filters), 'invoiceSendingHistory');
  }

  public static async addInvoiceSendingHistory(h: HistoriqueEnvoiFacture): Promise<HistoriqueEnvoiFacture | null> {
    h.id = h.id || uuid();
    h.dateEnvoi = h.dateEnvoi || new Date().toISOString();
    const fromDb = await safeElectronCall<HistoriqueEnvoiFacture | null>(() => api()?.addInvoiceSendingHistory(h));
    const stored = (fromDb && typeof fromDb === 'object') ? fromDb : h;
    return memAdd('invoiceSendingHistory', stored as HistoriqueEnvoiFacture);
  }

  public static async deleteInvoiceSendingHistory(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteInvoiceSendingHistory(id));
    memDelete('invoiceSendingHistory', id);
  }

  // ── PERSONNEL & ENSEIGNANTS (SQLITE EXCLUSIF) ──────────────────────────────
  public static async getStaff(): Promise<MembrePersonnel[]> {
    const list = await safeElectronCall<MembrePersonnel[]>(() => api()?.getStaff(), 'staff');
    
    // Auto-sync du Promoteur / Admin dans le dossier du personnel RH si absent
    const hasAdmin = list.some(s => s.role === 'PROMOTEUR_ADMIN');
    if (!hasAdmin) {
      const cfg = await this.getConfig('school_config');
      const users = await this.getUsers();
      const adminUser = users.find(u => u.role === 'PROMOTEUR_ADMIN');
      if (adminUser || cfg?.promoterName) {
        const promoterName = cfg?.promoterName || `${adminUser?.prenom || ''} ${adminUser?.nom || ''}`.trim() || 'Promoteur Administrateur';
        const [prenom, ...restNom] = promoterName.trim().split(' ');
        const nomFamille = restNom.join(' ') || prenom;
        const prenomAdmin = restNom.length > 0 ? prenom : '';
        const adminStaff: MembrePersonnel = {
          id: `staff_admin_auto`,
          matricule: 'ADM-001',
          nom: nomFamille,
          prenom: prenomAdmin,
          email: adminUser?.email || cfg?.promoterEmail || 'admin@ecolisa.cd',
          telephone: adminUser?.telephone || cfg?.promoterPhone2FA || '+243 81 000 0000',
          role: 'PROMOTEUR_ADMIN',
          titreOfficiel: 'Promoteur & Administrateur Général',
          qualification: 'Administration & Direction Scolaire',
          statut: 'ACTIF',
          typeContrat: 'PERMANENT',
          dateEmbauche: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        } as any;
        await safeElectronCall(() => api()?.addStaff(adminStaff));
        memAdd('staff', adminStaff);
        list.push(adminStaff);
      }
    }
    return list;
  }

  public static async addStaff(p: MembrePersonnel): Promise<MembrePersonnel | null> {
    const fromDb = await safeElectronCall<MembrePersonnel | null>(() => api()?.addStaff(p));
    return memAdd('staff', fromDb || p);
  }

  public static async updateStaff(id: string, updates: Partial<MembrePersonnel>): Promise<MembrePersonnel | null> {
    if (!id) return null;
    
    // S'assurer que le tableau staff en mémoire est initialisé
    if (!memoryDb['staff'] || memoryDb['staff'].length === 0) {
      await this.getStaff();
    }

    const fromDb = await safeElectronCall<MembrePersonnel | null>(() => api()?.updateStaff(id, updates));
    
    if (!memoryDb['staff']) memoryDb['staff'] = [];
    const idx = memoryDb['staff'].findIndex((s: any) => s.id === id || (s.id && s.id.toString() === id.toString()));
    
    if (idx !== -1) {
      const merged = { ...memoryDb['staff'][idx], ...(fromDb || {}), ...updates };
      memoryDb['staff'][idx] = merged;
      return merged;
    }

    const fallback = { id, ...updates } as MembrePersonnel;
    memoryDb['staff'].push(fallback);
    return fallback;
  }

  public static async deleteStaff(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteStaff(id));
    memDelete('staff', id);
  }

  // ── FICHES DE PAIE (PERSONNEL) ────────────────────────────────────────────
  public static async getFichesPaie(filters?: { staffId?: string; periode?: string; schoolYearId?: string; statut?: FichePaie['statut'] }): Promise<FichePaie[]> {
    const items = await safeElectronCall<FichePaie[]>(() => api()?.getFichesPaie?.(filters), 'fichesPaie');
    return memFilter(items, filters);
  }

  public static async addFichePaie(fiche: FichePaie): Promise<FichePaie | null> {
    const fromDb = await safeElectronCall<FichePaie | null>(() => api()?.addFichePaie?.(fiche));
    return memAdd('fichesPaie', fromDb || fiche);
  }

  public static async updateFichePaie(id: string, updates: Partial<FichePaie>): Promise<FichePaie | null> {
    const fromDb = await safeElectronCall<FichePaie | null>(() => api()?.updateFichePaie?.(id, updates));
    if (fromDb) return memUpdate<FichePaie>('fichesPaie', id, fromDb);
    return memUpdate<FichePaie>('fichesPaie', id, updates);
  }

  public static async deleteFichePaie(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteFichePaie?.(id));
    memDelete('fichesPaie', id);
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
    if (isElectron() && api()?.getStaffDocuments) {
      const docs = await api()?.getStaffDocuments?.(staffId);
      if (docs && docs.length > 0) return docs;
    }
    const memDocs = memGet<DocumentScolaire>('documents') || [];
    return memDocs.filter((d: any) => d.ownerId === staffId || d.staffId === staffId || d.eleveId === staffId);
  }

  public static async uploadStaffDocument(doc: DocumentScolaire & { fileData?: string }): Promise<DocumentScolaire | null> {
    if (isElectron() && api()?.uploadStaffDocument) return (await api()?.uploadStaffDocument?.(doc)) || null;
    return memAdd('documents', doc);
  }

  public static async deleteStaffDocument(ownerId: string, id?: string): Promise<void> {
    const targetId = id || ownerId;
    if (isElectron() && api()?.deleteStaffDocument) { await api()?.deleteStaffDocument?.(targetId); }
    memDelete('documents', targetId);
  }

  public static async readStaffDocument(id: string): Promise<any> {
    if (isElectron() && api()?.readStaffDocument) return (await api()?.readStaffDocument?.(id)) || (await api()?.readStudentDocument?.(id)) || null;
    const memDocs = memGet<DocumentScolaire>('documents') || [];
    const found: any = memDocs.find((d: any) => d.id === id);
    if (found?.base64Content || found?.fileData) {
      return { data: found.base64Content || found.fileData, dataUrl: found.base64Content || found.fileData, mimeType: found.mimeType || 'image/jpeg', originalName: found.originalName || found.nomFichier || 'document', isArchive: false };
    }
    return null;
  }

  public static async renameStaffDocument(id: string, newName: string): Promise<DocumentScolaire | null> {
    if (isElectron() && api()?.renameStaffDocument) return (await api()?.renameStaffDocument?.(id, newName)) || (await api()?.renameStudentDocument?.(id, newName)) || null;
    return memUpdate<DocumentScolaire>('documents', id, { originalName: newName, nomFichier: newName } as any);
  }

  public static async importStaffDocuments(staffId: string, category?: string): Promise<DocumentScolaire[]> {
    if (isElectron() && api()?.importStaffDocuments) return (await api()?.importStaffDocuments?.(staffId, category)) || (await api()?.importStudentDocuments?.(staffId, category)) || [];
    return [];
  }

  public static async importStaffFolder(staffId: string, category?: string): Promise<DocumentScolaire[]> {
    if (isElectron() && api()?.importStaffFolder) return (await api()?.importStaffFolder?.(staffId, category)) || (await api()?.importStudentFolder?.(staffId, category)) || [];
    return [];
  }

  public static async importStaffImage(staffId: string, name?: string, base64?: string): Promise<DocumentScolaire | null> {
    if (isElectron() && api()?.importStaffImage) {
      const res = await api()?.importStaffImage?.(staffId, name, base64);
      if (res) return res;
    }
    const newDoc: DocumentScolaire = {
      id: uuid(),
      originalName: name || 'document_scan.jpg',
      nomFichier: name || 'document_scan.jpg',
      size: base64 ? Math.round((base64.length * 3) / 4) : 1024,
      category: 'PJ',
      mimeType: base64?.split(';')[0]?.replace('data:', '') || 'image/jpeg',
      dateAjout: new Date().toISOString(),
      ownerId: staffId,
      base64Content: base64,
    } as any;
    return memAdd('documents', newDoc);
  }

  public static async compressStaffDocuments(staffId: string, ids?: string[]): Promise<DocumentScolaire | null> {
    if (isElectron() && api()?.compressStaffDocuments) return (await api()?.compressStaffDocuments?.(staffId, ids)) || (await api()?.compressStudentDocuments?.(staffId, ids)) || null;
    return null;
  }

  // ── DOCUMENTS ÉLÈVES (SQLITE EXCLUSIF) ───────────────────────────────────
  public static async getStudentDocuments(eleveId: string): Promise<DocumentScolaire[]> {
    if (isElectron() && api()?.getStudentDocuments) {
      const docs = await api()?.getStudentDocuments?.(eleveId);
      if (docs && docs.length > 0) return docs;
    }
    const memDocs = memGet<DocumentScolaire>('documents') || [];
    return memDocs.filter((d: any) => d.ownerId === eleveId || d.eleveId === eleveId || d.studentId === eleveId);
  }

  public static async uploadStudentDocument(doc: DocumentScolaire & { fileData?: string }): Promise<DocumentScolaire | null> {
    if (isElectron() && api()?.uploadStudentDocument) return (await api()?.uploadStudentDocument(doc)) || null;
    return memAdd('documents', doc);
  }

  public static async importStudentDocuments(eleveId: string, category?: string): Promise<DocumentScolaire[]> {
    if (isElectron() && api()?.importStudentDocuments) return (await api()?.importStudentDocuments(eleveId, category)) || [];
    return [];
  }

  public static async importStudentFolder(eleveId: string, category?: string): Promise<DocumentScolaire[]> {
    if (isElectron() && api()?.importStudentFolder) return (await api()?.importStudentFolder(eleveId, category)) || [];
    return [];
  }

  public static async importStudentImage(eleveId: string, name?: string, base64?: string): Promise<DocumentScolaire | null> {
    if (isElectron() && api()?.importStudentImage) {
      const res = await api()?.importStudentImage(eleveId, name, base64);
      if (res) return res;
    }
    const newDoc: DocumentScolaire = {
      id: uuid(),
      originalName: name || 'document_scan.jpg',
      nomFichier: name || 'document_scan.jpg',
      size: base64 ? Math.round((base64.length * 3) / 4) : 1024,
      category: 'PJ',
      mimeType: base64?.split(';')[0]?.replace('data:', '') || 'image/jpeg',
      dateAjout: new Date().toISOString(),
      ownerId: eleveId,
      base64Content: base64,
    } as any;
    return memAdd('documents', newDoc);
  }

  public static async compressStudentDocuments(eleveId: string, ids?: string[]): Promise<DocumentScolaire | null> {
    if (isElectron() && api()?.compressStudentDocuments) return (await api()?.compressStudentDocuments(eleveId, ids)) || null;
    return null;
  }

  public static async deleteStudentDocument(idOrOwnerId: string, id?: string): Promise<void> {
    const targetId = id || idOrOwnerId;
    if (isElectron() && api()?.deleteStudentDocument) { await api()?.deleteStudentDocument(targetId); }
    memDelete('documents', targetId);
  }

  public static async readStudentDocument(id: string): Promise<any> {
    if (isElectron() && api()?.readStudentDocument) return (await api()?.readStudentDocument(id)) || null;
    const memDocs = memGet<DocumentScolaire>('documents') || [];
    const found: any = memDocs.find((d: any) => d.id === id);
    if (found?.base64Content || found?.fileData) {
      return { data: found.base64Content || found.fileData, dataUrl: found.base64Content || found.fileData, mimeType: found.mimeType || 'image/jpeg', originalName: found.originalName || found.nomFichier || 'document', isArchive: false };
    }
    return null;
  }

  public static async renameStudentDocument(id: string, newName: string): Promise<DocumentScolaire | null> {
    if (isElectron() && api()?.renameStudentDocument) return (await api()?.renameStudentDocument(id, newName)) || null;
    return memUpdate<DocumentScolaire>('documents', id, { originalName: newName, nomFichier: newName } as any);
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
    memoryDb.auditLog = [];
    memoryDb.classes.forEach(c => c.nombreEleves = 0);
    memoryDb.schoolYears.forEach(y => y.nombreElevesTotal = 0);
    return { success: true, message: 'Base de données nettoyée avec succès (0 élève, 0 enseignant).' };
  }

  // ── RÔLES & PERMISSIONS SYSTEME ───────────────────────────────────────
  public static getPermissionsForRole(role: RôleSystème): RolePermissions {
    return PERMISSIONS_MAP[role] || PERMISSIONS_MAP['TEACHER'];
  }

  // ── JOURNAL D'AUDIT ─────────────────────────────────────────────────────
  public static async addAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<void> {
    const full: AuditLogEntry = {
      ...entry,
      id: typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    // Best-effort — never blocks the UI
    try {
      if (isElectron()) {
        await api()?.addAuditEntry(full);
      } else {
        memAdd('auditLog', full);
      }
    } catch (_) {}
  }

  public static async getAuditLog(filters?: { userId?: string; module?: string; action?: string; dateFrom?: string; dateTo?: string }): Promise<AuditLogEntry[]> {
    const items = await safeElectronCall<AuditLogEntry[]>(() => api()?.getAuditLog(filters), 'auditLog');
    if (!filters) return items;
    return items.filter(e => {
      if (filters.userId && e.userId !== filters.userId) return false;
      if (filters.module && e.module !== filters.module) return false;
      if (filters.action && e.action !== filters.action) return false;
      return true;
    });
  }

  /**
   * Wrapper utilitaire — loggue une action en arrière-plan sans bloquer l'UI.
   * Usage: LocalDatabaseService.logAction('PAIEMENT', 'FINANCE', 'TransactionPaiement', id, { montant: 500 })
   */
  public static logAction(
    action: string,
    module: string,
    entite?: string,
    entiteId?: string,
    details?: Record<string, any>
  ): void {
    const user = this._currentUser;
    this.addAuditEntry({
      userId: user?.id,
      userNom: user ? `${user.nom}` : undefined,
      userRole: user?.role,
      action,
      module,
      entite,
      entiteId,
      details,
    }).catch(() => {});
  }

  // ── PARENTS & TUTEURS (CRUD) ──────────────────────────────────────────────
  public static async getParents(): Promise<ParentTuteur[]> {
    return safeElectronCall<ParentTuteur[]>(() => api()?.getParents?.(), 'parents');
  }

  public static async addParent(parent: Omit<ParentTuteur, 'id' | 'creeLe'>): Promise<ParentTuteur> {
    const newParent: ParentTuteur = {
      ...parent,
      id: uuid(),
      enfantsIds: parent.enfantsIds ?? [],
      creeLe: new Date().toISOString(),
    };
    await safeElectronCall(() => api()?.addParent?.(newParent));
    return memAdd<ParentTuteur>('parents', newParent);
  }

  public static async updateParent(id: string, updates: Partial<ParentTuteur>): Promise<ParentTuteur | null> {
    const fromDb = await safeElectronCall<ParentTuteur | null>(() => api()?.updateParent?.(id, updates));
    if (fromDb) return memUpdate<ParentTuteur>('parents', id, fromDb);
    return memUpdate<ParentTuteur>('parents', id, updates);
  }

  public static async deleteParent(id: string): Promise<void> {
    await safeElectronCall(() => api()?.deleteParent?.(id));
    memDelete('parents', id);
  }

  /**
   * Lie un élève à un parent : ajoute l'ID de l'élève dans enfantsIds du parent,
   * et met à jour le champ parentId de l'élève.
   */
  public static async lierEleveParent(eleveId: string, parentId: string): Promise<void> {
    const parents = memGet<ParentTuteur>('parents');
    const parent = parents.find((p) => p.id === parentId);
    if (parent) {
      const ids = Array.from(new Set([...(parent.enfantsIds ?? []), eleveId]));
      await this.updateParent(parentId, { enfantsIds: ids });
    }
    await this.updateEleve(eleveId, { parentId } as any);
  }

  /**
   * Dé-lie un élève d'un parent (lors de changement de parent ou suppression).
   */
  public static async delierEleveParent(eleveId: string, parentId: string): Promise<void> {
    const parents = memGet<ParentTuteur>('parents');
    const parent = parents.find((p) => p.id === parentId);
    if (parent) {
      const ids = (parent.enfantsIds ?? []).filter((id) => id !== eleveId);
      await this.updateParent(parentId, { enfantsIds: ids });
    }
  }

  // ── RETENUE ABSENCES NON APPROUVÉES ──────────────────────────────────────
  /**
   * Calcule la retenue sur salaire pour les absences REFUSÉES (non justifiées)
   * d'un membre du personnel pour un mois donné.
   * @param staffId  ID du personnel
   * @param mois     Mois ciblé ex: "2026-03" (YYYY-MM)
   * @param leaves   Liste des congés/absences (passée pour éviter double fetch)
   * @param membre   Données du personnel (salaire, taux)
   * @returns { joursAbsents: number, montantRetenue: number }
   */
  public static calculerRetenueAbsences(
    staffId: string,
    mois: string,
    leaves: Array<{ staffId: string; statut: string; impactePaie?: boolean; dateDebut: string; dateFin: string; nombreJours: number }>,
    membre: Pick<MembrePersonnel, 'salaireBase' | 'modeRemuneration' | 'tauxHoraireBase' | 'volumeHoraireHebdo'>
  ): { joursAbsents: number; montantRetenue: number } {
    const absencesRefusees = leaves.filter((l) => {
      if (l.staffId !== staffId) return false;
      if (l.statut !== 'REFUSE') return false;
      if (l.impactePaie === false) return false; // exclues manuellement
      // Vérifie si l'absence est dans le mois ciblé
      const debut = l.dateDebut.slice(0, 7);
      const fin = l.dateFin.slice(0, 7);
      return debut <= mois && fin >= mois;
    });

    const joursAbsents = absencesRefusees.reduce((sum, l) => sum + (l.nombreJours || 1), 0);

    let montantRetenue = 0;
    if (membre.modeRemuneration === 'TAUX_HORAIRE' && membre.tauxHoraireBase) {
      const heuresParJour = membre.volumeHoraireHebdo ? Math.round(membre.volumeHoraireHebdo / 5) : 6;
      montantRetenue = membre.tauxHoraireBase * heuresParJour * joursAbsents;
    } else {
      montantRetenue = (membre.salaireBase / 30) * joursAbsents;
    }

    return { joursAbsents, montantRetenue: Math.round(montantRetenue * 100) / 100 };
  }
}

