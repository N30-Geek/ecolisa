// Définition des Types ECOLISA - 100% Français

export type RôleSystème = 
  | 'PROMOTEUR_ADMIN'       // Promoteur — vue globale réseau + admin système
  | 'PREFET_DIRECTEUR'      // Préfet (secondaire) / Directeur (primaire/maternel)
  | 'DIRECTEUR_ETUDES'      // Directeur des Études — pédagogie & résultats
  | 'DIRECTEUR_DISCIPLINE'  // Directeur de Discipline / Censeur
  | 'COMPTABLE'             // Comptable Intendant Général — finances complètes
  | 'SECRETAIRE'            // Secrétariat — inscriptions, dossiers, documents
  | 'INTENDANT'             // Intendant Financier — caisse, reçus, remises
  | 'TITULAIRE'             // Enseignant Titulaire de classe
  | 'ENSEIGNANT'            // Enseignant / Professeur
  | 'CENSEUR'               // Censeur des études (secondaire)
  | 'PARENT_ELEVE';         // Espace parent & élève (lecture seule)

export type CodeCycle = 'PRESCHOOL' | 'PRIMAIRE' | 'CTEB' | 'HUMANITES' | 'CUSTOM';

export interface CycleScolaire {
  id: string;
  code: CodeCycle;
  nom: string;
  codeCite: string; // ex: "CITE 100", "CITE 244", "CITE 344"
}

export interface OptionConfig {
  id: string;
  code: string;         // ex: "Math-Physique", "Biologie-Chimie", "TRONC_COMMUN"
  nom: string;          // libellé lisible
  cycleCode: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';
}

export interface ClasseScolaire {
  id: string;
  schoolYearId?: string;
  cycleId: string;
  cycleCode?: string;
  nom: string; // ex: "7ème CTEB", "3ème Math-Physique", "6ème Primaire"
  salle: string;
  salleCode?: string;   // code de la salle physique liée
  optionCode?: string;  // option / section (TRONC_COMMUN si pas d'option)
  estPersonnalise?: boolean;
  nombreEleves: number;
  capacite?: number;
  professeurTitulaire: string;

  // Gestion multi-salles / multi-options / multi-promotions
  salles?: string[];
  options?: string[];
  promotionIds?: string[];

  // Tarification par classe
  fraisInscription?: number;
  fraisMinerval?: number;
  fraisAnnexe?: number;
  devise?: string;
}

// ─── Parent / Tuteur ────────────────────────────────────────────────────────
export type LienParente = 'PERE' | 'MERE' | 'TUTEUR' | 'GRAND_PARENT' | 'ONCLE_TANTE' | 'AUTRE';

export interface ParentTuteur {
  id: string;
  nom: string;
  prenom?: string;
  postnom?: string;
  lienParente: LienParente;
  telephone: string;
  telephoneSecondaire?: string;
  email?: string;
  profession?: string;
  employeur?: string;
  adresse?: string;
  province?: string;
  nationalite?: string;
  photoUrl?: string;
  enfantsIds: string[];   // IDs des élèves scolarisés dans cet établissement
  observations?: string;
  creeLe?: string;
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
  schoolYearId: string;
  classId: string;
  nomClasse: string;
  // Lien Parent/Tuteur
  parentId?: string;           // ID du ParentTuteur principal (père/mère/tuteur)
  nomParent: string;
  telephoneParent: string;
  emailParent?: string;
  notesPsychopedagogiques?: string;
  photoUrl?: string;

  // Scolarité
  regime?: 'EXTERNE' | 'INTERNE' | 'SEMI_INTERNE';
  langue?: string;
  langueInstruction?: string;
  optionEPST?: string;
  salleId?: string;
  salle?: string;

  // Dossier complet supplémentaire
  numeroActeNaissance?: string;
  ecoleOrigine?: string;
  religion?: string;
  religionAutre?: string;
  langueMaternelle?: string;
  handicap?: string;
  aptitudes?: string;
  vaccinations?: string;
  medecinTraitant?: string;
  assuranceSante?: string;
  numeroCarteSante?: string;
  nomTuteur?: string;
  telephoneTuteur?: string;
  professionTuteur?: string;
  relationTuteur?: string;
  adresseTuteur?: string;
  nomReferentUrgence?: string;
  telephoneReferentUrgence?: string;
  relationReferentUrgence?: string;
  transportScolaire?: 'AUCUN' | 'BUS' | 'VOITURE' | 'MOTO' | 'PIED';
  cantine?: boolean;
  internat?: boolean;
  boursier?: boolean;
  aideSociale?: boolean;
  anneePrecedente?: string;
  moyenneAnneePrecedente?: number;
  dateInscription?: string;
}

