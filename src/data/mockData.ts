import { 
  CycleScolaire, 
  ClasseScolaire, 
  Eleve, 
  Discipline, 
  TypeFrais, 
  FactureEleve, 
  TransactionPaiement, 
  MembrePersonnel, 
  LicenceOffline,
  StatutSynchro,
  ActualiteEnseignant,
  EvenementScolaire
} from '../types';

export const mockCycles: CycleScolaire[] = [
  { id: 'c1', code: 'PRESCHOOL', nom: 'École Maternelle & Éveil', codeCite: 'CITE 020' },
  { id: 'c2', code: 'PRIMAIRE', nom: 'Éducation de Base / Primaire', codeCite: 'CITE 100' },
  { id: 'c3', code: 'CTEB', nom: 'Cycle Terminal d\'Éducation de Base (CTEB)', codeCite: 'CITE 244' },
  { id: 'c4', code: 'HUMANITES', nom: 'Humanités Générales & Techniques', codeCite: 'CITE 344' },
  { id: 'c5', code: 'CUSTOM', nom: 'Mode International (Personnalisé)', codeCite: 'CUSTOM' },
];

export const mockClasses: ClasseScolaire[] = [
  { id: 'cls-1', cycleId: 'c2', nom: '6ème Primaire A', salle: 'Salle P6-A', nombreEleves: 38, professeurTitulaire: 'M. Jean-Pierre Kabongo' },
  { id: 'cls-2', cycleId: 'c3', nom: '7ème CTEB (Ex-1ère C.O)', salle: 'Salle 7-B', nombreEleves: 42, professeurTitulaire: 'Mme Alphonsine Masika' },
  { id: 'cls-3', cycleId: 'c3', nom: '8ème CTEB (Ex-2ème C.O)', salle: 'Salle 8-A', nombreEleves: 40, professeurTitulaire: 'M. Christian Lokole' },
  { id: 'cls-4', cycleId: 'c4', nom: '3ème Math-Physique', salle: 'Labo Sciences', nombreEleves: 32, professeurTitulaire: 'Prof. Alan Turing' },
  { id: 'cls-5', cycleId: 'c4', nom: '4ème Chimie-Biologie', salle: 'Salle Bio-2', nombreEleves: 35, professeurTitulaire: 'Dr. Sarah Jenkins' },
  { id: 'cls-6', cycleId: 'c4', nom: '4ème Commerciale & Gestion', salle: 'Salle Com-1', nombreEleves: 29, professeurTitulaire: 'M. Patrice Kanyama' },
];

export const mockStudents: Eleve[] = [
  {
    id: 'std-1',
    registrationNumber: '2026-ED-0941',
    prenom: 'Gloire',
    nom: 'Kambale',
    postnom: 'Mukendi',
    sexe: 'M',
    dateNaissance: '2010-04-14',
    lieuNaissance: 'Kinshasa',
    statut: 'ACTIF',
    classId: 'cls-4',
    nomClasse: '3ème Math-Physique',
    nomParent: 'M. Robert Mukendi',
    telephoneParent: '+243 81 555 0192',
    emailParent: 'robert.mukendi@gmail.com',
    notesPsychopedagogiques: 'Excellents résultats en algèbre. Délégué adjoint de la classe.',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'std-2',
    registrationNumber: '2026-ED-0942',
    prenom: 'Divine',
    nom: 'Bakamba',
    postnom: 'Mbuyi',
    sexe: 'F',
    dateNaissance: '2011-09-22',
    lieuNaissance: 'Lubumbashi',
    statut: 'ACTIF',
    classId: 'cls-4',
    nomClasse: '3ème Math-Physique',
    nomParent: 'Mme Grace Mbuyi',
    telephoneParent: '+243 99 444 8812',
    emailParent: 'grace.mbuyi@yahoo.fr',
    notesPsychopedagogiques: 'Très assidue, participation active en physique moderne.',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'std-3',
    registrationNumber: '2026-ED-0943',
    prenom: 'Emmanuel',
    nom: 'Tshilombo',
    postnom: 'Kasongo',
    sexe: 'M',
    dateNaissance: '2012-01-15',
    lieuNaissance: 'Goma',
    statut: 'ACTIF',
    classId: 'cls-3',
    nomClasse: '8ème CTEB',
    nomParent: 'Dr. Joseph Kasongo',
    telephoneParent: '+243 82 111 3490',
    notesPsychopedagogiques: 'Capacité d’analyse remarquable en informatique.',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'std-4',
    registrationNumber: '2026-ED-0944',
    prenom: 'Naomie',
    nom: 'Nzuzi',
    postnom: 'Lumumba',
    sexe: 'F',
    dateNaissance: '2010-11-08',
    lieuNaissance: 'Matadi',
    statut: 'ACTIF',
    classId: 'cls-5',
    nomClasse: '4ème Chimie-Biologie',
    nomParent: 'M. Antoine Lumumba',
    telephoneParent: '+243 85 999 2011',
    notesPsychopedagogiques: 'Intérêt prononcé pour la biochimie et la pharmacologie.',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  }
];

