/**
 * ECOLISA LocalDatabaseService
 * ─────────────────────────────────────────────────────────────────────────────
 * Toutes les donnees metier sont persistees dans le fichier SQLite .db via
 * Electron IPC (better-sqlite3). ZERO localStorage pour les donnees metier.
 * Le localStorage est reserve UNIQUEMENT au theme UI et aux preferences legeres.
 */

import {
  Eleve,
  ClasseScolaire,
  Discipline,
  FactureEleve,
  TransactionPaiement,
  MembrePersonnel,
  LicenceOffline,
  StatutSynchro,
  RôleSystème,
  AnneeScolaireConfig,
  UserAccount,
  RolePermissions
} from '../types';

export interface DepenseCaisse {
  id: string;
  motif: string;
  montant: number;
  categorie: string;
  validePar: string;
  date: string;
  modePaiement: string;
  pieceJustificative?: string;
}

export interface UserSession {
  id: string;
  email: string;
  nom: string;
  role: RôleSystème;
  token: string;
  pinCode?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Acces a l'API Electron IPC
// ─────────────────────────────────────────────────────────────────────────────
const api = () => (window as any).electronAPI as Record<string, (...args: any[]) => Promise<any>> | undefined;
const isElectron = () => !!(window as any).electronAPI?.isElectron;

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
//  SERVICE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export class LocalDatabaseService {
  private static _currentUser: UserSession | null = null;

  // Aucune init bloquante — chaque methode appelle directement l'IPC
  public static async init(): Promise<void> {
    // Restaurer la session depuis SQLite si Electron disponible
    if (isElectron()) {
      try {
        const sess = await api()!.getCurrentSession();
        if (sess) this._currentUser = sess;
      } catch (e) {
        console.warn('[DB] Impossible de restaurer la session :', e);
      }
    }
  }

  public static async resetDatabase(): Promise<void> {
    if (isElectron()) {
      // Vider la session
      await api()?.setCurrentSession(null);
      // Supprimer les configs app (onboarding, etc.)
      await api()?.deleteConfig('onboarding_completed');
      await api()?.deleteConfig('school_config');
    }
    // Nettoyer les preferences UI du localStorage
    localStorage.removeItem('ecolisa_theme');
    this._currentUser = null;
  }

  // ── CONFIG (onboarding, school_config) ────────────────────────────────────
  public static async getConfig(key: string): Promise<any> {
    if (isElectron()) {
      try {
        return await api()?.getConfig(key);
      } catch (e) {
        console.warn(`[DB] Erreur getConfig (${key}) :`, e);
        return null;
      }
    }
    return null;
  }