export interface Discipline {
  id: string;
  nom: string;
  code: string;
  coefficient: number;
  maxScore: number; // Max Période
  maxExamen?: number; // Max Examen = Max Période * 2
  maxSemestre?: number; // Max Semestre = Max Période * 4
  maxAnnuel?: number; // Max Annuel = Max Période * 8
  isOptionMajora?: boolean;
  categorie: 'SCIENCES' | 'LANGUES' | 'CULTURE_GENERALE' | 'PRATIQUE' | 'OPTION' | string;
  cycleCode?: string;
  optionCode?: string;
}

export type TypeEvaluation =
  | 'INTERROGATION'
  | 'DEVOIR'
  | 'EXERCICE_CONTROLE'
  | 'EXAMEN'
  | 'EXAMEN_BLANC'
  | 'PRATIQUE'
  | 'PROJET'
  | 'COMPOSITION';

export interface Cote {
  id: string;
  evaluationId?: string;
  eleveId: string;
  anneeScolaireId?: string;
  matiereId?: string;
  classeId?: string;
  periode: string;
  type: TypeEvaluation;
  score: number;
  maxScore: number;
  poids?: number;
  dateCote?: string;
  titre?: string;
  libelle?: string;
}

export interface Presence {
  id: string;
  eleveId: string;
  anneeScolaireId?: string;
  classeId?: string;
  dateJour: string;
  statut: 'PRESENT' | 'ABSENT' | 'RETARD' | 'JUSTIFIE';
  motif?: string;
}

export interface SchoolEvent {
  id: string;
  anneeScolaireId?: string;
  titre: string;
  subtitre?: string;
  dateDebut: string;
  dateFin?: string;
  categorie: 'RENTRÉE_CLÔTURE' | 'EXAMENS_JURY' | 'VACANCES' | 'FÉRIÉ' | 'AUTRE';
  publicCible: 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE' | 'SECONDAIRE_EXETAT';
  highlight?: boolean;
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
  devise: string;
  tranche: 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';
}

export interface FactureEleve {
  id: string;
  anneeScolaireId?: string;
  schoolYearId?: string;
  numeroFacture: string;
  eleveId?: string;
  studentId: string;
  classeId?: string;
  nomEleve: string;
  nomClasse: string;
  anneeScolaire: string;
  montantTotal: number;
  montantPaye: number;
  devise: string;
  statut: 'NON_PAYE' | 'PARTIEL' | 'PAYE';
  dateEcheance: string;
  lignes?: LigneFacture[];
}

export interface TransactionPaiement {
  id: string;
  anneeScolaireId?: string;
  invoiceId: string;
  eleveId?: string;
  studentId?: string;
  nomEleve: string;
  registrationNumber: string;
  montantPaye: number;
  devise: string;
  moyenPaiement: 'CASH' | 'BANK' | 'FLEXPAY_MPESA' | 'FLEXPAY_ORANGE' | 'FLEXPAY_AIRTEL' | 'FLUTTERWAVE_CARTE';
  reference: string;
  numeroRecu: string;
  dateCreation: string;
  nomCaissier: string;
  jetonQrCode: string;
  allocations?: Array<{ feeTypeId: string; trancheId?: string; montant: number }>;
}

export interface UserAccount {
  id: string;
  email: string;
  nom: string;
  prenom?: string;
  role: RôleSystème;
  pinCode?: string;
  avatarUrl?: string;
  statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF';
  telephone?: string;
  creeLe: string;
  derniereConnexion?: string;
  usernameGenerated?: string;
  generatedPassword?: string;
}

export interface DocumentScolaire {
  id: string;
  eleveId?: string;
  staffId?: string;
  ownerId?: string;
  anneeScolaireId?: string;
  type?: string;
  nomFichier?: string;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  category?: string;
  sizeBytes?: number;
  size?: number;
  storagePath?: string;
  url?: string;
  dateAjout?: string;
  taille?: string;
  isArchive?: boolean;
  archiveCount?: number;
  createdAt?: string;
  description?: string;
}

