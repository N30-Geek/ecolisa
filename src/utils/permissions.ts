import { RôleSystème, RolePermissions } from '../types';

export const ROLE_DETAILS: Record<RôleSystème, RolePermissions> = {
  PROMOTEUR_ADMIN: {
    role: 'PROMOTEUR_ADMIN',
    label: 'Promoteur & Admin Système',
    description: "Accès complet & administration globale du réseau d'établissement.",
    allowedTabs: [
      'dashboard', 'students', 'apprenants', 'classes', 'subjects', 'years', 'teachers',
      'schedule', 'grades', 'examens', 'invoices', 'payroll', 'expenses', 'fees',
      'cash', 'accounting', 'reports', 'analytics', 'discipline', 'hr', 'leaves',
      'infirmerie', 'cantine', 'ressources', 'transport', 'library', 'documents',
      'messages', 'license', 'settings', 'users', 'audit'
    ],
    canEditConfig: true,
    canManageUsers: true,
    canManageFinance: true,
    canManagePedagogy: true,
    canEnterGrades: true
  },
  PREFET_DIRECTEUR: {
    role: 'PREFET_DIRECTEUR',
    label: 'Préfet / Directeur',
    description: 'Direction pédagogique et administrative de l\'établissement.',
    allowedTabs: [
      'dashboard', 'students', 'apprenants', 'classes', 'subjects', 'years',
      'teachers', 'schedule', 'grades', 'examens', 'discipline', 'hr',
      'leaves', 'infirmerie', 'cantine', 'transport', 'library', 'documents',
      'messages', 'invoices', 'reports'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: true,
    canEnterGrades: true
  },
  DIRECTEUR_ETUDES: {
    role: 'DIRECTEUR_ETUDES',
    label: 'Directeur des Études',
    description: 'Gestion de la pédagogie, cotes, grilles d\'horaires et délibérations.',
    allowedTabs: [
      'dashboard', 'students', 'apprenants', 'classes', 'subjects', 'years',
      'schedule', 'grades', 'examens', 'documents', 'messages'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: true,
    canEnterGrades: true
  },
  DIRECTEUR_DISCIPLINE: {
    role: 'DIRECTEUR_DISCIPLINE',
    label: 'Dir. de Discipline',
    description: 'Suivi de la conduite, absences, retenues et registre de discipline.',
    allowedTabs: [
      'dashboard', 'students', 'discipline', 'schedule', 'documents', 'messages'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: false,
    canEnterGrades: false
  },
  COMPTABLE: {
    role: 'COMPTABLE',
    label: 'Comptable Intendant Général',
    description: 'Gestion complète de la caisse, facturation, paie et états financiers.',
    allowedTabs: [
      'dashboard', 'invoices', 'cash', 'payroll', 'expenses', 'fees',
      'accounting', 'reports', 'analytics', 'students', 'apprenants', 'documents', 'messages'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: true,
    canManagePedagogy: false,
    canEnterGrades: false
  },
  SECRETAIRE: {
    role: 'SECRETAIRE',
    label: 'Secrétariat & Admissions',
    description: 'Inscriptions des élèves, dossiers administratifs et délivrance d\'attestations.',
    allowedTabs: [
      'dashboard', 'students', 'apprenants', 'classes', 'years', 'invoices', 'cash', 'documents', 'messages'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: false,
    canEnterGrades: false
  },
  INTENDANT: {
    role: 'INTENDANT',
    label: 'Intendant Financier',
    description: 'Opérateur caisse, enregistrement des paiements et génération des reçus.',
    allowedTabs: [
      'dashboard', 'invoices', 'cash', 'students', 'apprenants', 'documents'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: false,
    canEnterGrades: false
  },
  CENSEUR: {
    role: 'CENSEUR',
    label: 'Censeur des Études',
    description: 'Supervision pédagogique et suivi des cahiers de textes et programmes.',
    allowedTabs: [
      'dashboard', 'students', 'apprenants', 'classes', 'subjects', 'schedule', 'grades', 'examens', 'discipline', 'documents'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: true,
    canEnterGrades: false
  },
  TITULAIRE: {
    role: 'TITULAIRE',
    label: 'Enseignant Titulaire',
    description: 'Gestion de sa classe attribuée, présences et préparation des bulletins.',
    allowedTabs: [
      'dashboard', 'students', 'grades', 'schedule', 'classes', 'documents'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: false,
    canEnterGrades: true
  },
  ENSEIGNANT: {
    role: 'ENSEIGNANT',
    label: 'Enseignant / Professeur',
    description: 'Saisie des notes d\'interrogations/examens et consultation des horaires.',
    allowedTabs: [
      'dashboard', 'grades', 'schedule'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: false,
    canEnterGrades: true
  },
  PARENT_ELEVE: {
    role: 'PARENT_ELEVE',
    label: 'Parent & Élève',
    description: 'Portail famille : consultation du bulletin et solde des frais scolaires.',
    allowedTabs: [
      'dashboard', 'grades', 'invoices'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: false,
    canEnterGrades: false
  }
};

/**
 * Vérifie si le rôle a accès à un onglet donné.
 */
export function hasTabAccess(role: RôleSystème, tabId: string): boolean {
  const details = ROLE_DETAILS[role];
  if (!details) return false;
  return details.allowedTabs.includes(tabId);
}

/**
 * Récupère le premier onglet autorisé pour un rôle (repli).
 */
export function getDefaultTabForRole(role: RôleSystème): string {
  const details = ROLE_DETAILS[role];
  if (!details || !details.allowedTabs.length) return 'dashboard';
  return details.allowedTabs[0];
}

/**
 * Détermine si la connexion sous ce rôle nécessite un code PIN de sécurité (Comptable, Intendant, Promoteur).
 */
export function roleRequiresPin(role: RôleSystème): boolean {
  return role === 'PROMOTEUR_ADMIN' || role === 'COMPTABLE' || role === 'INTENDANT';
}

/**
 * Normalise un code rôle quelconque vers le RôleSystème officiel d'ECOLISA.
 */
export function normalizeRole(rawRole: string | undefined | null): RôleSystème {
  if (!rawRole) return 'ENSEIGNANT';
  const upper = String(rawRole).toUpperCase().trim();
  switch (upper) {
    case 'PROMOTEUR_ADMIN':
    case 'PROMOTEUR':
    case 'SUPERADMIN':
    case 'ADMIN_SYSTEM':
      return 'PROMOTEUR_ADMIN';
    case 'PREFET_DIRECTEUR':
    case 'PREFET':
    case 'DIRECTEUR':
    case 'DIR':
      return 'PREFET_DIRECTEUR';
    case 'DIRECTEUR_ETUDES':
    case 'DE':
    case 'DIR_ETUDES':
      return 'DIRECTEUR_ETUDES';
    case 'DIRECTEUR_DISCIPLINE':
    case 'DD':
    case 'DIR_DISCIPLINE':
    case 'SURVEILLANT':
    case 'SURVEILLANT_GENERAL':
      return 'DIRECTEUR_DISCIPLINE';
    case 'COMPTABLE':
    case 'COMPTABILITE':
      return 'COMPTABLE';
    case 'SECRETAIRE':
    case 'SECRETARIAT':
    case 'ADMIN':
      return 'SECRETAIRE';
    case 'INTENDANT':
    case 'INTENDANCE':
    case 'CAISSIER':
      return 'INTENDANT';
    case 'CENSEUR':
      return 'CENSEUR';
    case 'TITULAIRE':
    case 'PROFESSEUR_TITULAIRE':
      return 'TITULAIRE';
    case 'ENSEIGNANT':
    case 'PROFESSEUR':
    case 'PROF':
      return 'ENSEIGNANT';
    case 'PARENT_ELEVE':
    case 'PARENT':
    case 'ELEVE':
    case 'TUTEUR':
      return 'PARENT_ELEVE';
    default:
      return 'ENSEIGNANT';
  }
}

