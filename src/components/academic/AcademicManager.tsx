import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CustomSelect } from '../common/CustomSelect';
import { StudentIdCardModal } from './StudentIdCardModal';
import { StudentFullFileModal } from './StudentFullFileModal';
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  BadgeAlert,
  TrendingUp,
  TrendingDown,
  Mail,
  Phone,
  MapPin,
  User,
  Star,
  Clock,
  BarChart2,
  FileText,
  Printer,
  Award,
  Layers,
  Sparkles,
  School,
  Lock,
  CheckCircle2,
  ArrowLeft,
  MoreVertical,
  QrCode,
  ShieldCheck,
  CreditCard,
  Heart,
  FileCheck
} from 'lucide-react';
import { Eleve, Discipline, ClasseScolaire, CycleScolaire, MembrePersonnel } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { StudentRegistrationModal } from './StudentRegistrationModal';
import { ClassesPromotionsManager } from './ClassesPromotionsManager';
import { StudentsManager } from './StudentsManager';
import { SchoolYearsTab } from './SchoolYearsTab';
import { SubjectsManager } from './SubjectsManager';
import { ScheduleManager } from './ScheduleManager';
import { GradesManager } from './GradesManager';
import { EvaluationsExamsManager } from './EvaluationsExamsManager';
import { StudentDetailPage } from './StudentDetailPage';
import { TeacherManager } from '../administration/TeacherManager';

interface AcademicManagerProps {
  activeSubTab?: string;
  activeSchoolYear?: string;
  registrationRequest?: number;
}

// â”€â”€â”€ Modèle Année Scolaire â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Modèle Année Scolaire & Tarification Complexe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface FraisAnnexeConfig {
  id: string;
  intitule: string;
  montant: number;
  devise: string;
  obligatoire: boolean;
  typeFrais: 'INSCRIPTION' | 'REINSCRIPTION' | 'CONNEXION' | 'CARTE' | 'KIT' | 'AUTRE';
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

interface AnneeScolaireConfig {
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

// ——— Composant de Pagination Réutilisable Haute Lisibilité —————————————————————
interface PaginationBarProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const pageSizeOptions = [
    { value: '5', label: '5 par page' },
    { value: '10', label: '10 par page' },
    { value: '25', label: '25 par page' },
    { value: '50', label: '50 par page' },
  ];

  return (
    <div
      className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Afficher :</span>
        <CustomSelect
          options={pageSizeOptions}
          value={String(pageSize)}
          onChange={(val) => {
            onPageSizeChange(Number(val));
            onPageChange(1);
          }}
          className="w-32"
        />
        <span className="font-semibold text-slate-500 dark:text-slate-400">
          {startItem} – {endItem} sur {totalItems} éléments
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 rounded-xl border font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/15 cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          ¹ Précédent
        </button>

        <span className="px-3 py-1.5 font-black text-indigo-500">
          Page {currentPage} / {totalPages}
        </span>

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 rounded-xl border font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/15 cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          Suivant º
        </button>
      </div>
    </div>
  );
};

