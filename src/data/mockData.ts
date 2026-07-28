import { 
  Cycle, 
  AcademicClass, 
  Student, 
  Subject, 
  Grade, 
  FeeType, 
  StudentInvoice, 
  PaymentTransaction, 
  StaffMember, 
  Payslip,
  OfflineLicense,
  SyncStatus,
  FacultyUpdate,
  EventItem
} from '../types';

export const mockCycles: Cycle[] = [
  { id: 'c1', code: 'PRESCHOOL', name: 'Maternelle / Éveil Communautaire', citeCode: 'CITE 020' },
  { id: 'c2', code: 'PRIMAIRE', name: 'Éducation de Base / Primaire', citeCode: 'CITE 100' },
  { id: 'c3', code: 'CTEB', name: 'Cycle Terminal d\'Éducation de Base (CTEB)', citeCode: 'CITE 244' },
  { id: 'c4', code: 'HUMANITES', name: 'Humanités Générales & Techniques', citeCode: 'CITE 344' },
  { id: 'c5', code: 'CUSTOM', name: 'Mode International (Custom)', citeCode: 'CUSTOM' },
];

export const mockClasses: AcademicClass[] = [
  { id: 'cls-1', cycleId: 'c2', name: '6ème Primaire A', roomNumber: 'Salle P6-A', studentCount: 38, mainTeacher: 'M. Jean-Pierre Kabongo' },
  { id: 'cls-2', cycleId: 'c3', name: '7ème CTEB (Ex-1ère C.O)', roomNumber: 'Salle 7-B', studentCount: 42, mainTeacher: 'Mme Alphonsine Masika' },
  { id: 'cls-3', cycleId: 'c3', name: '8ème CTEB (Ex-2ème C.O)', roomNumber: 'Salle 8-A', studentCount: 40, mainTeacher: 'M. Christian Lokole' },
  { id: 'cls-4', cycleId: 'c4', name: '3ème Math-Physique', roomNumber: 'Labo Sciences', studentCount: 32, mainTeacher: 'Prof. Alan Turing (Adj.)' },
  { id: 'cls-5', cycleId: 'c4', name: '4ème Chimie-Biologie', roomNumber: 'Salle Bio-2', studentCount: 35, mainTeacher: 'Dr. Sarah Jenkins' },
  { id: 'cls-6', cycleId: 'c4', name: '4ème Commerciale & Gestion', roomNumber: 'Salle Com-1', studentCount: 29, mainTeacher: 'M. Patrice Kanyama' },
];

export const mockStudents: Student[] = [
  {
    id: 'std-1',
    registrationNumber: '2026-ED-0941',
    firstName: 'Gloire',
    lastName: 'Kambale Mukendi',
    gender: 'M',
    birthDate: '2010-04-14',
    birthPlace: 'Kinshasa',
    status: 'ACTIVE',
    classId: 'cls-4',
    className: '3ème Math-Physique',
    parentName: 'M. Robert Mukendi',
    parentPhone: '+243 81 555 0192',
    parentEmail: 'robert.mukendi@gmail.com',
    psychopedagogicalNotes: 'Excellents résultats en algèbre. Délégué adjoint de la classe.',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'std-2',
    registrationNumber: '2026-ED-0942',
    firstName: 'Divine',
    lastName: 'Bakamba Mbuyi',
    gender: 'F',
    birthDate: '2011-09-22',
    birthPlace: 'Lubumbashi',
    status: 'ACTIVE',
    classId: 'cls-4',
    className: '3ème Math-Physique',
    parentName: 'Mme Grace Mbuyi',
    parentPhone: '+243 99 444 8812',
    parentEmail: 'grace.mbuyi@yahoo.fr',
    psychopedagogicalNotes: 'Très assidue, participation active en physique moderne.',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'std-3',
    registrationNumber: '2026-ED-0943',
    firstName: 'Emmanuel',
    lastName: 'Tshilombo Kasongo',
    gender: 'M',
    birthDate: '2012-01-15',
    birthPlace: 'Goma',
    status: 'ACTIVE',
    classId: 'cls-3',
    className: '8ème CTEB',
    parentName: 'Dr. Joseph Kasongo',
    parentPhone: '+243 82 111 3490',
    psychopedagogicalNotes: 'Capacité d’analyse remarquable en informatique et algorithmes.',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'std-4',
    registrationNumber: '2026-ED-0944',
    firstName: 'Naomie',
    lastName: 'Nzuzi Lumumba',
    gender: 'F',
    birthDate: '2010-11-08',
    birthPlace: 'Matadi',
    status: 'ACTIVE',
    classId: 'cls-5',
    className: '4ème Chimie-Biologie',
    parentName: 'M. Antoine Lumumba',
    parentPhone: '+243 85 999 2011',
    psychopedagogicalNotes: 'Intérêt prononcé pour la biochimie et la pharmacologie.',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'std-5',
    registrationNumber: '2026-ED-0945',
    firstName: 'Jonathan',
    lastName: 'Mwamba Ngalula',
    gender: 'M',
    birthDate: '2011-03-30',
    birthPlace: 'Kisangani',
    status: 'ACTIVE',
    classId: 'cls-2',
    className: '7ème CTEB',
    parentName: 'Mme Sarah Ngalula',
    parentPhone: '+243 90 777 4422',
    psychopedagogicalNotes: 'Nécessite soutien occasionnel en rédaction d’expression écrite.',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  }
];

