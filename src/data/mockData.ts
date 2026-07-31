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

// Cycles scolaires de référence EPST RDC
export const mockCycles: CycleScolaire[] = [
  { id: 'c1', code: 'PRESCHOOL', nom: 'École Maternelle & Éveil', codeCite: 'CITE 020' },
  { id: 'c2', code: 'PRIMAIRE', nom: 'Éducation de Base / Primaire', codeCite: 'CITE 100' },
  { id: 'c3', code: 'CTEB', nom: 'Cycle Terminal d\'Éducation de Base (CTEB)', codeCite: 'CITE 244' },
  { id: 'c4', code: 'HUMANITES', nom: 'Humanités Générales & Techniques', codeCite: 'CITE 344' },
  { id: 'c5', code: 'CUSTOM', nom: 'Mode International (Personnalisé)', codeCite: 'CUSTOM' },
];

// Registres vierges réinitialisés pour mise en production et tests réels
export const mockClasses: ClasseScolaire[] = [];
export const mockStudents: Eleve[] = [];
export const mockSubjects: Discipline[] = [];
export const mockFeeTypes: TypeFrais[] = [];
export const mockInvoices: FactureEleve[] = [];
export const mockPayments: TransactionPaiement[] = [];
export const mockStaff: MembrePersonnel[] = [];
export const mockEvents: EvenementScolaire[] = [];
export const mockFacultyUpdates: ActualiteEnseignant[] = [];

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
  derniereSynchroA: '2026-07-31 04:00:00',
  nombreEnAttente: 0,
  tailleDbLocaleMo: 0.2,
  etatSynchroCloud: 'INACTIF'
};