export type GradeEnseignant = 'AGREGE' | 'LICENCIE' | 'GRADUAT' | 'DES' | 'DOCTEUR' | 'AUTRE';
export type TypeContratPersonnel = 'PERMANENT' | 'VACATAIRE' | 'BENEVOLE' | 'INTERIMAIRE';

export interface MembrePersonnel {
  id: string;
  // Identité
  prenom: string;
  postnom?: string;
  nom: string;
  genre?: 'M' | 'F';
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  adresse?: string;
  // Contact
  telephone: string;
  telephoneSecondaire?: string;
  email: string;
  // Rôle & Fonction
  role: RôleSystème | 'ENSEIGNANT' | 'COMPTABLE' | 'PREFET' | 'SURVEILLANT' | 'DE' | 'ADMIN' | string;
  titreOfficiel?: string;
  // Qualification & Compétences
  grade?: GradeEnseignant;
  diplome?: string;
  specialite?: string;
  disciplines?: string[];          // matières enseignées
  qualitesCompetences?: string[];  // aptitudes & compétences pédagogiques
  // Affectation granulaire par cycle
  cyclePrincipal?: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE';
  salleUniqueId?: string;           // Pour Maternelle/Primaire (enseignant unique titulaire de sa classe)
  estTitulaire?: boolean;
  classeTitulaireId?: string;
  classesTitularisees?: string[];   // Multi-titularisation possible par enseignant
  optionTitulaireCode?: string;
  coursAttribues?: string[];       // Pour le Secondaire : liste des IDs/noms des cours attribués
  classesAssignees?: string[];     // Classes secondaires où il enseigne
  cyclesAssignes?: string[];       // ex: ['MATERNELLE', 'PRIMAIRE', 'HUMANITES']
  optionsAssignees?: string[];      // ex: ['Math-Physique', 'Biologie-Chimie']
  // Contrat
  typeContrat?: TypeContratPersonnel;
  dateEmbauche?: string;
  dateFinContrat?: string;
  // Informations Médicales & Santé
  groupeSanguin?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
  allergies?: string;
  antecedentsMedicaux?: string;
  medecinTraitant?: string;
  centreSanteRef?: string;
  // Urgences & Personnes de Référence
  contactUrgenceNom?: string;
  contactUrgenceLien?: string;     // ex: Époux/Épouse, Parent, Frère, Proche
  contactUrgenceTelephone?: string;
  contactUrgenceAdresse?: string;
  referenceProfessionnelle?: string;
  referenceContact?: string;       // Téléphone / Email du référent
  referenceOrganisme?: string;     // Établissement / Entreprise du référent
  personnelEnCharge?: string;      // Rôle ou équipe encadrée / Élèves sous responsabilité
  // État Civil Étendu & Famille
  etatCivil?: 'CELIBATAIRE' | 'MARIE' | 'VEUF' | 'DIVORCE';
  nomConjoint?: string;
  nombreEnfantsACharge?: number;
  nombreEnfantsEtablissement?: number;
  nomsEnfantsEtablissement?: string;
  // Coordonnées Bancaires & Mobile Money
  modeVersementSalaire?: 'BANQUE' | 'MOBILE_MONEY' | 'CASH_CAISSE';
  banqueNom?: string;               // ex: Rawbank, Equity BCDC, BOA, TMB
  numeroCompteBancaire?: string;
  mobileMoneyOperateur?: string;    // ex: M-Pesa, Orange Money, Airtel Money
  mobileMoneyNumero?: string;
  // Rémunération & Mode de Paie
  modeRemuneration?: 'SALAIRE_FIXE' | 'TAUX_HORAIRE' | 'MIXTE';
  tauxHoraireBase?: number;         // ex: 6.5 USD / heure
  tauxHoraireParNiveau?: Record<string, number>; // ex: { '7e CTEB': 5, '4e Humanites': 8 }
  volumeHoraireHebdo?: number;      // ex: 18h / semaine
  heuresPresteesMois?: number;       // ex: 72h prestées le mois en cours
  salaireBase: number;
  devise: string;
  // Identifiants officiels
  numeroMatriculeEPST?: string;
  matricule?: string;
  sexe?: 'M' | 'F';
  qualification?: string;
  photoUrl?: string;
  numeroINSS?: string;
  // Statut
  statut: 'ACTIF' | 'EN_CONGE' | 'SUSPENDU' | 'INACTIF';
  // Visuel
  avatarUrl?: string;
  notesBiographiques?: string;
  creeLe?: string;
  motDePasse?: string;
  password?: string;
}