  public static async setConfig(key: string, value: any): Promise<void> {
    if (isElectron()) {
      try {
        await api()?.setConfig(key, value);
      } catch (e) {
        console.warn(`[DB] Erreur setConfig (${key}) :`, e);
      }
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

  // ── UTILISATEURS (CRUD) ───────────────────────────────────────────────────
  public static async getUsers(): Promise<UserAccount[]> {
    if (isElectron()) return (await api()?.getUsers()) || [];
    return [];
  }

  public static async getUserByEmail(email: string): Promise<UserAccount | null> {
    if (isElectron()) return api()?.getUserByEmail(email) || null;
    return null;
  }

  /**
   * Vérification des identifiants avec mot de passe hashé (scrypt).
   * La comparaison se fait côté main process (Node.js) — jamais dans le renderer.
   */
  public static async verifyCredentials(email: string, password: string): Promise<UserAccount | null> {
    if (isElectron()) return api()?.verifyCredentials(email, password) || null;
    return null;
  }

  public static async addUser(user: UserAccount & { password?: string }): Promise<UserAccount | null> {
    if (isElectron()) return api()?.addUser(user) || null;
    return null;
  }

  public static async updateUser(id: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    if (isElectron()) return api()?.updateUser(id, updates) || null;
    return null;
  }

  public static async deleteUser(id: string): Promise<void> {
    if (isElectron()) await api()?.deleteUser(id);
  }

  public static async authenticateUser(email: string, pinCode?: string): Promise<UserAccount | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    if (user.pinCode && pinCode && user.pinCode !== pinCode) return null;
    return user;
  }

  // ── ANNEES SCOLAIRES ──────────────────────────────────────────────────────
  public static async getSchoolYears(): Promise<AnneeScolaireConfig[]> {
    if (isElectron()) return (await api()?.getSchoolYears()) || [];
    return [];
  }

  public static async addSchoolYear(year: AnneeScolaireConfig): Promise<AnneeScolaireConfig | null> {
    if (isElectron()) return api()?.addSchoolYear(year) || null;
    return null;
  }

  public static async updateSchoolYear(id: string, updates: Partial<AnneeScolaireConfig>): Promise<AnneeScolaireConfig | null> {
    if (isElectron()) return api()?.updateSchoolYear(id, updates) || null;
    return null;
  }

  public static async deleteSchoolYear(id: string): Promise<void> {
    if (isElectron()) await api()?.deleteSchoolYear(id);
  }

  // ── CLASSES ────────────────────────────────────────────────────────────────
  public static async getClasses(yearId?: string): Promise<ClasseScolaire[]> {
    if (isElectron()) return (await api()?.getClasses(yearId)) || [];
    return [];
  }

  public static async addClass(cls: ClasseScolaire): Promise<ClasseScolaire | null> {
    if (isElectron()) return api()?.addClass(cls) || null;
    return null;
  }

  public static async updateClass(id: string, updates: Partial<ClasseScolaire>): Promise<ClasseScolaire | null> {
    if (isElectron()) return api()?.updateClass(id, updates) || null;
    return null;
  }

  public static async deleteClass(id: string): Promise<void> {
    if (isElectron()) await api()?.deleteClass(id);
  }

  // ── MATIERES ───────────────────────────────────────────────────────────────
  public static async getSubjects(): Promise<Discipline[]> {
    if (isElectron()) return (await api()?.getSubjects()) || [];
    return [];
  }

  public static async addSubject(s: Discipline): Promise<Discipline | null> {
    if (isElectron()) return api()?.addSubject(s) || null;
    return null;
  }

  public static async deleteSubject(id: string): Promise<void> {
    if (isElectron()) await api()?.deleteSubject(id);
  }

  // ── ELEVES ─────────────────────────────────────────────────────────────────
  public static async getEleves(filters?: { classId?: string; schoolYearId?: string }): Promise<Eleve[]> {
    if (isElectron()) return (await api()?.getEleves(filters)) || [];
    return [];
  }

  public static async addEleve(eleve: Eleve): Promise<Eleve | null> {
    if (isElectron()) return api()?.addEleve(eleve) || null;
    return null;
  }

  public static async updateEleve(id: string, updates: Partial<Eleve>): Promise<Eleve | null> {
    if (isElectron()) return api()?.updateEleve(id, updates) || null;
    return null;
  }

  public static async deleteEleve(id: string): Promise<void> {
    if (isElectron()) await api()?.deleteEleve(id);
  }

  // ── FINANCES ───────────────────────────────────────────────────────────────
  public static async getInvoices(yearId?: string): Promise<FactureEleve[]> {
    if (isElectron()) return (await api()?.getInvoices(yearId)) || [];
    return [];
  }

  public static async addInvoice(inv: FactureEleve): Promise<FactureEleve | null> {
    if (isElectron()) return api()?.addInvoice(inv) || null;
    return null;
  }

  public static async getPayments(invoiceId?: string): Promise<TransactionPaiement[]> {
    if (isElectron()) return (await api()?.getPayments(invoiceId)) || [];
    return [];
  }

  public static async addPayment(p: TransactionPaiement): Promise<TransactionPaiement | null> {
    if (isElectron()) return api()?.addPayment(p) || null;
    return null;
  }

  public static async getExpenses(): Promise<DepenseCaisse[]> {
    if (isElectron()) return (await api()?.getExpenses()) || [];
    return [];
  }

  public static async addExpense(e: DepenseCaisse): Promise<DepenseCaisse | null> {
    if (isElectron()) return api()?.addExpense(e) || null;
    return null;
  }

  public static async deleteExpense(id: string): Promise<void> {
    if (isElectron()) await api()?.deleteExpense(id);
  }

  // ── PERSONNEL ─────────────────────────────────────────────────────────────
  public static async getStaff(): Promise<MembrePersonnel[]> {
    if (isElectron()) return (await api()?.getStaff()) || [];
    return [];
  }

  public static async addStaff(m: MembrePersonnel): Promise<MembrePersonnel | null> {
    if (isElectron()) return api()?.addStaff(m) || null;
    return null;
  }

  // ── PERMISSIONS PAR ROLE ──────────────────────────────────────────────────
  public static getRolePermissions(role: string): RolePermissions {
    return PERMISSIONS_MAP[role] || PERMISSIONS_MAP['PROMOTEUR_ADMIN'];
  }
}

