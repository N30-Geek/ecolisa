import { RôleSystème, RolePermissions } from '../types';

export const ROLE_REQUIRED_DOCUMENTS: Record<RôleSystème, string[]> = {
  PROMOTEUR_ADMIN: ['Plan d’action annuel', 'Budget annuel validé', 'Cahier des délibérations du COGES'],
  PREFET_DIRECTEUR: ['Registre matricule', 'Registre du personnel', 'Procès-verbaux des réunions', 'Livre journal de correspondance', 'Palmarès des résultats'],
  DIRECTEUR_ECOLE: ['Registre matricule', 'Registre du personnel', 'Procès-verbaux des réunions', 'Livre journal de correspondance', 'Palmarès des résultats'],
  DIRECTEUR_ETUDES: ['Horaire général', 'Registre de suivi des matières', 'Calendrier des évaluations', 'Fiches de cotation', 'Contrôle des préparations'],
  DIRECTEUR_DISCIPLINE: ['Registre des absences', 'Cahier de discipline', 'Registre des sanctions', 'Cahier de suivi des sorties'],
  COMPTABLE: ['Livre de caisse', 'Grand livre', 'Carnets de reçus', 'Fiches de paie', 'Pièces justificatives'],
  SECRETAIRE: ['Registre des courriers arrivés', 'Registre des courriers départs', 'Dossiers des élèves', 'Dossiers administratifs du personnel', 'Registre des attestations'],
  INTENDANT: ['Registre d’inventaire', 'Cahier de gestion des stocks', 'Cahier de suivi du personnel ouvrier'],
  CENSEUR: ['Registre de contrôle pédagogique', 'Cahiers de textes', 'Rapports de visite des classes'],
  TITULAIRE: ['Registre d’appel', 'Cahier de préparation', 'Fiche de cotation', 'Cahier de discipline de classe'],
  ENSEIGNANT: ['Cahier de préparation', 'Cahier de textes', 'Fiches de cotation', 'Registre des évaluations'],
  PARENT_ELEVE: [],
};