// ─── FICHES DE PAIE (PERSONNEL) ─────────────────────────────────────────────
export interface LigneFichePaie {
  id: string;
  libelle: string;
  montant: number;
  devise: string;
  type: 'PRIME' | 'DEDUCTION' | 'AVANCE';
  categorie?: string;
}

export interface FichePaie {
  id: string;
  staffId: string;
  staffName: string;
  staffMatricule?: string;
  staffRole?: string;
  staffFunction?: string;
  staffBankAccount?: string;
  staffMobileMoney?: string;
  staffPaymentMode?: string;
  periode: string; // MM-YYYY
  schoolYearId?: string;
  anneeScolaire?: string;
  salaireBase: number;
  devise: string;
  heuresPrestees?: number;
  lignes: LigneFichePaie[];
  salaireBrut: number;
  totalPrimes: number;
  totalDeductions: number;
  totalAvances: number;
  salaireNet: number;
  modePaiement: 'CASH' | 'BANQUE' | 'MOBILE_MONEY';
  reference?: string;
  datePaiement?: string;
  caissier: string;
  statut: 'BROUILLON' | 'VALIDE' | 'PAYE';
  numeroFiche?: string;
  notes?: string;
  origineExpenseId?: string;
}

export type StatutAnnéeScolaire = 'EN_COURS' | 'CLOTUREE' | 'PLANIFIEE';

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
  deviseLocale: string;
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
  devise: string;
  obligatoire: boolean;
  typeFrais: string;
  priorite?: string;
  portee?: string;
  modePaiement?: 'UNIQUE' | 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | 'PERSONNALISE';
  nombreTranches?: number;
}

