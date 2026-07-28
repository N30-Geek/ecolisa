// Ecolisa Core Types Definition

export type SystemRole = 
  | 'PROMOTEUR_ADMIN'
  | 'PREFET_DIRECTEUR'
  | 'DIRECTEUR_ETUDES'
  | 'DIRECTEUR_DISCIPLINE'
  | 'COMPTABLE'
  | 'TITULAIRE'
  | 'ENSEIGNANT'
  | 'PARENT_ELEVE';

export type CycleCode = 'PRESCHOOL' | 'PRIMAIRE' | 'CTEB' | 'HUMANITES' | 'CUSTOM';

export interface Cycle {
  id: string;
  code: CycleCode;
  name: string;
  citeCode: string; // e.g. "CITE 100", "CITE 244", "CITE 344"
}

export interface AcademicClass {
  id: string;
  cycleId: string;
  name: string; // e.g. "7ème CTEB", "3ème Math-Physique", "6ème Primaire"
  roomNumber: string;
  isCustom?: boolean;
  studentCount: number;
  mainTeacher: string;
}

export interface Student {
  id: string;
  registrationNumber: string; // Matricule ex: "2026-ED-094"
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  birthDate: string;
  birthPlace: string;
  status: 'ACTIVE' | 'TRANSFERED' | 'FINALIST' | 'EXCLUDED';
  classId: string;
  className: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  psychopedagogicalNotes?: string;
  photoUrl?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  coefficient: number;
  maxScore: number;
  category: 'SCIENCES' | 'LANGUES' | 'CULTURE_GENERALE' | 'PRATIQUE' | 'OPTION';
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  term: '1ER_TRIMESTRE' | '2EME_TRIMESTRE' | '3EME_TRIMESTRE' | 'EXAMEN_D_ETAT';
  type: 'INTERROGATION' | 'EXAMEN' | 'PRATIQUE';
  score: number;
  maxScore: number;
  createdAt: string;
}

export interface StudentBulletin {
  student: Student;
  term: string;
  academicYear: string;
  subjectGrades: {
    subjectName: string;
    coefficient: number;
    scoreInterro: number;
    scoreExam: number;
    total: number;
    maxTotal: number;
    appreciation: string;
  }[];
  totalPoints: number;
  maxPointsTotal: number;
  percentage: number;
  rank: number;
  totalStudents: number;
  conductScore: 'TB' | 'B' | 'M' | 'MAV';
  deOpinion: string;
  prefetSignature: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  status: 'PRESENT' | 'ABSENT_JUSTIFIED' | 'ABSENT_UNJUSTIFIED' | 'LATE';
  reason?: string;
}

export interface FeeType {
  id: string;
  title: string; // Minerval, Frais d'Examen, Bus, Uniforme
  amount: number;
  currency: 'USD' | 'CDF';
  tranche: 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';
}

export interface StudentInvoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  currency: 'USD' | 'CDF';
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  dueDate: string;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  studentName: string;
  registrationNumber: string;
  amountPaid: number;
  currency: 'USD' | 'CDF';
  paymentMethod: 'CASH' | 'FLEXPAY_MPESA' | 'FLEXPAY_ORANGE' | 'FLEXPAY_AIRTEL' | 'FLUTTERWAVE_CARD';
  reference: string;
  receiptNumber: string;
  createdAt: string;
  cashierName: string;
  qrCodeToken: string;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: 'TEACHER' | 'ACCOUNTANT' | 'PREFECT' | 'SURVEILLANT' | 'DE' | 'ADMIN';
  phone: string;
  email: string;
  baseSalary: number;
  currency: 'USD';
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED';
  assignedClasses?: string[];
  avatarUrl?: string;
}

export interface Payslip {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  monthYear: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPaid: number;
  paidAt: string;
  paymentMethod: string;
}

// License & Offline Sync Types
export interface OfflineLicense {
  hwid: string;
  planType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'TRIAL_30';
  startsAt: string;
  expiresAt: string;
  gracePeriodUntil: string;
  signatureEd25519: string;
  isValid: boolean;
  isGracePeriod: boolean;
  daysRemaining: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncedAt: string;
  pendingQueueCount: number;
  localDbSizeMb: number;
  cloudSyncState: 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE';
}

export interface FacultyUpdate {
  id: string;
  authorName: string;
  authorRole: string;
  avatarUrl: string;
  title: string;
  timeAgo: string;
  type: 'SYLLABUS' | 'GRADES_SUBMITTED' | 'LEAVE_REQUEST';
  needsApproval?: boolean;
}

export interface EventItem {
  id: string;
  dateDay: string; // e.g. "OCT 12"
  title: string;
  timeLocation: string;
}