export const mockSubjects: Subject[] = [
  { id: 'sub-1', name: 'Mathématiques & Algèbre', code: 'MATH', coefficient: 4, maxScore: 20, category: 'SCIENCES' },
  { id: 'sub-2', name: 'Physique Quantique & Mécanique', code: 'PHYS', coefficient: 3, maxScore: 20, category: 'SCIENCES' },
  { id: 'sub-3', name: 'Chimie Organique', code: 'CHIM', coefficient: 3, maxScore: 20, category: 'SCIENCES' },
  { id: 'sub-4', name: 'Langue Française & Littérature', code: 'FRAN', coefficient: 3, maxScore: 20, category: 'LANGUES' },
  { id: 'sub-5', name: 'Anglais Scientifique', code: 'ANGL', coefficient: 2, maxScore: 20, category: 'LANGUES' },
  { id: 'sub-6', name: 'Informatique & Programmation', code: 'INFO', coefficient: 3, maxScore: 20, category: 'PRATIQUE' },
  { id: 'sub-7', name: 'Éducation à la Citoyenneté (Civisme)', code: 'CIVI', coefficient: 1, maxScore: 20, category: 'CULTURE_GENERALE' },
];

export const mockFeeTypes: FeeType[] = [
  { id: 'fee-1', title: 'Minerval - 1er Trimestre (Frais d\'Études)', amount: 180, currency: 'USD', tranche: 'TRIMESTRIEL' },
  { id: 'fee-2', title: 'Frais de Laboratoire & Informatique', amount: 45, currency: 'USD', tranche: 'ANNUEL' },
  { id: 'fee-3', title: 'Frais de Tenue & Insignes Officiels', amount: 35, currency: 'USD', tranche: 'ANNUEL' },
  { id: 'fee-4', title: 'Assurance Scolaire & Santé', amount: 20, currency: 'USD', tranche: 'ANNUEL' },
];

export const mockInvoices: StudentInvoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'FAC-2026-0089',
    studentId: 'std-1',
    studentName: 'Gloire Kambale Mukendi',
    className: '3ème Math-Physique',
    academicYear: '2025-2026',
    totalAmount: 280,
    paidAmount: 280,
    currency: 'USD',
    status: 'PAID',
    dueDate: '2026-10-15'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'FAC-2026-0090',
    studentId: 'std-2',
    studentName: 'Divine Bakamba Mbuyi',
    className: '3ème Math-Physique',
    academicYear: '2025-2026',
    totalAmount: 280,
    paidAmount: 180,
    currency: 'USD',
    status: 'PARTIAL',
    dueDate: '2026-10-15'
  },
  {
    id: 'inv-3',
    invoiceNumber: 'FAC-2026-0091',
    studentId: 'std-3',
    studentName: 'Emmanuel Tshilombo Kasongo',
    className: '8ème CTEB',
    academicYear: '2025-2026',
    totalAmount: 240,
    paidAmount: 0,
    currency: 'USD',
    status: 'UNPAID',
    dueDate: '2026-10-15'
  }
];

