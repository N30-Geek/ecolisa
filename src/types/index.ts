// Définition des Types ECOLISA - 100% Français

export type RôleSystème = 
  | 'PROMOTEUR_ADMIN'
  | 'PREFET_DIRECTEUR'
  | 'DIRECTEUR_ETUDES'
  | 'DIRECTEUR_DISCIPLINE'
  | 'COMPTABLE'
  | 'TITULAIRE'
  | 'ENSEIGNANT'
  | 'PARENT_ELEVE';

export type CodeCycle = 'PRESCHOOL' | 'PRIMAIRE' | 'CTEB' | 'HUMANITES' | 'CUSTOM';

export interface CycleScolaire {
  id: string;
  code: CodeCycle;
  nom: string;
  codeCite: string; // ex: "CITE 100", "CITE 244", "CITE 344"
}

export interface ClasseScolaire {
  id: string;
  cycleId: string;
  nom: string; // ex: "7ème CTEB", "3ème Math-Physique", "6ème Primaire"
  salle: string;
  estPersonnalise?: boolean;
  nombreEleves: number;
  professeurTitulaire: string;
}

export interface Eleve {
  id: string;
  registrationNumber: string; // Matricule ex: "2026-ED-094"
  prenom: string;
  nom: string;
  postnom?: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
  lieuNaissance: string;
  statut: 'ACTIF' | 'TRANSFERE' | 'FINALISTE' | 'EXCLU';
  classId: string;
  nomClasse: string;
  nomParent: string;
  telephoneParent: string;
  emailParent?: string;
  notesPsychopedagogiques?: string;
  photoUrl?: string;
}

export interface Discipline {
  id: string;
  nom: string;
  code: string;
  coefficient: number;
  maxScore: number;
  categorie: 'SCIENCES' | 'LANGUES' | 'CULTURE_GENERALE' | 'PRATIQUE' | 'OPTION';
}

export interface Cote {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  periode: '1ER_TRIMESTRE' | '2EME_TRIMESTRE' | '3EME_TRIMESTRE' | 'EXAMEN_D_ETAT';
  type: 'INTERROGATION' | 'EXAMEN' | 'PRATIQUE';
  score: number;
  maxScore: number;
  dateCreation: string;
}

export interface BulletinEleve {
  eleve: Eleve;
  periode: string;
  anneeScolaire: string;
  cotesDisciplines: {
    nomDiscipline: string;
    coefficient: number;
    scoreInterro: number;
    scoreExamen: number;
    total: number;
    maxTotal: number;
    appreciation: string;
  }[];
  pointsTotaux: number;
  pointsMaxTotaux: number;
  pourcentage: number;
  rang: number;
  effectifClasse: number;
  scoreConduite: 'TB' | 'B' | 'M' | 'MAV';
  avisDirecteurEtudes: string;
  signaturePrefet: boolean;
}

export interface TypeFrais {
  id: string;
  titre: string; // Minerval, Frais d'Examen, Bus, Uniforme
  montant: number;
  devise: 'USD' | 'CDF';
  tranche: 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';
}

export interface FactureEleve {
  id: string;
  numeroFacture: string;
  studentId: string;
  nomEleve: string;
  nomClasse: string;
  anneeScolaire: string;
  montantTotal: number;
  montantPaye: number;
  devise: 'USD' | 'CDF';
  statut: 'NON_PAYE' | 'PARTIEL' | 'PAYE';
  dateEcheance: string;
}

export interface TransactionPaiement {
  id: string;
  invoiceId: string;
  nomEleve: string;
  registrationNumber: string;
  montantPaye: number;
  devise: 'USD' | 'CDF';
  moyenPaiement: 'CASH' | 'FLEXPAY_MPESA' | 'FLEXPAY_ORANGE' | 'FLEXPAY_AIRTEL' | 'FLUTTERWAVE_CARTE';
  reference: string;
  numeroRecu: string;
  dateCreation: string;
  nomCaissier: string;
  jetonQrCode: string;
}

export interface MembrePersonnel {
  id: string;
  prenom: string;
  nom: string;
  role: 'ENSEIGNANT' | 'COMPTABLE' | 'PREFET' | 'SURVEILLANT' | 'DE' | 'ADMIN';
  telephone: string;
  email: string;
  salaireBase: number;
  devise: 'USD' | 'CDF';
  statut: 'ACTIF' | 'EN_CONGE' | 'SUSPENDU';
  classesAssignees?: string[];
  avatarUrl?: string;
}

export interface LicenceOffline {
  hwid: string;
  typePlan: 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL' | 'ESSAI_30';
  debutLe: string;
  expireLe: string;
  graceJusquAu: string;
  signatureEd25519: string;
  estValide: boolean;
  estEnPeriodeDeGrace: boolean;
  joursRestants: number;
}

export interface StatutSynchro {
  estEnLigne: boolean;
  derniereSynchroA: string;
  nombreEnAttente: number;
  tailleDbLocaleMo: number;
  etatSynchroCloud: 'INACTIF' | 'SYNCHRO_EN_COURS' | 'ERREUR' | 'HORS_LIGNE';
}

export interface ActualiteEnseignant {
  id: string;
  nomAuteur: string;
  roleAuteur: string;
  avatarUrl: string;
  titre: string;
  ilYA: string;
  type: 'SYLLABUS' | 'COTES_SOUMISES' | 'DEMANDE_CONGE';
  necessiteApprobation?: boolean;
}

export interface EvenementScolaire {
  id: string;
  dateJour: string; // ex: "12 OCT"
  titre: string;
  heureLieu: string;
}
