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
  province?: string;
  provinceOrigine?: string;
  territoireCommune?: string;
  chefferieSecteur?: string;
  groupement?: string;
  village?: string;
  adressePhysique?: string;
  nationalite?: string;
  groupeSanguin?: string;
  allergies?: string;
  informationsMedicales?: string;
  description?: string;
  telephoneEleve?: string;
  emailEleve?: string;
  nomPere?: string;
  telephonePere?: string;
  professionPere?: string;
  emailPere?: string;
  nomMere?: string;
  telephoneMere?: string;
  professionMere?: string;
  emailMere?: string;
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

// ─── Settings Module Types ────────────────────────────────────────────────────

export interface ConfigEtablissement {
  // Identité
  nomOfficiel: string;
  acronyme: string;
  devise: string; // Slogan/devise
  // Agrément EPST
  numeroAgrement: string;
  numeroIdentificationNationale: string;
  codeEPST: string;
  // Localisation
  province: string;
  territoireCommune: string;
  quartier: string;
  avenue: string;
  numero: string;
  // Contact
  telephone1: string;
  telephone2?: string;
  email: string;
  siteWeb?: string;
  // Direction
  nomPrefetDirecteur: string;
  nomDirecteurEtudes: string;
  nomCenseur?: string;
  nomSecrétaireGeneral?: string;
  // Financier
  deviseLocale: 'USD' | 'CDF' | 'USD_CDF';
  // Visuel
  logoUrl?: string;
  couleurPrimaire?: string;
  couleurSecondaire?: string;
}

export interface AnneeScolaire {
  id: string;
  libelle: string; // ex: "2025-2026"
  dateDebut: string;
  dateFin: string;
  debutTrimestre1: string;
  finTrimestre1: string;
  debutTrimestre2: string;
  finTrimestre2: string;
  debutTrimestre3: string;
  finTrimestre3: string;
  estActive: boolean;
  estArchivee: boolean;
}

export interface Salle {
  id: string;
  classId: string;
  nomSalle: string; // ex: "Salle 1", "Bloc A - S3"
  capacite: number;
  batiment?: string;
}

export interface OptionSecondaire {
  id: string;
  code: string; // ex: "MATH_PHY"
  nom: string; // ex: "Mathématiques-Physique"
  filiere: 'GENERALES' | 'TECHNIQUES' | 'PROFESSIONNELLES';
  description?: string;
}

export interface MatièreEPST {
  id: string;
  code: string; // ex: "FR", "MATH", "PHYS"
  nom: string;
  categorie: 'GENERALE' | 'SPECIFIQUE' | 'PRATIQUE' | 'RELIGIEUSE';
  optionsApplicables: string[]; // IDs des options ou ['ALL'] pour cours généraux
  coefficientDefaut: number;
  maxScoreDefaut: number;
  isActive: boolean; // L'admin peut la désactiver
}

export interface ClasseConfig {
  id: string;
  cycleId: string;
  optionId?: string; // Seulement pour humanités
  nom: string; // ex: "3ème Math-Physique A"
  effectifMax: number;
  salles: Salle[];
  professeurTitulaireNom?: string;
}

export interface FraisAnnexeConfig {
  id: string;
  intitule: string;
  montant: number;
  devise: 'USD' | 'CDF';
  obligatoire: boolean;
  typeFrais: 'INSCRIPTION' | 'REINSCRIPTION' | 'CONNEXION' | 'CARTE' | 'KIT' | 'AUTRE';
  priorite?: string;
  portee?: string;
}

export interface SalleConfig {
  id: string;
  codeSalle: string;
  nomSalle: string;
  capacite: number;
  cycleCode: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';
}

export interface CycleConfig {
  id: string;
  code: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';
  nom: string;
  actif: boolean;
  classesCount: number;
  sallesCount: number;
}

export interface AnneeScolaireConfig {
  id: string;
  nom: string;
  statut: 'EN_COURS' | 'CLOTUREE' | 'PLANIFIEE';
  debut: string;
  fin: string;
  nombreElevesTotal: number;
  fraisInscription: number;
  fraisConnexion: number;
  fraisReinscription: number;
  fraisCarte: number;
  fraisAnnexes: FraisAnnexeConfig[];
  cycles: CycleConfig[];
  salles: SalleConfig[];
  semestres: { id: string; nom: string; statut: string; fin: string }[];
  periodes: { id: string; nom: string; debut: string; fin: string; type: 'PERIOD' | 'EXAM' }[];
}

export interface UserAccount {
  id: string;
  email: string;
  nom: string;
  prenom?: string;
  role: RôleSystème;
  pinCode?: string;
  avatarUrl?: string;
  statut: 'ACTIF' | 'SUSPENDU';
  telephone?: string;
  creeLe: string;
  derniereConnexion?: string;
}

export interface RolePermissions {
  role: RôleSystème;
  label: string;
  description: string;
  allowedTabs: string[];
  canEditConfig: boolean;
  canManageUsers: boolean;
  canManageFinance: boolean;
  canManagePedagogy: boolean;
  canEnterGrades: boolean;
}