export const ROLE_DETAILS: Record<RôleSystème, RolePermissions> = {
  PROMOTEUR_ADMIN: {
    role: 'PROMOTEUR_ADMIN',
    label: 'Promoteur & Admin Système',
    description: "Accès complet & administration globale du réseau d'établissement.",
    allowedTabs: [
      'dashboard', 'students', 'apprenants', 'classes', 'subjects', 'years', 'teachers',
      'schedule', 'grades', 'examens', 'deliberation', 'invoices', 'payroll', 'expenses', 'fees',
      'cash', 'accounting', 'reports', 'analytics', 'discipline', 'hr', 'leaves',
      'pointage', 'infirmerie', 'cantine', 'ressources', 'transport', 'library', 'documents',
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
    label: 'Préfet des Études',
    description: 'Direction pédagogique et administrative du secondaire.',
    allowedTabs: [
      'dashboard', 'students', 'apprenants', 'classes', 'subjects', 'years',
      'teachers', 'schedule', 'grades', 'examens', 'deliberation', 'discipline', 'hr',
      'leaves', 'pointage', 'infirmerie', 'cantine', 'transport', 'library', 'documents',
      'messages'
    ],
    canEditConfig: false,
    canManageUsers: false,
    canManageFinance: false,
    canManagePedagogy: true,
    canEnterGrades: true
  },
  DIRECTEUR_ECOLE: {
    role: 'DIRECTEUR_ECOLE',
    label: 'Directeur d’école (Primaire / Maternelle)',
    description: 'Direction pédagogique et administrative du cycle maternelle / primaire.',
    allowedTabs: [
      'dashboard', 'students', 'apprenants', 'classes', 'subjects', 'years',
      'teachers', 'schedule', 'grades', 'examens', 'deliberation', 'discipline', 'hr',
      'leaves', 'pointage', 'infirmerie', 'cantine', 'transport', 'library', 'documents',
      'messages'
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
      'schedule', 'grades', 'examens', 'deliberation', 'pointage', 'documents', 'messages'
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
      'dashboard', 'students', 'discipline', 'pointage', 'schedule', 'documents', 'messages'
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
      'dashboard', 'students', 'apprenants', 'classes', 'subjects', 'schedule', 'grades', 'examens', 'deliberation', 'discipline', 'documents'
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
    description: 'Gestion de sa classe attribuée, présences, épreuves et préparation des bulletins.',
    allowedTabs: [
      'dashboard', 'students', 'grades', 'examens', 'schedule', 'classes', 'pointage', 'documents'
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
    description: 'Saisie des notes, épreuves, pointage des présences et consultation des horaires.',
    allowedTabs: [
      'dashboard', 'grades', 'examens', 'schedule', 'pointage'
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

const LEADERSHIP_ROLES: RôleSystème[] = [
  'PROMOTEUR_ADMIN',
  'PREFET_DIRECTEUR',
  'DIRECTEUR_ECOLE',
  'DIRECTEUR_ETUDES',
  'DIRECTEUR_DISCIPLINE',
  'CENSEUR',
];

/** Rôles habilités à créer/modifier les informations personnelles (élèves, personnel, comptes sensibles). */
export function canEditPersonalInfo(role: RôleSystème | undefined | null): boolean {
  if (!role) return false;
  return LEADERSHIP_ROLES.includes(role);
}

/** Rôles habilités à gérer le personnel (fiches RH, comptes utilisateurs). */
export function canManagePersonnel(role: RôleSystème | undefined | null): boolean {
  return canEditPersonalInfo(role);
}

/** Rôles habilités à enregistrer une sortie de caisse / dépense. */
export function canManageCashExpense(role: RôleSystème | undefined | null): boolean {
  if (!role) return false;
  return ['PROMOTEUR_ADMIN', 'COMPTABLE', 'INTENDANT'].includes(role);
}

/** Rôles dirigeants / chefs d'établissement. */
export function isLeadershipRole(role: RôleSystème | undefined | null): boolean {
  if (!role) return false;
  return LEADERSHIP_ROLES.includes(role);
}

/** Détermine si un rôle peut voir les deux cycles Maternelle + Primaire comme un seul bloc. */
export function canAccessMaternelleAndPrimaire(role: RôleSystème | undefined | null): boolean {
  if (!role) return false;
  return role === 'PROMOTEUR_ADMIN' || role === 'DIRECTEUR_ECOLE';
}

/**
 * Étend la liste de cycles autorisés pour fusionner Maternelle / Primaire quand le rôle le permet.
 */
export function expandMaternellePrimaireScope(cycles: string[]): string[] {
  const expanded = new Set<string>(cycles);
  if (cycles.some(c => c === 'MATERNELLE' || c === 'PRIMAIRE')) {
    expanded.add('MATERNELLE');
    expanded.add('PRIMAIRE');
  }
  return Array.from(expanded);
}

/**
 * Vérifie si le rôle a accès à un onglet donné.
 */
export function normalizeAccessCycle(value: string | undefined | null): 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE' | '' {
  const code = String(value || '').toUpperCase().trim();
  if (code === 'MATERNELLE' || code === 'PRESCHOOL') return 'MATERNELLE';
  if (code === 'PRIMAIRE') return 'PRIMAIRE';
  if (code === 'SECONDAIRE' || code === 'CTEB' || code === 'SECONDAIRE_CTEB' || code === 'HUMANITES') return 'SECONDAIRE';
  return '';
}

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
    case 'PREFET_ETUDES':
    case 'PROVISEUR':
    case 'PREFET':
      return 'PREFET_DIRECTEUR';
    case 'DIRECTEUR_ECOLE':
    case 'DIRECTRICE_ECOLE':
    case 'DIRECTEUR_ECOLE_PRIMAIRE':
    case 'DIRECTEUR_ECOLE_MATERNELLE':
    case 'DIRECTEUR_D_ECOLE':
    case 'DIRECTEUR_ECOLE_PRIMAIRE_MATERNELLE':
      return 'DIRECTEUR_ECOLE';
    case 'DIRECTEUR':
    case 'DIR':
      return 'DIRECTEUR_ECOLE';
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