export const mockSubjects: Discipline[] = [
  { id: 'sub-1', nom: 'Mathématiques & Algèbre', code: 'MATH', coefficient: 4, maxScore: 20, categorie: 'SCIENCES' },
  { id: 'sub-2', nom: 'Physique Quantique & Mécanique', code: 'PHYS', coefficient: 3, maxScore: 20, categorie: 'SCIENCES' },
  { id: 'sub-3', nom: 'Chimie Organique', code: 'CHIM', coefficient: 3, maxScore: 20, categorie: 'SCIENCES' },
  { id: 'sub-4', nom: 'Langue Française & Littérature', code: 'FRAN', coefficient: 3, maxScore: 20, categorie: 'LANGUES' },
  { id: 'sub-5', nom: 'Anglais Scientifique', code: 'ANGL', coefficient: 2, maxScore: 20, categorie: 'LANGUES' },
  { id: 'sub-6', nom: 'Informatique & Programmation', code: 'INFO', coefficient: 3, maxScore: 20, categorie: 'PRATIQUE' },
  { id: 'sub-7', nom: 'Éducation à la Citoyenneté (Civisme)', code: 'CIVI', coefficient: 1, maxScore: 20, categorie: 'CULTURE_GENERALE' },
];

export const mockFeeTypes: TypeFrais[] = [
  { id: 'fee-1', titre: 'Minerval - 1er Trimestre (Frais d\'Études)', montant: 180, devise: 'USD', tranche: 'TRIMESTRIEL' },
  { id: 'fee-2', titre: 'Frais de Laboratoire & Informatique', montant: 45, devise: 'USD', tranche: 'ANNUEL' },
  { id: 'fee-3', titre: 'Frais de Tenue & Insignes Officiels', montant: 35, devise: 'USD', tranche: 'ANNUEL' },
  { id: 'fee-4', titre: 'Assurance Scolaire & Santé', montant: 20, devise: 'USD', tranche: 'ANNUEL' },
];

export const mockInvoices: FactureEleve[] = [
  {
    id: 'inv-1',
    numeroFacture: 'FAC-2026-0089',
    studentId: 'std-1',
    nomEleve: 'Gloire Kambale Mukendi',
    nomClasse: '3ème Math-Physique',
    anneeScolaire: '2025-2026',
    montantTotal: 280,
    montantPaye: 280,
    devise: 'USD',
    statut: 'PAYE',
    dateEcheance: '2026-10-15'
  },
  {
    id: 'inv-2',
    numeroFacture: 'FAC-2026-0090',
    studentId: 'std-2',
    nomEleve: 'Divine Bakamba Mbuyi',
    nomClasse: '3ème Math-Physique',
    anneeScolaire: '2025-2026',
    montantTotal: 280,
    montantPaye: 180,
    devise: 'USD',
    statut: 'PARTIEL',
    dateEcheance: '2026-10-15'
  },
  {
    id: 'inv-3',
    numeroFacture: 'FAC-2026-0091',
    studentId: 'std-3',
    nomEleve: 'Emmanuel Tshilombo Kasongo',
    nomClasse: '8ème CTEB',
    anneeScolaire: '2025-2026',
    montantTotal: 240,
    montantPaye: 0,
    devise: 'USD',
    statut: 'NON_PAYE',
    dateEcheance: '2026-10-15'
  }
];