// â”€â”€â”€ Shared UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
    <div>
      <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const statusBadge = (statut: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIF:     { label: 'Actif',     cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
    TRANSFERE: { label: 'Transféré', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    FINALISTE: { label: 'Finaliste', cls: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' },
    EXCLU:     { label: 'Exclu',     cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  };
  const s = map[statut] || { label: statut, cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/30' };
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${s.cls}`}>{s.label}</span>;
};

// â”€â”€â”€ ONGLET 1 : ÉLÈVES & INSCRIPTIONS AVEC PAGINATION & FICHE COMPLÈTE DÉDIÉE â”€â”€

const StudentsTab: React.FC = () => {
  const [students, setStudents] = useState<Eleve[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Eleve | null>(null);
  const [editingStudent, setEditingStudent] = useState<Eleve | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const loadData = useCallback(async () => {
    const list = await LocalDatabaseService.getEleves();
    setStudents(list || []);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const match = !q || s.prenom.toLowerCase().includes(q)
        || s.nom.toLowerCase().includes(q)
        || s.registrationNumber.toLowerCase().includes(q);
      const cls = !selectedClass || s.classId === selectedClass;
      return match && cls;
    });
  }, [students, search, selectedClass]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const classOptions = useMemo(() => [
    { value: '', label: 'Toutes les classes' },
  ], []);

  const handleRegisterNewStudent = async (newStudent: Eleve) => {
    await loadData();
    setShowRegisterModal(false);
  };

  const handleUpdateStudent = async (updated: Eleve) => {
    await loadData();
    setEditingStudent(null);
    setSelectedStudent(updated);
  };

  // Si un élève est sélectionné, on affiche la PAGE DÉDIÉE DE L'ÉLÈVE
  if (selectedStudent) {
    return (
      <StudentDetailPage
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
        onEdit={(st) => {
          setSelectedStudent(null);
          setEditingStudent(st);
        }}
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* En-tête de section */}
      <SectionHeader
        title="Élèves & Inscriptions Scolaires"
        subtitle={`${students.length} élèves inscrits · Année Scolaire 2025–2026`}
        actions={
          <>
            <button
              className="px-3.5 py-2 rounded-lg border font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Exporter Liste EPST</span>
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-500/40"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Nouveau Dossier Élève (Wizard)</span>
            </button>
          </>
        }
      />

      {/* Cartes KPI Élèves */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Total Élèves Inscrits', val: `${students.length}`, color: '#6366f1', icon: GraduationCap },
          { label: 'Statut Actif', val: `${students.filter(s => s.statut === 'ACTIF').length}`, color: '#10b981', icon: Check },
          { label: 'Filles (Parité EPST)', val: `${students.filter(s => s.sexe === 'F').length}`, color: '#ec4899', icon: Users },
          { label: 'Finalistes Exetat', val: `${students.filter(s => s.statut === 'FINALISTE').length}`, color: '#8b5cf6', icon: Star },
        ].map((s, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all hover:brightness-105"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-xs"
              style={{ background: `${s.color}15` }}
            >
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider mt-1.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de Filtrage & Recherche Intelligente */}
      <div
        className="p-3.5 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3 transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, postnom, matricule..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <CustomSelect
          options={classOptions}
          value={selectedClass}
          onChange={val => { setSelectedClass(val); setCurrentPage(1); }}
          className="w-full sm:w-64"
        />
      </div>

      {/* Table Paginée des Élèves Redessinée Haute Visibilité */}
      <div
        className="rounded-2xl border shadow-xs overflow-hidden transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="border-b uppercase tracking-wider text-[10.5px] font-bold transition-colors"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <th className="py-3.5 px-4">Élève & Photo</th>
                <th className="py-3.5 px-4">Matricule EPST</th>
                <th className="py-3.5 px-4">Classe</th>
                <th className="py-3.5 px-4">Sexe</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Parent / Contact</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginatedStudents.map(s => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-500/5 transition-colors group"
                >
                  {/* Nom & Photo */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {s.photoUrl ? (
                        <img
                          src={s.photoUrl}
                          alt={s.prenom}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-500/20 shadow-xs shrink-0"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs"
                          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
                        >
                          {s.prenom[0]}{s.nom[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                          {s.prenom} {s.nom}
                        </p>
                        <p className="text-[10.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {s.postnom || '—'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Matricule EPST */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                      {s.registrationNumber}
                    </span>
                  </td>

                  {/* Classe */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                      {s.nomClasse}
                    </span>
                  </td>

                  {/* Sexe */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border ${
                        s.sexe === 'M'
                          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                      }`}
                    >
                      {s.sexe === 'M' ? 'Masculin' : 'Féminin'}
                    </span>
                  </td>

                  {/* Statut */}
                  <td className="py-3.5 px-4">
                    {statusBadge(s.statut)}
                  </td>

                  {/* Parent / Contact */}
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {s.nomParent}
                      </p>
                      <p className="text-[10.5px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {s.telephoneParent}
                      </p>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-500/40"
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span>Voir la fiche</span>
                      </button>

                      {/* Bouton Options 3 points */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenActionMenuId(openActionMenuId === s.id ? null : s.id)}
                          className="p-1.5 rounded-lg border text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition-colors cursor-pointer"
                          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                          title="Options de l'élève"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openActionMenuId === s.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-52 rounded-xl border shadow-xl z-50 p-1.5 space-y-0.5 text-left animate-scale-in"
                            style={{
                              background: 'var(--sidebar-popover-bg)',
                              borderColor: 'var(--sidebar-popover-border)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <button
                              onClick={() => { setSelectedStudent(s); setOpenActionMenuId(null); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Voir la Fiche Élève</span>
                            </button>
                            <button
                              onClick={() => { setEditingStudent(s); setOpenActionMenuId(null); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Éditer le Dossier Élève</span>
                            </button>
                            <button
                              onClick={() => { setSelectedStudent(s); setOpenActionMenuId(null); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Imprimer Carte QR</span>
                            </button>
                            <button
                              onClick={() => setOpenActionMenuId(null)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Bulletin Trimestriel</span>
                            </button>
                            <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                            <button
                              onClick={async () => {
                                await LocalDatabaseService.deleteEleve(s.id);
                                await loadData();
                                setOpenActionMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Supprimer l'Élève</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">Aucun élève ne correspond à votre recherche.</p>
          </div>
        )}

        {/* Contrôles de Pagination Paginée */}
        <PaginationBar
          totalItems={filtered.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Onboarding Wizard Inscription / Modification Élève */}
      {(showRegisterModal || editingStudent) && (
        <StudentRegistrationModal
          initialStudent={editingStudent || undefined}
          onBack={() => {
            setShowRegisterModal(false);
            setEditingStudent(null);
          }}
          onRegister={handleRegisterNewStudent}
          onUpdate={handleUpdateStudent}
        />
      )}
    </div>
  );
};

// â”€â”€â”€ ONGLET 2 : CLASSES & CYCLES AVEC PAGINATION & CREATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ClassesTab: React.FC = () => {
  const [classesList, setClassesList] = useState<ClasseScolaire[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredClasses = useMemo(() => {
    return classesList.filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.salle.toLowerCase().includes(search.toLowerCase()));
  }, [classesList, search]);

  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Classes, Promotions & Structures EPST"
        subtitle="Répertoire officiel des salles de classe et affectations des titulaires"
        actions={
          <button className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/40">
            <Plus className="w-4 h-4" /> Créer une Nouvelle Classe
          </button>
        }
      />

      <div className="flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrer par nom de classe, salle ou titulaire..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                <th className="py-3 px-4">Classe / Promotion</th>
                <th className="py-3 px-4">Local / Salle</th>
                <th className="py-3 px-4">Professeur Titulaire</th>
                <th className="py-3 px-4">Effectif Inscrit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedClasses.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-xs text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{c.nom}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">{c.salle}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{c.professeurTitulaire}</td>
                  <td className="py-3 px-4 font-medium">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60">
                      {c.nombreEleves} élèves
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar
          totalItems={filteredClasses.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

// â”€â”€â”€ ONGLET 3 : MATIÈRES, DISCIPLINES & COEFFICIENTS EPST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SubjectsTab: React.FC = () => {
  const [subjectsList, setSubjectsList] = useState<Discipline[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredSubjects = useMemo(() => {
    return subjectsList.filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));
  }, [subjectsList, search]);

  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Matières, Disciplines & Coefficients EPST"
        subtitle="Pondérations et maxima officiels du programme national de l'EPST RDC"
        actions={
          <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 hover:bg-indigo-700 transition-all cursor-pointer">
            <Plus className="w-4 h-4" /> Ajouter une Matière
          </button>
        }
      />

      <div className="flex items-center gap-3 p-3 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher une discipline (ex: Mathématiques, Physique, Français)..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border font-bold focus:outline-none focus:border-indigo-500"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div className="rounded-2xl border shadow-md overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b uppercase tracking-wider text-[10px] font-black text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <th className="p-3.5">Discipline / Matière</th>
                <th className="p-3.5">Code EPST</th>
                <th className="p-3.5">Catégorie</th>
                <th className="p-3.5">Coefficient EPST</th>
                <th className="p-3.5">Maximum Notes</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginatedSubjects.map(s => (
                <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                  <td className="p-3.5 font-black text-xs" style={{ color: 'var(--text-primary)' }}>{s.nom}</td>
                  <td className="p-3.5 font-mono text-indigo-400 font-bold">{s.code}</td>
                  <td className="p-3.5 font-bold text-slate-400">{s.categorie}</td>
                  <td className="p-3.5 font-black">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Coeff. {s.coefficient}
                    </span>
                  </td>
                  <td className="p-3.5 font-black" style={{ color: 'var(--text-primary)' }}>/ {s.maxScore} pts</td>
                  <td className="p-3.5 text-right">
                    <button className="p-1.5 rounded-xl hover:bg-slate-500/20 text-slate-400 hover:text-white cursor-pointer">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar
          totalItems={filteredSubjects.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

// â”€â”€â”€ ONGLET 4 : GESTION DE L'ANNÉE SCOLAIRE, STATISTIQUES & RAPPORTS EPST â”€â”€

// â”€â”€â”€ ONGLET 4 : GESTION DE L'ANNÉE SCOLAIRE, TARIFICATION & STRUCTURE EPST â”€â”€

const LegacySchoolYearsTab: React.FC = () => {
  const { format } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'frais' | 'cycles_salles' | 'periodes' | 'rapports'>('frais');

  // â”€â”€ ÉTATS DU FORMULAIRE ONBOARDING MULTI-ÉTAPES (CREATION ANNÉE SCOLAIRE) â”€â”€
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [newNom, setNewNom] = useState('2026–2027');
  const [newDebut, setNewDebut] = useState('07 Septembre 2026');
  const [newFin, setNewFin] = useState('03 Juillet 2027');
  const [newStatut, setNewStatut] = useState<'PLANIFIEE' | 'EN_COURS'>('PLANIFIEE');
  const [newTargetEleves, setNewTargetEleves] = useState<number>(15000);

  // Tarification
  const [newFraisInscription, setNewFraisInscription] = useState<number>(50);
  const [newFraisConnexion, setNewFraisConnexion] = useState<number>(15);
  const [newFraisReinscription, setNewFraisReinscription] = useState<number>(30);
  const [newFraisCarte, setNewFraisCarte] = useState<number>(10);
  const [newFraisAnnexes, setNewFraisAnnexes] = useState<FraisAnnexeConfig[]>([
    { id: 'fa-new-1', intitule: 'Kit Scolaire & Uniforme Officiel', montant: 25, devise: 'USD', obligatoire: true, typeFrais: 'KIT' },
    { id: 'fa-new-2', intitule: 'Assurance Scolaire & Infirmerie', montant: 10, devise: 'USD', obligatoire: true, typeFrais: 'AUTRE' },
  ]);

  // Champs temporaires pour ajout d'un frais annexe
  const [tempIntituleFrais, setTempIntituleFrais] = useState('');
  const [tempMontantFrais, setTempMontantFrais] = useState<number>(15);
  const [tempTypeFrais, setTempTypeFrais] = useState<'INSCRIPTION' | 'REINSCRIPTION' | 'CONNEXION' | 'CARTE' | 'KIT' | 'AUTRE'>('AUTRE');

  // Cycles & Salles
  const [newActiveCycles, setNewActiveCycles] = useState<Record<string, boolean>>({
    MATERNELLE: true,
    PRIMAIRE: true,
    SECONDAIRE_CTEB: true,
    HUMANITES: true,
  });

  const [newSalles, setNewSalles] = useState<SalleConfig[]>([
    { id: 'sal-new-1', codeSalle: 'M-101', nomSalle: 'Salle Petite Section Maternelle', capacite: 35, cycleCode: 'MATERNELLE' },
    { id: 'sal-new-2', codeSalle: 'P-201', nomSalle: 'Salle 1ère Primaire A', capacite: 45, cycleCode: 'PRIMAIRE' },
    { id: 'sal-new-3', codeSalle: 'C-301', nomSalle: 'Salle 7ème CTEB A', capacite: 40, cycleCode: 'SECONDAIRE_CTEB' },
    { id: 'sal-new-4', codeSalle: 'H-401', nomSalle: 'Labo Math-Physique 1ère H', capacite: 40, cycleCode: 'HUMANITES' },
  ]);

  // Champs temporaires pour ajout d'une salle
  const [tempCodeSalle, setTempCodeSalle] = useState('');
  const [tempNomSalle, setTempNomSalle] = useState('');
  const [tempCapaciteSalle, setTempCapaciteSalle] = useState<number>(40);
  const [tempCycleSalle, setTempCycleSalle] = useState<'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES'>('HUMANITES');

  // Découpage Pédagogique
  const [newStructure, setNewStructure] = useState<'SEMESTRES' | 'TRIMESTRES'>('SEMESTRES');

  const selectedYear = useMemo(() => {
    return years.find(y => y.id === selectedYearId) || years[0];
  }, [years, selectedYearId]);

  // Ajouter un frais annexe
  const handleAddFraisAnnexe = () => {
    if (!tempIntituleFrais.trim()) return;
    const newFraisItem: FraisAnnexeConfig = {
      id: `fa-${Date.now()}`,
      intitule: tempIntituleFrais.trim(),
      montant: tempMontantFrais,
      devise: 'USD',
      obligatoire: true,
      typeFrais: tempTypeFrais,
    };
    setNewFraisAnnexes(prev => [...prev, newFraisItem]);
    setTempIntituleFrais('');
    setTempMontantFrais(15);
  };

  const handleRemoveFraisAnnexe = (id: string) => {
    setNewFraisAnnexes(prev => prev.filter(f => f.id !== id));
  };

  // Ajouter une salle
  const handleAddSalle = () => {
    if (!tempNomSalle.trim() || !tempCodeSalle.trim()) return;
    const newSalleItem: SalleConfig = {
      id: `sal-${Date.now()}`,
      codeSalle: tempCodeSalle.trim().toUpperCase(),
      nomSalle: tempNomSalle.trim(),
      capacite: tempCapaciteSalle,
      cycleCode: tempCycleSalle,
    };
    setNewSalles(prev => [...prev, newSalleItem]);
    setTempCodeSalle('');
    setTempNomSalle('');
    setTempCapaciteSalle(40);
  };

  const handleRemoveSalle = (id: string) => {
    setNewSalles(prev => prev.filter(s => s.id !== id));
  };

  // Enregistrement final du Wizard Onboarding
  const handleCompleteWizard = (e: React.FormEvent) => {
    e.preventDefault();
    const createdCycles: CycleConfig[] = [
      { id: `c-1-${Date.now()}`, code: 'MATERNELLE', nom: 'Cycle Maternelle (3–5 ans)', actif: newActiveCycles.MATERNELLE, classesCount: 6, sallesCount: newSalles.filter(s => s.cycleCode === 'MATERNELLE').length },
      { id: `c-2-${Date.now()}`, code: 'PRIMAIRE', nom: 'Cycle Primaire (1ère–6ème)', actif: newActiveCycles.PRIMAIRE, classesCount: 18, sallesCount: newSalles.filter(s => s.cycleCode === 'PRIMAIRE').length },
      { id: `c-3-${Date.now()}`, code: 'SECONDAIRE_CTEB', nom: 'Cycle Terminal d’Éducation de Base (7ème–8ème CTEB)', actif: newActiveCycles.SECONDAIRE_CTEB, classesCount: 8, sallesCount: newSalles.filter(s => s.cycleCode === 'SECONDAIRE_CTEB').length },
      { id: `c-4-${Date.now()}`, code: 'HUMANITES', nom: 'Humanités Générales & Techniques (1ère–4ème H)', actif: newActiveCycles.HUMANITES, classesCount: 16, sallesCount: newSalles.filter(s => s.cycleCode === 'HUMANITES').length },
    ];

    const newYear: AnneeScolaireConfig = {
      id: `ay-${Date.now()}`,
      nom: newNom,
      statut: newStatut,
      debut: newDebut,
      fin: newFin,
      nombreElevesTotal: newTargetEleves,
      fraisInscription: newFraisInscription,
      fraisConnexion: newFraisConnexion,
      fraisReinscription: newFraisReinscription,
      fraisCarte: newFraisCarte,
      fraisAnnexes: newFraisAnnexes,
      cycles: createdCycles,
      salles: newSalles,
      semestres: newStructure === 'SEMESTRES' ? [
        { id: `s1-${Date.now()}`, nom: '1er Semestre (S1)', statut: 'PLANIFIE', fin: '17 Février' },
        { id: `s2-${Date.now()}`, nom: '2ème Semestre (S2)', statut: 'PLANIFIE', fin: '03 Juillet' },
      ] : [
        { id: `t1-${Date.now()}`, nom: '1er Trimestre (T1)', statut: 'PLANIFIE', fin: '30 Novembre' },
        { id: `t2-${Date.now()}`, nom: '2ème Trimestre (T2)', statut: 'PLANIFIE', fin: '28 Février' },
        { id: `t3-${Date.now()}`, nom: '3ème Trimestre (T3)', statut: 'PLANIFIE', fin: '03 Juillet' },
      ],
      periodes: [
        { id: `p1-${Date.now()}`, nom: '1ère Période', debut: newDebut.split(' ')[0] + ' Sept', fin: '04 Nov', type: 'PERIOD' },
        { id: `p2-${Date.now()}`, nom: '2ème Période & Examens S1', debut: '09 Nov', fin: '17 Fév', type: 'EXAM' },
        { id: `p3-${Date.now()}`, nom: '3ème Période', debut: '22 Fév', fin: '24 Avr', type: 'PERIOD' },
        { id: `p4-${Date.now()}`, nom: '4ème Période & EXETAT', debut: '26 Avr', fin: newFin.split(' ')[0] + ' Jul', type: 'EXAM' },
      ],
    };

    setYears(prev => [newYear, ...prev]);
    setSelectedYearId(newYear.id);
    setShowCreateModal(false);
    setWizardStep(1);
  };

  const handleDeleteYear = (id: string) => {
    setYears(prev => prev.filter(y => y.id !== id));
    if (selectedYearId === id) {
      setSelectedYearId(years.find(y => y.id !== id)?.id || '');
    }
    setDeleteConfirmId(null);
  };

  const handleActivateYear = (id: string) => {
    setYears(prev => prev.map(y => ({
      ...y,
      statut: y.id === id ? 'EN_COURS' : y.statut === 'EN_COURS' ? 'CLOTUREE' : y.statut
    })));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Gestion de l'Année Scolaire, Tarification & Structuration EPST"
        subtitle="Configuration des frais d'inscription, frais de connexion, attribution des salles d'études et découpage des périodes"
        actions={
          <button
            onClick={() => { setWizardStep(1); setShowCreateModal(true); }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer border border-indigo-400/40"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Onboarding : Créer une Nouvelle Année</span>
          </button>
        }
      />

      {/* LISTE DES CARTES DES ANNÉES SCOLAIRES (SELECTION & ACTIONS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {years.map(y => {
          const isCurrent = y.statut === 'EN_COURS';
          const isSelected = selectedYearId === y.id;
          return (
            <div
              key={y.id}
              onClick={() => setSelectedYearId(y.id)}
              className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between space-y-4 transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/10'
                  : 'hover:border-indigo-500/40'
              }`}
              style={{
                background: 'var(--bg-surface)',
                borderColor: isSelected ? '#6366f1' : 'var(--border)'
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Année {y.nom}
                      </h3>
                      <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                        {y.debut} — {y.fin}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                    isCurrent
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : y.statut === 'CLOTUREE'
                      ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  }`}>
                    {isCurrent ? 'EN COURS' : y.statut}
                  </span>
                </div>

                {/* Badges Synthèse des Frais Majeurs */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center text-[10.5px]" style={{ borderColor: 'var(--border)' }}>
                  <div className="p-1.5 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Inscription</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">${y.fraisInscription}</span>
                  </div>
                  <div className="p-1.5 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Connexion</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">${y.fraisConnexion}</span>
                  </div>
                  <div className="p-1.5 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Réinscription</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">${y.fraisReinscription}</span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Salles d'études créées:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{y.salles ? y.salles.length : 4} salles</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Structure Périodique:</span>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{y.semestres.length} Semestres</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">ðŸ‘¥ {y.nombreElevesTotal.toLocaleString()} élèves</span>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {!isCurrent && (
                    <button
                      onClick={() => handleActivateYear(y.id)}
                      className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer"
                    >
                      Activer
                    </button>
                  )}

                  {!isCurrent && (
                    <button
                      onClick={() => setDeleteConfirmId(y.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-all cursor-pointer"
                      title="Supprimer l'année scolaire"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION DÉTIAL DE L'ANNÉE SCOLAIRE SÉLECTIONNÉE AVEC 4 SOUS-ONGLETS */}
      {selectedYear && (
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Configuration & Structure — Année Scolaire {selectedYear.nom}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  {selectedYear.statut}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consultez et gérez la grille tarifaire, la liste des salles physiques et le calendrier pédagogique.
              </p>
            </div>

            {/* Barre des 4 Sous-onglets de Détail */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              {[
                { id: 'frais', label: 'Tarification & Frais', icon: CreditCard },
                { id: 'cycles_salles', label: 'Cycles & Salles', icon: School },
                { id: 'periodes', label: 'Périodes & Examens', icon: Calendar },
                { id: 'rapports', label: 'Documents & PV', icon: FileText },
              ].map(t => {
                const TIcon = t.icon;
                const isActive = activeDetailTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveDetailTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <TIcon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTENU DU SOUS-ONGLET SÉLECTIONNÉ */}
          {activeDetailTab === 'frais' && (
            <div className="space-y-4 animate-fade-in">


              {/* TABLEAU DES FRAIS ANNEXES & OPTIONNELS */}
              <div className="p-4 rounded-2xl border shadow-xs space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Frais Annexes Approuvés par le Comité Gestionnaire ({selectedYear.fraisAnnexes ? selectedYear.fraisAnnexes.length : 0})
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[10px] font-bold text-slate-500 dark:text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <th className="p-3">Intitulé du Frais</th>
                        <th className="p-3">Type de Frais</th>
                        <th className="p-3">Montant Fixé</th>
                        <th className="p-3">Statut Obligation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {(selectedYear.fraisAnnexes || []).map(fa => (
                        <tr key={fa.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>{fa.intitule}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                              {fa.typeFrais}
                            </span>
                          </td>
                          <td className="p-3 font-black text-indigo-600 dark:text-indigo-400">{fmt(fa.montant, fa.devise)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                              {fa.obligatoire ? 'OBLIGATOIRE' : 'OPTIONNEL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'cycles_salles' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {(selectedYear.cycles || []).map(cyc => (
                  <div key={cyc.id} className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cyc.nom}</h4>
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        ACTIF
                      </span>
                    </div>
                    <div className="pt-2 border-t flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--border)' }}>
                      <span>{cyc.classesCount} promotions</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{cyc.sallesCount || 4} salles physiques</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* LISTE DES SALLES D'ÉTUDES PHYSIQUES ATTRIBUÉES */}
              <div className="p-4 rounded-2xl border shadow-xs space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Répertoire des Salles Physiques d'Études ({selectedYear.salles ? selectedYear.salles.length : 0})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(selectedYear.salles || []).map(sal => (
                    <div key={sal.id} className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{sal.codeSalle}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                          {sal.cycleCode}
                        </span>
                      </div>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{sal.nomSalle}</p>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Capacité max : {sal.capacite} élèves</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'periodes' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedYear.periodes || []).map(per => (
                  <div key={per.id} className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div>
                      <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{per.nom}</h4>
                      <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">Intervalle : {per.debut} au {per.fin}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                      per.type === 'EXAM' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}>
                      {per.type === 'EXAM' ? 'EXAMENS' : 'PÉRIODE NORMALE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDetailTab === 'rapports' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
              {[
                { title: 'PV Officiel d’Ouverture & Grille Tarifaire', code: 'PV-EPST-2026-TARIF', desc: 'Décision du conseil d’administration fixant les frais d’inscription, connexion et carte élève.' },
                { title: 'Tableau des Capacités & Salles Physiques', code: 'PV-EPST-2026-SALLES', desc: 'Rapport d’occupation des locaux d’études et quota par classe.' },
              ].map((doc, idx) => (
                <div key={idx} className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{doc.title}</h4>
                    <span className="font-mono text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">{doc.code}</span>
                    <p className="text-[10.5px] mt-1 text-slate-500 dark:text-slate-400">{doc.desc}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ MODAL ONBOARDING MULTI-ÉTAPES (AGRANDI MAX-W-5XL) POUR CRÉER UNE ANNÉE â”€â”€ */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setShowCreateModal(false)}>
          <div
            className="w-full max-w-5xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]"
            style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* EN-TÊTE DU WIZARD */}
            <div className="p-5 border-b flex items-center justify-between shrink-0" style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>Assistant d'Onboarding — Année Scolaire</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                      Étape {wizardStep} sur 5
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configuration intégrale : Général, Tarification Inscription/Connexion, Cycles & Salles physiques.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-xl hover:bg-slate-500/20 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEPPER BAR D'AVANCEMENT */}
            <div className="px-6 py-3 border-b overflow-x-auto sidebar-scroll shrink-0" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between min-w-[650px] gap-2">
                {[
                  { step: 1, label: '1. Général & Dates', icon: Calendar },
                  { step: 2, label: '2. Tarification & Frais', icon: CreditCard },
                  { step: 3, label: '3. Cycles & Salles', icon: School },
                  { step: 4, label: '4. Périodes EPST', icon: Layers },
                  { step: 5, label: '5. Validation', icon: CheckCircle2 },
                ].map(s => {
                  const SIcon = s.icon;
                  const isActive = wizardStep === s.step;
                  const isDone = wizardStep > s.step;
                  return (
                    <button
                      key={s.step}
                      onClick={() => setWizardStep(s.step)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isDone
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10'
                      }`}
                    >
                      <SIcon className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CORPS DU FORMULAIRE WIZARD (CONTENU DYNAMIQUE SELON STEP) */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">

              {/* ÉTAPE 1 : INFORMATIONS GÉNÉRALES */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-indigo-500/10 border-indigo-500/25 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Définissez l'intitulé officiel de l'année scolaire et le calendrier de rentrée/clôture publié par le Ministère EPST RDC.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Intitulé de l'Année Scolaire *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: 2026–2027"
                        value={newNom}
                        onChange={e => setNewNom(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Objectif Prévisionnel d'Élèves</label>
                      <input
                        type="number"
                        value={newTargetEleves}
                        onChange={e => setNewTargetEleves(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Date de Début (Rentrée Scolaire) *</label>
                      <input
                        type="text"
                        required
                        placeholder="07 Septembre 2026"
                        value={newDebut}
                        onChange={e => setNewDebut(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Date de Clôture Officielle *</label>
                      <input
                        type="text"
                        required
                        placeholder="03 Juillet 2027"
                        value={newFin}
                        onChange={e => setNewFin(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Statut Initial de l'Année *</label>
                    <CustomSelect
                      options={[
                        { value: 'PLANIFIEE', label: 'PLANIFIÉE — Préparation administrative (Prochaine année)' },
                        { value: 'EN_COURS', label: 'EN COURS — Basculer immédiatement comme année active' },
                      ]}
                      value={newStatut}
                      onChange={val => setNewStatut(val as any)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : TARIFICATION & FRAIS D'INSCRIPTION / CONNEXION */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Fixez les frais d'inscription obligatoire, les frais de connexion/plateforme système et ajoutez d'autres frais annexes (frais de carte, kit scolaire, etc.).
                    </p>
                  </div>

                  {/* 4 CHAMPS DE FRAIS MAJEURS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <label className="font-bold text-xs text-indigo-600 dark:text-indigo-400 block">Frais d'Inscription ($)</label>
                      <input
                        type="number"
                        value={newFraisInscription}
                        onChange={e => setNewFraisInscription(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <label className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block">Frais de Connexion Syst. ($)</label>
                      <input
                        type="number"
                        value={newFraisConnexion}
                        onChange={e => setNewFraisConnexion(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <label className="font-bold text-xs text-indigo-600 dark:text-indigo-400 block">Frais de Réinscription ($)</label>
                      <input
                        type="number"
                        value={newFraisReinscription}
                        onChange={e => setNewFraisReinscription(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <label className="font-bold text-xs text-amber-600 dark:text-amber-400 block">Frais Carte d'Élève ($)</label>
                      <input
                        type="number"
                        value={newFraisCarte}
                        onChange={e => setNewFraisCarte(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  {/* FORMULAIRE D'AJOUT D'UN FRAIS ANNEXE PERSONNALISÉ */}
                  <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ajouter un Frais Annexe / Optionnel</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Intitulé (ex: Kit Uniforme)"
                        value={tempIntituleFrais}
                        onChange={e => setTempIntituleFrais(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border font-medium"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <input
                        type="number"
                        placeholder="Montant en $"
                        value={tempMontantFrais}
                        onChange={e => setTempMontantFrais(Number(e.target.value))}
                        className="px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <CustomSelect
                        options={[
                          { value: 'KIT', label: 'Kit Scolaire & Uniforme' },
                          { value: 'CONNEXION', label: 'Frais informatique' },
                          { value: 'AUTRE', label: 'Autre frais annexe' },
                        ]}
                        value={tempTypeFrais}
                        onChange={val => setTempTypeFrais(val as any)}
                      />
                      <button
                        type="button"
                        onClick={handleAddFraisAnnexe}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> Ajouter
                      </button>
                    </div>

                    {/* LISTE DES FRAIS ANNEXES AJOUTÉS */}
                    <div className="space-y-1.5 pt-2">
                      {newFraisAnnexes.map(fa => (
                        <div key={fa.id} className="p-2.5 rounded-lg border flex items-center justify-between text-xs font-medium" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                          <div>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{fa.intitule}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">({fa.typeFrais})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-indigo-600 dark:text-indigo-400">{fmt(fa.montant, fa.devise)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFraisAnnexe(fa.id)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : CYCLES SCOLAIRES & CONFIGURATION DES SALLES PHYSIQUES */}
              {wizardStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-indigo-500/10 border-indigo-500/25 flex items-center gap-3">
                    <School className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Sélectionnez les cycles scolaires actifs pour cette année et créez les salles physiques d'études nécessaires à l'attribution des classes.
                    </p>
                  </div>

                  {/* SÉLECTION DES CYCLES ACTIFS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { code: 'MATERNELLE', label: 'Cycle Maternelle (3–5 ans)' },
                      { code: 'PRIMAIRE', label: 'Cycle Primaire (1ère–6ème)' },
                      { code: 'SECONDAIRE_CTEB', label: 'CTEB (7ème–8ème Base)' },
                      { code: 'HUMANITES', label: 'Humanités & Techniques' },
                    ].map(cyc => (
                      <label
                        key={cyc.code}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          newActiveCycles[cyc.code]
                            ? 'border-indigo-500 bg-indigo-500/10 font-bold'
                            : 'opacity-60'
                        }`}
                        style={{ background: 'var(--bg-sunken)', borderColor: newActiveCycles[cyc.code] ? '#6366f1' : 'var(--border)' }}
                      >
                        <input
                          type="checkbox"
                          checked={!!newActiveCycles[cyc.code]}
                          onChange={e => setNewActiveCycles(prev => ({ ...prev, [cyc.code]: e.target.checked }))}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cyc.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* FORMULAIRE D'AJOUT D'UNE SALLE PHYSIQUE */}
                  <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Créer une Salle Physique d'Études dans un Cycle</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <input
                        type="text"
                        placeholder="Code salle (ex: H-401)"
                        value={tempCodeSalle}
                        onChange={e => setTempCodeSalle(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border font-mono font-bold"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <input
                        type="text"
                        placeholder="Nom salle (ex: Labo Math A)"
                        value={tempNomSalle}
                        onChange={e => setTempNomSalle(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border font-medium"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <input
                        type="number"
                        placeholder="Capacité max"
                        value={tempCapaciteSalle}
                        onChange={e => setTempCapaciteSalle(Number(e.target.value))}
                        className="px-3 py-1.5 text-xs rounded-lg border font-bold"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <CustomSelect
                        options={[
                          { value: 'MATERNELLE', label: 'Maternelle' },
                          { value: 'PRIMAIRE', label: 'Primaire' },
                          { value: 'SECONDAIRE_CTEB', label: '7-8 CTEB' },
                          { value: 'HUMANITES', label: 'Humanités' },
                        ]}
                        value={tempCycleSalle}
                        onChange={val => setTempCycleSalle(val as any)}
                      />
                      <button
                        type="button"
                        onClick={handleAddSalle}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> Créer Salle
                      </button>
                    </div>

                    {/* LISTE DES SALLES CRÉÉES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                      {newSalles.map(s => (
                        <div key={s.id} className="p-2.5 rounded-lg border flex items-center justify-between text-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                          <div>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold mr-2">{s.codeSalle}</span>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{s.nomSalle}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{s.cycleCode} · Capacité: {s.capacite} élèves</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSalle(s.id)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 : DÉCOUPAGE PÉDAGOGIQUE & PÉRIODES */}
              {wizardStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/25 flex items-center gap-3">
                    <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Configurez la structure périodique (Semestres S1 & S2 ou Trimestres T1, T2 & T3) et validez le calendrier des examens.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Structure Globale du Calendrier *</label>
                    <CustomSelect
                      options={[
                        { value: 'SEMESTRES', label: '2 Semestres (S1 & S2) — Standard EPST RDC' },
                        { value: 'TRIMESTRES', label: '3 Trimestres (T1, T2 & T3)' },
                      ]}
                      value={newStructure}
                      onChange={val => setNewStructure(val as any)}
                      className="w-full"
                    />
                  </div>

                  <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Découpage Récapitulatif des 4 Périodes EPST</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold">
                      <div className="p-2.5 rounded-lg border bg-slate-500/5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span>1ère Période : Septembre – Novembre</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Cours & Interros</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-slate-500/5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span>2ème Période & Examens S1 : Novembre – Février</span>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Examens S1</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-slate-500/5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span>3ème Période : Février – Avril</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Cours & Interros</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-slate-500/5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span>4ème Période & EXETAT : Avril – Juillet</span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">EXETAT & Clôture</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 5 : RÉCAPITULATIF & VALIDATION */}
              {wizardStep === 5 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Vérifiez les paramètres de la nouvelle année scolaire avant confirmation et enregistrement final.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Année & Dates</h4>
                      <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Année Scolaire {newNom}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Période : {newDebut} — {newFin}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Statut initial : <span className="font-bold text-indigo-600 dark:text-indigo-400">{newStatut}</span></p>
                    </div>

                    <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Tarification Fixée</h4>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Inscription : ${newFraisInscription} · Connexion : ${newFraisConnexion}</p>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Réinscription : ${newFraisReinscription} · Carte : ${newFraisCarte}</p>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400">{newFraisAnnexes.length} frais annexes configurés</p>
                    </div>

                    <div className="p-4 rounded-xl border space-y-2 md:col-span-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Salles Physiques d'Études ({newSalles.length})</h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {newSalles.map(s => (
                          <span key={s.id} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                            {s.codeSalle} — {s.nomSalle} ({s.capacite} pl)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* PIED DE PAGE & BOUTONS DE NAVIGATION STEPPER */}
            <div className="p-4 border-t flex items-center justify-between shrink-0" style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-lg border text-xs font-bold flex items-center gap-1 hover:bg-slate-500/10 disabled:opacity-40 transition-all cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-bold hover:bg-slate-500/10 transition-all cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Annuler
                </button>

                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => Math.min(5, prev + 1))}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <span>Suivant</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteWizard}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Créer l'Année Scolaire</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* CONFIRMATION DE SUPPRESSION D'ANNÉE SCOLAIRE */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 text-center"
            style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Supprimer cette Année Scolaire ?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Êtes-vous sûr de vouloir supprimer l'année scolaire sélectionnée ? Cette action archivée est irréversible.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/20 cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteYear(deleteConfirmId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// â”€â”€â”€ TEACHERS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── TEACHERS TAB ─────────────────────────────────────────────────────────────

const TeachersTab: React.FC = () => {
  const [staffList, setStaffList] = useState<MembrePersonnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    LocalDatabaseService.getStaff()
      .then(res => setStaffList(res || []))
      .catch(() => setStaffList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Corps Enseignant & Personnel"
        subtitle={`${staffList.length} membres du personnel enregistrés`}
        actions={
          <button className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer">
            <Plus className="w-4 h-4" /> Nouveau Dossier RH
          </button>
        }
      />

      {loading ? (
        <div className="p-8 text-center rounded-2xl border-0 shadow-md" style={{ background: 'var(--bg-surface)' }}>
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-bold">Chargement du personnel...</p>
        </div>
      ) : staffList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-0 shadow-md space-y-3" style={{ background: 'var(--bg-surface)' }}>
          <Users className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Aucun membre du personnel enregistré</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Créez des dossiers pour les enseignants, administratifs et agents de l'établissement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map(s => (
            <div
              key={s.id}
              className="rounded-2xl border-0 shadow-md hover:shadow-xl transition-all p-5"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div className="flex items-start gap-3">
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt={s.prenom} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
                  >
                    {s.prenom[0]}{s.nom[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.prenom} {s.nom}</h3>
                  <p className="text-xs text-slate-400 font-semibold">{s.role}</p>
                  <div className="mt-1.5">{statusBadge(s.statut)}</div>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs font-medium">
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{s.telephone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="truncate">{s.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// â”€â”€â”€ SCHEDULE & GRADES PLACEHOLDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ScheduleTab: React.FC = () => (
  <div className="p-8 text-center rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <Calendar className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
    <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Emplois du Temps & Planning des Cours</h3>
    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
      Gestionnaire de grilles d'emplois du temps hebdomadaires par classe et enseignant titulaire.
    </p>
  </div>
);

const GradesTab: React.FC = () => (
  <div className="p-8 text-center rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <ClipboardList className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
    <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Cotes & PV d'Examens EPST RDC</h3>
    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
      Saisie des cotes d'interrogations, compositions et génération des bulletins scolaires trimestriels.
    </p>
  </div>
);

// â”€â”€â”€ MAIN MANAGER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AcademicManager: React.FC<AcademicManagerProps> = ({ activeSubTab = 'students', activeSchoolYear, registrationRequest }) => {
  const { currency, exchangeRate, format } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);
  const tabs = [
    { id: 'students', label: 'Élèves & Inscriptions', icon: GraduationCap },
    { id: 'classes',  label: 'Classes & Local',         icon: BookOpen       },
    { id: 'subjects', label: 'Matières & Coefficients', icon: Layers         },
    { id: 'years',    label: 'Année Scolaire & Périodes',icon: Calendar      },
    { id: 'teachers', label: 'Enseignants & Personnel', icon: Users          },
    { id: 'examens',  label: 'Évaluations & Examens',   icon: Award          },
    { id: 'grades',   label: 'Cotes & Bulletins',       icon: ClipboardList  },
    { id: 'schedule', label: 'Emploi du Temps',          icon: Calendar      },
  ];

  const [localTab, setLocalTab] = useState(activeSubTab);

  React.useEffect(() => {
    setLocalTab(activeSubTab);
  }, [activeSubTab]);

  const renderTab = () => {
    switch (localTab) {
      case 'students': return <StudentsManager activeSchoolYear={activeSchoolYear} registrationRequest={registrationRequest} />;
      case 'classes':  return <ClassesPromotionsManager activeSchoolYear={activeSchoolYear} onNavigateToStudents={() => setLocalTab('students')} />;
      case 'subjects': return <SubjectsManager activeSchoolYear={activeSchoolYear} />;
      case 'years':    return <SchoolYearsTab activeSchoolYear={activeSchoolYear} />;
      case 'teachers': return <TeacherManager activeSchoolYear={activeSchoolYear} />;
      case 'examens':  return <EvaluationsExamsManager />;
      case 'grades':   return <GradesManager activeSchoolYear={activeSchoolYear} />;
      case 'schedule': return <ScheduleManager activeSchoolYear={activeSchoolYear} />;
      default:         return <StudentsManager activeSchoolYear={activeSchoolYear} registrationRequest={registrationRequest} />;
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Content */}
      <div className="animate-fade-in" key={localTab}>
        {renderTab()}
      </div>
    </div>
  );
};