export interface SalleConfig {
  id: string;
  codeSalle: string;
  nomSalle: string;
  capacite: number;
  cycleCode: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';
  batiment?: string;
  statut?: 'DISPONIBLE' | 'OCCUPEE' | 'MAINTENANCE';
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
  options?: OptionConfig[];
  salles: SalleConfig[];
  semestres: { id: string; nom: string; statut: string; fin: string }[];
  periodes: { id: string; nom: string; debut: string; fin: string; type: 'PERIOD' | 'EXAM' }[];
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

// ─── Finance & Comptabilité ────────────────────────────────────────────────

export type CategorieFrais =
  | 'FRAIS_INSCRIPTION'
  | 'FRAIS_REINSCRIPTION'
  | 'FRAIS_MINERVAL'
  | 'FRAIS_CONNEXES'
  | 'FRAIS_KITS_EQUIPEMENTS'
  | 'FRAIS_BUS'
  | 'FRAIS_UNIFORME'
  | 'FRAIS_EXAMEN'
  | 'FRAIS_CARTE'
  | 'FRAIS_ACTIVITE'
  | 'AUTRE';

export type ModePaiementFrais = 'UNIQUE' | 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | 'PERSONNALISE';

export interface FraisTranche {
  id: string;
  nom: string;
  montant: number;
  devise: string;
  dateEcheance?: string;
  ordre: number;
}

export interface TypeFraisScolaire {
  id: string;
  code: string;
  nom: string;
  categorie: CategorieFrais;
  montant: number;
  devise: string;
  obligatoire: boolean;
  portee?: 'TOUS' | string;
  anneeScolaireId?: string;
  schoolYearId?: string;
  // Ciblage automatique
  cycleId?: 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES' | string;
  classId?: string;       // ID de la classe spécifique (ciblage précis)
  salleId?: string;       // ID de la salle spécifique
  optionCode?: 'TOUS' | 'TRONC_COMMUN' | string;
  regime?: 'TOUS' | 'EXTERNE' | 'INTERNE' | 'SEMI_INTERNE';
  actif?: boolean;
  // Gestion des tranches (RDC : minerval par mois, etc.)
  modePaiement?: ModePaiementFrais;
  nombreTranches?: number;
  tranches?: FraisTranche[];
  priorite?: number;
}

export interface LigneFacture {
  id: string;
  invoiceId: string;
  feeTypeId: string;
  trancheId?: string; // pour les frais échelonnés (mensualisés)
  nom: string;
  categorie: CategorieFrais;
  montant: number;
  devise: string;
  montantPaye?: number;
}

export interface OperationCaisse {
  id: string;
  date: string;
  libelle: string;
  motif?: string;
  description?: string;
  montant: number;
  devise: string;
  type: 'ENTREE' | 'SORTIE' | 'TRANSFERT';
  categorie: string;
  modePaiement: 'CASH' | 'BANQUE' | 'MOBILE_MONEY' | string;
  reference?: string;
  caissier: string;
  validePar?: string;
  pieceJustificative?: string;
  beneficiaire?: string;
  anneeScolaireId?: string;
  schoolYearId?: string;
  origine?: 'PAYMENT' | 'EXPENSE' | 'MANUAL' | 'PAYROLL';
  origineId?: string;
}

export type DepenseCaisse = OperationCaisse;

export type TypeCompteComptable = 'ACTIF' | 'PASSIF' | 'CAPITAUX' | 'CHARGE' | 'PRODUIT';

export interface CompteComptable {
  id: string;
  code: string;
  nom: string;
  type: TypeCompteComptable;
  parentId?: string;
  actif: boolean;
}

export interface JournalComptable {
  id: string;
  code: string;
  nom: string;
  type: 'ACHATS' | 'VENTES' | 'CAISSE' | 'BANQUE' | 'OD' | 'PAYE';
  actif: boolean;
}

export interface LigneEcriture {
  id: string;
  ecritureId?: string;
  compteId: string;
  compteCode?: string;
  compteNom?: string;
  debit: number;
  credit: number;
  devise?: string;
  libelle?: string;
}

export interface EcritureComptable {
  id: string;
  journalId: string;
  journalCode?: string;
  date: string;
  reference: string;
  libelle: string;
  piece?: string;
  devise?: string;
  lignes: LigneEcriture[];
}

export interface BudgetPrevisionnel {
  id: string;
  schoolYearId?: string;
  periode: string; // ex: 2025-01, T1-2025, 2025
  dateDebut?: string;
  dateFin?: string;
  categorie: string;
  type: 'REVENU' | 'DEPENSE';
  montant: number;
  devise: string;
  note?: string;
}

export interface NoteFraisProfessionnel {
  id: string;
  staffId?: string;
  staffName?: string;
  schoolYearId?: string;
  dateNote: string;
  categorie: string;
  description?: string;
  montant: number;
  devise: string;
  justificatif?: string;
  statut: 'SOUMIS' | 'VALIDE' | 'REJETE' | 'REMBOURSE';
  validePar?: string;
  dateValidation?: string;
  commentaireValidation?: string;
  montantRembourse?: number;
  dateRemboursement?: string;
  modeRemboursement?: string;
  referenceRemboursement?: string;
  creePar?: string;
  dateCreation?: string;
}

export interface HistoriqueEnvoiFacture {
  id: string;
  invoiceId?: string;
  methode: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PRINT' | 'DOWNLOAD' | 'SHARE';
  destinataire?: string;
  contact?: string;
  statut?: 'SIMULE' | 'ENVOYE' | 'ERREUR';
  dateEnvoi?: string;
  message?: string;
}

// ─── Audit & Contrôle d'Accès ─────────────────────────────────────────────────

export type ActionAudit =
  | 'CONNEXION'
  | 'DECONNEXION'
  | 'CREATION'
  | 'MODIFICATION'
  | 'SUPPRESSION'
  | 'PAIEMENT'
  | 'EXPORT'
  | 'IMPRESSION'
  | 'CONSULTATION';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userNom?: string;
  userRole?: string;
  action: ActionAudit | string;
  module?: string;         // ex: 'FINANCE', 'ELEVES', 'FRAIS', 'USERS'
  entite?: string;         // ex: 'FactureEleve', 'TypeFraisScolaire'
  entiteId?: string;       // ID de l'entité concernée
  details?: Record<string, any>;
  createdAt: string;
}