export const mockPayments: TransactionPaiement[] = [
  {
    id: 'pay-101',
    invoiceId: 'inv-1',
    nomEleve: 'Gloire Kambale Mukendi',
    registrationNumber: '2026-ED-0941',
    montantPaye: 280,
    devise: 'USD',
    moyenPaiement: 'FLEXPAY_MPESA',
    reference: 'MPESA-TX-993848201',
    numeroRecu: 'REC-2026-0412',
    dateCreation: '2026-07-25 14:32:00',
    nomCaissier: 'Guichet Mobile (FlexPay RDC)',
    jetonQrCode: 'ECOLISA-VERIF-993848201-OK'
  },
  {
    id: 'pay-102',
    invoiceId: 'inv-2',
    nomEleve: 'Divine Bakamba Mbuyi',
    registrationNumber: '2026-ED-0942',
    montantPaye: 180,
    devise: 'USD',
    moyenPaiement: 'CASH',
    reference: 'CASH-REC-001294',
    numeroRecu: 'REC-2026-0413',
    dateCreation: '2026-07-26 09:15:00',
    nomCaissier: 'Mme Chantal Bondo (Comptabilité)',
    jetonQrCode: 'ECOLISA-VERIF-CASH-001294'
  }
];

export const mockStaff: MembrePersonnel[] = [
  {
    id: 'stf-1',
    prenom: 'Dr. Sarah',
    nom: 'Jenkins',
    role: 'ENSEIGNANT',
    telephone: '+243 81 000 1122',
    email: 'sarah.jenkins@ecolisa.edu',
    salaireBase: 1200,
    devise: 'USD',
    statut: 'ACTIF',
    classesAssignees: ['3ème Math-Physique', '4ème Chimie-Biologie'],
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stf-2',
    prenom: 'Prof. Alan',
    nom: 'Turing',
    role: 'ENSEIGNANT',
    telephone: '+243 82 222 3344',
    email: 'alan.turing@ecolisa.edu',
    salaireBase: 1450,
    devise: 'USD',
    statut: 'ACTIF',
    classesAssignees: ['7ème CTEB', '8ème CTEB'],
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  }
];

export const mockEvents: EvenementScolaire[] = [
  { id: 'ev-1', dateJour: '12 OCT', titre: 'Conseil d\'Administration & Direction', heureLieu: '10h00 - Salle du Conseil A' },
  { id: 'ev-2', dateJour: '15 OCT', titre: 'Début des Examens du 1er Semestre', heureLieu: 'Toutes les classes EPST' },
  { id: 'ev-3', dateJour: '22 OCT', titre: 'Réunion des Parents d\'Élèves (Comité)', heureLieu: 'Grande Salle des Fêtes' },
];

export const mockFacultyUpdates: ActualiteEnseignant[] = [
  {
    id: 'fu-1',
    nomAuteur: 'Dr. Sarah Jenkins',
    roleAuteur: 'Enseignante Physique',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    titre: 'a publié un nouveau prépa de Physique Quantique.',
    ilYA: 'Il y a 2 heures',
    type: 'SYLLABUS'
  },
  {
    id: 'fu-2',
    nomAuteur: 'Prof. Alan Turing',
    roleAuteur: 'Directeur des Études Adj.',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    titre: 'a transmis les cotes finales d\'Informatique.',
    ilYA: 'Il y a 5 heures',
    type: 'COTES_SOUMISES'
  },
  {
    id: 'fu-3',
    nomAuteur: 'Mark R. (TA)',
    roleAuteur: 'Surveillant Général',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    titre: 'a sollicité un congé exceptionnel du 14 au 16 Oct.',
    ilYA: 'Hier',
    type: 'DEMANDE_CONGE',
    necessiteApprobation: true
  }
];

export const initialOfflineLicense: LicenceOffline = {
  hwid: 'HWID-ED25519-RDC-99201-NODE-MAC',
  typePlan: 'ANNUEL',
  debutLe: '2026-01-01',
  expireLe: '2026-12-31',
  graceJusquAu: '2027-01-14',
  signatureEd25519: '302a300506032b6570032100e42d7f80459c909623812a149c991f827f8a1239847120aef1294',
  estValide: true,
  estEnPeriodeDeGrace: false,
  joursRestants: 155
};

export const initialSyncStatus: StatutSynchro = {
  estEnLigne: true,
  derniereSynchroA: '2026-07-29 01:40:00',
  nombreEnAttente: 0,
  tailleDbLocaleMo: 14.8,
  etatSynchroCloud: 'INACTIF'
};