export const mockPayments: PaymentTransaction[] = [
  {
    id: 'pay-101',
    invoiceId: 'inv-1',
    studentName: 'Gloire Kambale Mukendi',
    registrationNumber: '2026-ED-0941',
    amountPaid: 280,
    currency: 'USD',
    paymentMethod: 'FLEXPAY_MPESA',
    reference: 'MPESA-TX-993848201',
    receiptNumber: 'REC-2026-0412',
    createdAt: '2026-07-25 14:32:00',
    cashierName: 'Guichet Mobile (FlexPay RDC)',
    qrCodeToken: 'ECOLISA-VERIF-993848201-OK'
  },
  {
    id: 'pay-102',
    invoiceId: 'inv-2',
    studentName: 'Divine Bakamba Mbuyi',
    registrationNumber: '2026-ED-0942',
    amountPaid: 180,
    currency: 'USD',
    paymentMethod: 'CASH',
    reference: 'CASH-REC-001294',
    receiptNumber: 'REC-2026-0413',
    createdAt: '2026-07-26 09:15:00',
    cashierName: 'Mme Chantal Bondo (Comptabilité)',
    qrCodeToken: 'ECOLISA-VERIF-CASH-001294'
  }
];

export const mockStaff: StaffMember[] = [
  {
    id: 'stf-1',
    firstName: 'Dr. Sarah',
    lastName: 'Jenkins',
    role: 'TEACHER',
    phone: '+243 81 000 1122',
    email: 'sarah.jenkins@ecolisa.edu',
    baseSalary: 1200,
    currency: 'USD',
    status: 'ACTIVE',
    assignedClasses: ['3ème Math-Physique', '4ème Chimie-Biologie'],
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stf-2',
    firstName: 'Prof. Alan',
    lastName: 'Turing',
    role: 'TEACHER',
    phone: '+243 82 222 3344',
    email: 'alan.turing@ecolisa.edu',
    baseSalary: 1450,
    currency: 'USD',
    status: 'ACTIVE',
    assignedClasses: ['7ème CTEB', '8ème CTEB'],
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stf-3',
    firstName: 'Mark R.',
    lastName: '(TA)',
    role: 'SURVEILLANT',
    phone: '+243 85 444 5566',
    email: 'mark.ta@ecolisa.edu',
    baseSalary: 650,
    currency: 'USD',
    status: 'ON_LEAVE',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  }
];

export const mockEvents: EventItem[] = [
  { id: 'ev-1', dateDay: 'OCT 12', title: 'Board of Directors Meeting', timeLocation: '10:00 AM - Boardroom A' },
  { id: 'ev-2', dateDay: 'OCT 15', title: 'Fall Semester Midterms Start', timeLocation: 'Campus Wide' },
  { id: 'ev-3', dateDay: 'OCT 22', title: 'Alumni Gala Dinner', timeLocation: 'Grand Hall' },
];

export const mockFacultyUpdates: FacultyUpdate[] = [
  {
    id: 'fu-1',
    authorName: 'Dr. Sarah Jenkins',
    authorRole: 'Enseignante Physique',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    title: 'published a new syllabus for Advanced Physics.',
    timeAgo: '2 hours ago',
    type: 'SYLLABUS'
  },
  {
    id: 'fu-2',
    authorName: 'Prof. Alan Turing',
    authorRole: 'Directeur des Études Adj.',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    title: 'submitted final grades for CS101.',
    timeAgo: '5 hours ago',
    type: 'GRADES_SUBMITTED'
  },
  {
    id: 'fu-3',
    authorName: 'Mark R. (TA)',
    authorRole: 'Surveillant Général',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    title: 'requested emergency leave for Oct 14-16.',
    timeAgo: '1 day ago',
    type: 'LEAVE_REQUEST',
    needsApproval: true
  }
];

export const initialOfflineLicense: OfflineLicense = {
  hwid: 'HWID-ED25519-RDC-99201-NODE-MAC',
  planType: 'ANNUAL',
  startsAt: '2026-01-01',
  expiresAt: '2026-12-31',
  gracePeriodUntil: '2027-01-14',
  signatureEd25519: '302a300506032b6570032100e42d7f80459c909623812a149c991f827f8a1239847120aef1294',
  isValid: true,
  isGracePeriod: false,
  daysRemaining: 155
};

export const initialSyncStatus: SyncStatus = {
  isOnline: true,
  lastSyncedAt: '2026-07-29 01:40:00',
  pendingQueueCount: 0,
  localDbSizeMb: 14.8,
  cloudSyncState: 'IDLE'
};
