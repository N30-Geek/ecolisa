import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Users,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit3,
  Trash2,
  MoreVertical,
  QrCode,
  Printer,
  FileText,
  Check,
  Star,
  BookOpen,
  ArrowLeft,
  Grid,
  List,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  BadgeAlert,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  FileCheck,
  ArrowUpDown,
  X,
  Maximize2
} from 'lucide-react';
import { Eleve, ClasseScolaire } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { SortableTh } from '../common/SortableTh';
import { StudentRegistrationModal } from './StudentRegistrationModal';
import { StudentIdCardModal } from './StudentIdCardModal';
import { StudentFullFileModal } from './StudentFullFileModal';
import { StudentDocumentsModal } from './StudentDocumentsModal';
import { BulkIdCardModal } from './BulkIdCardModal';
import { StudentDetailPage } from './StudentDetailPage';
import { PhotoLightboxModal } from '../common/PhotoLightboxModal';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

interface StudentsManagerProps {
  initialClassFilter?: string;
  activeSchoolYear?: string;
  registrationRequest?: number;
}


// ── COMPOSANT MENU ACTIONS ÉLÈVE DROPDOWN (PORTAL INSERÉ HORS CONTENEURS DE DÉFILEMENT) ──
interface StudentActionMenuProps {
  student: Eleve;
  onViewDetail: (student: Eleve) => void;
  onViewQrCard: (student: Eleve) => void;
  onViewDocs: (student: Eleve) => void;
  onEdit: (student: Eleve) => void;
  onDelete: (id: string) => void;
  onZoomPhoto?: (student: Eleve) => void;
}

const StudentActionMenu: React.FC<StudentActionMenuProps> = ({
  student,
  onViewDetail,
  onViewQrCard,
  onViewDocs,
  onEdit,
  onDelete,
  onZoomPhoto,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 230;

    let left = rect.right - menuWidth;
    left = Math.max(12, Math.min(left, window.innerWidth - menuWidth - 12));

    const openUpwards = rect.bottom + menuHeight + 8 > window.innerHeight;
    const top = openUpwards ? Math.max(12, rect.top - menuHeight - 6) : rect.bottom + 6;

    setPosition({ top, left });
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      computePosition();
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleReposition = () => setIsOpen(false);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-500/10 active:scale-[0.95] transition-all cursor-pointer"
        title="Options & Actions Élève"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          className="fixed w-56 rounded-2xl border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: position.top,
            left: position.left,
            zIndex: 99999,
            background: 'var(--sidebar-popover-bg, var(--bg-surface))',
            borderColor: 'var(--sidebar-popover-border, var(--border))',
            color: 'var(--text-primary)',
            boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.35)',
          }}
        >
          <button
            onClick={() => { setIsOpen(false); onViewDetail(student); }}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 hover:bg-indigo-500/10 text-left transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-indigo-500" />
            <span>Voir la Fiche Élève</span>
          </button>

          <button
            onClick={() => { setIsOpen(false); onViewQrCard(student); }}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 hover:bg-indigo-500/10 text-left transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-indigo-500" />
            <span>Carte QR d'Élève</span>
          </button>

          <button
            onClick={() => { setIsOpen(false); onViewDocs(student); }}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 hover:bg-indigo-500/10 text-left transition-colors cursor-pointer"
          >
            <FileCheck className="w-4 h-4 text-indigo-500" />
            <span>Dossier & Pièces (Scans)</span>
          </button>

          <button
            onClick={() => { setIsOpen(false); onEdit(student); }}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-left transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-amber-500" />
            <span>Éditer les Informations</span>
          </button>

          <button
            onClick={() => { setIsOpen(false); onZoomPhoto?.(student); }}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 hover:bg-indigo-500/10 text-left transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4 text-indigo-500" />
            <span>Agrandir la Photo</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800/40" />

          <button
            onClick={() => { setIsOpen(false); onDelete(student.id); }}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-left transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Supprimer du Registre</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

// ── COMPOSANT PRINCIPAL STUDENTS MANAGER ──
export const StudentsManager: React.FC<StudentsManagerProps> = ({ initialClassFilter = '', activeSchoolYear, registrationRequest }) => {
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres & Tri
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState(initialClassFilter);
  const [selectedCycle, setSelectedCycle] = useState('ALL');
  const [selectedStatut, setSelectedStatut] = useState('ALL');
  const [selectedSexe, setSelectedSexe] = useState('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'DATE_DESC' | 'CLASS'>('NAME_ASC');
  const [tableSortField, setTableSortField] = useState<string>('name');
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const handleTableSort = (field: string) => {
    if (tableSortField === field) {
      setTableSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortField(field);
      setTableSortOrder('asc');
    }
  };

  // Modales & Vues Dédiées
  const [selectedStudent, setSelectedStudent] = useState<Eleve | null>(null);
  const [editingStudent, setEditingStudent] = useState<Eleve | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [cardModalStudent, setCardModalStudent] = useState<Eleve | null>(null);
  const [docsModalStudent, setDocsModalStudent] = useState<Eleve | null>(null);
  const [showBulkIdCardModal, setShowBulkIdCardModal] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [zoomStudent, setZoomStudent] = useState<Eleve | null>(null);

  const lastRegistrationRequest = useRef(0);

  // Ouvre le formulaire d'inscription lors d'une demande en provenance du dashboard
  useEffect(() => {
    if (registrationRequest && registrationRequest !== lastRegistrationRequest.current) {
      lastRegistrationRequest.current = registrationRequest;
      setSelectedStudent(null);
      setEditingStudent(null);
      setShowRegisterModal(true);
    }
  }, [registrationRequest]);

  const [assignedClasses, setAssignedClasses] = useState<string[] | null>(null);

  // Chargement des données SQLite
  const loadData = async () => {
    setLoading(true);
    try {
      const [elvList, clsList, userAssigned] = await Promise.all([
        LocalDatabaseService.getEleves({ schoolYearId: activeSchoolYear }),
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getCurrentUserAssignedClasses(),
      ]);
      setAssignedClasses(userAssigned);

      if (userAssigned !== null) {
        // Mode Enseignant / Titulaire : Filtrage strict par classes assignées
        const filteredCls = (clsList || []).filter(c =>
          userAssigned.some(ac =>
            ac.toLowerCase().trim() === c.nom.toLowerCase().trim() ||
            c.nom.toLowerCase().includes(ac.toLowerCase().trim()) ||
            ac.toLowerCase().includes(c.nom.toLowerCase().trim())
          )
        );
        const filteredElv = (elvList || []).filter(s => {
          const sc = (s.nomClasse || (s as any).classe || (s as any).salle || '').toLowerCase().trim();
          return userAssigned.some(ac => {
            const acLower = ac.toLowerCase().trim();
            return sc === acLower || sc.includes(acLower) || acLower.includes(sc);
          });
        });
        setStudents(filteredElv);
        setClasses(filteredCls);
      } else {
        setStudents(elvList || []);
        setClasses(clsList || []);
      }
    } catch (err) {
      console.error('[StudentsManager] Erreur chargement :', err);
      setStudents([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolYear]);

  // Sync initial class filter
  useEffect(() => {
    if (initialClassFilter) setSelectedClass(initialClassFilter);
  }, [initialClassFilter]);

  // Options pour CustomSelect Classe
  const classOptions = useMemo(() => [
    { value: '', label: `Toutes les classes (${classes.length})` },
    ...classes.map(cls => ({ value: cls.id, label: cls.nom })),
  ], [classes]);

  const cycleOptions: SelectOption[] = [
    { value: 'ALL', label: 'Tous les Cycles' },
    { value: 'MATERNELLE', label: 'Cycle Maternelle' },
    { value: 'PRIMAIRE', label: 'Cycle Primaire' },
    { value: 'SECONDAIRE_CTEB', label: 'CTEB (7e & 8e)' },
    { value: 'HUMANITES', label: 'Humanités (Scolaires)' },
  ];

  const statutOptions: SelectOption[] = [
    { value: 'ALL', label: 'Tous les Statuts' },
    { value: 'ACTIF', label: 'Actifs uniquement' },
    { value: 'TRANSFERE', label: 'Transférés' },
    { value: 'FINALISTE', label: 'Finalistes (EXETAT)' },
    { value: 'EXCLU', label: 'Exclus' },
  ];

  const sexeOptions: SelectOption[] = [
    { value: 'ALL', label: 'Tous les Sexes' },
    { value: 'M', label: 'Masculin (Garçons)' },
    { value: 'F', label: 'Féminin (Filles)' },
  ];

  const sortOptions: SelectOption[] = [
    { value: 'NAME_ASC', label: 'Nom (A à Z)' },
    { value: 'NAME_DESC', label: 'Nom (Z à A)' },
    { value: 'DATE_DESC', label: 'Plus Récemment Inscrits' },
    { value: 'CLASS', label: 'Par Classe Scolaire' },
  ];

  // Élèves filtrés et triés
  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const q = search.toLowerCase().trim();
      const matchesQuery = !q
        || s.prenom.toLowerCase().includes(q)
        || s.nom.toLowerCase().includes(q)
        || (s.postnom && s.postnom.toLowerCase().includes(q))
        || s.registrationNumber.toLowerCase().includes(q)
        || (s.telephoneParent && s.telephoneParent.includes(q));

      const matchesClass = !selectedClass || s.classId === selectedClass || s.nomClasse === classes.find(c => c.id === selectedClass)?.nom;
      const matchesStatut = selectedStatut === 'ALL' || s.statut === selectedStatut;
      const matchesSexe = selectedSexe === 'ALL' || s.sexe === selectedSexe;

      return matchesQuery && matchesClass && matchesStatut && matchesSexe;
    });

    // Tri
    result = [...result].sort((a, b) => {
      let res = 0;
      switch (tableSortField) {
        case 'matricule':
          res = (a.registrationNumber || '').localeCompare(b.registrationNumber || '');
          break;
        case 'classe':
          res = (a.nomClasse || '').localeCompare(b.nomClasse || '');
          break;
        case 'sexe':
          res = (a.sexe || '').localeCompare(b.sexe || '');
          break;
        case 'statut':
          res = (a.statut || '').localeCompare(b.statut || '');
          break;
        case 'parent':
          res = (a.nomTuteur || a.telephoneParent || '').localeCompare(b.nomTuteur || b.telephoneParent || '');
          break;
        case 'name':
        default:
          res = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
          break;
      }
      return tableSortOrder === 'asc' ? res : -res;
    });

    return result;
  }, [students, search, selectedClass, selectedStatut, selectedSexe, tableSortField, tableSortOrder, classes]);

  const { paginated: paginatedStudents, ...studentsPagination } = usePagination(filteredStudents, { defaultPageSize: 10 });

  // Handlers CRUD
  const handleDeleteStudent = async (id: string) => {
    try {
      await LocalDatabaseService.deleteEleve(id);
      await loadData();
    } catch (err) {
      console.error('Erreur suppression élève :', err);
      setStudents(prev => prev.filter(s => s.id !== id));
    } finally {
      setDeleteStudentId(null);
    }
  };

  // VUE DÉDIÉE : ASSISTANT D'INSCRIPTION / MODIFICATION ÉLÈVE
  if (showRegisterModal || editingStudent) {
    return (
      <StudentRegistrationModal
        initialStudent={editingStudent || undefined}
        onBack={() => {
          setShowRegisterModal(false);
          setEditingStudent(null);
        }}
        onRegister={async (newStudent) => {
          await loadData();
          setShowRegisterModal(false);
        }}
        onUpdate={async (updatedStudent) => {
          // Rafraîchit la liste ET redirige vers la fiche mise à jour
          await loadData();
          setEditingStudent(null);
          setSelectedStudent(updatedStudent);
        }}
      />
    );
  }

  // VUE DÉDIÉE : FICHE DÉTAILLÉE ÉLÈVE
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
    <div className="space-y-6 animate-fade-in select-none">
      {/* EN-TÊTE DE SECTION & ACTIONS HAUT DE PAGE */}
      <div
        className="p-6 rounded-2xl border-0 shadow-lg shadow-indigo-500/5 transition-all duration-300"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shrink-0 shadow-md shadow-indigo-500/30">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Dossiers Élèves & Inscriptions
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Répertoire national certifié EPST RDC · Inscription, fiches médicales & cartes QR d'élèves
                </p>
              </div>
            </div>
          </div>

          {assignedClasses !== null && (
            <div className="w-full mt-3 p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  {assignedClasses.length > 0
                    ? `Mode Enseignant / Titulaire : Affichage limité à vos classes et élèves assignés (${assignedClasses.join(', ')})`
                    : "Mode Enseignant / Titulaire : Aucune classe ou salle ne vous est attribuée pour le moment."}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 uppercase tracking-wider">Accès Réduit</span>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowBulkIdCardModal(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.97]"
              style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}
            >
              <QrCode className="w-4 h-4 text-indigo-500 icon-animated" />
              <span>Cartes QR par Classe</span>
            </button>

            <button
              onClick={() => {
                setEditingStudent(null);
                setShowRegisterModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white text-xs font-bold shadow-md shadow-indigo-500/25 hover:shadow-lg flex items-center gap-2 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Nouveau Dossier Élève (Wizard)</span>
            </button>
          </div>
        </div>

        {/* CARTE STATISTIQUES KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/40">
          <div className="p-4 rounded-xl border-0 shadow-sm hover:shadow-md transition-all space-y-1.5" style={{ background: 'var(--bg-sunken)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Inscrits</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{students.length}</span>
              <GraduationCap className="w-4.5 h-4.5 text-indigo-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Élèves enregistrés</p>
          </div>

          <div className="p-4 rounded-xl border-0 shadow-sm hover:shadow-md transition-all space-y-1.5" style={{ background: 'var(--bg-sunken)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Élèves Actifs</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{students.filter(s => s.statut === 'ACTIF' || !s.statut).length}</span>
              <Check className="w-4.5 h-4.5 text-emerald-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Fréquentation régulière</p>
          </div>

          <div className="p-4 rounded-xl border-0 shadow-sm hover:shadow-md transition-all space-y-1.5" style={{ background: 'var(--bg-sunken)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filles & Garçons</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-pink-600 dark:text-pink-400">{students.filter(s => s.sexe === 'F').length} F</span>
              <Users className="w-4.5 h-4.5 text-pink-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">{students.filter(s => s.sexe === 'M' || !s.sexe).length} Garçons</p>
          </div>

          <div className="p-4 rounded-xl border-0 shadow-sm hover:shadow-md transition-all space-y-1.5" style={{ background: 'var(--bg-sunken)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Finalistes EXETAT</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{students.filter(s => s.statut === 'FINALISTE').length}</span>
              <Star className="w-4.5 h-4.5 text-purple-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Session d'Examens 2026</p>
          </div>
        </div>

        {/* RÉPARTITION PAR CYCLES SCOLAIRES */}
        <div className="mt-4 pt-3 border-t flex items-center gap-2 flex-wrap text-xs" style={{ borderColor: 'var(--border)' }}>
          <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Répartition par Cycle :</span>
          <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-black">
            Maternelle : {students.filter(s => { const c = classes.find(cl => cl.id === s.classId || cl.nom === s.nomClasse); return c?.cycleId === 'MATERNELLE' || s.nomClasse?.toLowerCase().includes('mat'); }).length}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-black">
            Primaire : {students.filter(s => { const c = classes.find(cl => cl.id === s.classId || cl.nom === s.nomClasse); return c?.cycleId === 'PRIMAIRE' || s.nomClasse?.toLowerCase().includes('prim'); }).length}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300 font-black">
            CTEB 7è-8è : {students.filter(s => { const c = classes.find(cl => cl.id === s.classId || cl.nom === s.nomClasse); return c?.cycleId === 'SECONDAIRE_CTEB' || s.nomClasse?.toLowerCase().includes('eb') || s.nomClasse?.toLowerCase().includes('7') || s.nomClasse?.toLowerCase().includes('8'); }).length}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black">
            Humanités : {students.filter(s => { const c = classes.find(cl => cl.id === s.classId || cl.nom === s.nomClasse); return c?.cycleId === 'HUMANITES' || s.nomClasse?.toLowerCase().includes('hum'); }).length}
          </span>
        </div>
      </div>

      {/* CADRE UNIQUE GLOBAL : RECHERCHE + FILTRES + TABLEAU ÉLÈVES + PAGINATION */}
      <div
        className="rounded-2xl border shadow-xs transition-colors overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* EN-TÊTE DU CADRE : DEUX LIGNES (RECHERCHE + FILTRES MULTI-CRITÈRES) */}
        <div className="p-4 sm:p-5 border-b space-y-3.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          {/* LIGNE 1 : RECHERCHE, TRI & TOGGLE DE VUE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Champ de Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, matricule EPST, téléphone parent..."
                value={search}
                onChange={e => { setSearch(e.target.value); studentsPagination.setPage(1); }}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xs"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Tri & Bascule Vue (Tableau Liste par Défaut / Grille) */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              <div className="w-44">
                <CustomSelect
                  options={sortOptions}
                  value={sortBy}
                  onChange={val => setSortBy(val as any)}
                  placeholder="Trier par..."
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl border shadow-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Vue en Grille de Cartes"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Vue en Tableau Liste (Par Défaut)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* LIGNE 2 : LES 3 FILTRES DROPDOWNS DANS LE MÊME CADRE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CustomSelect
              options={classOptions}
              value={selectedClass}
              onChange={val => { setSelectedClass(val); studentsPagination.setPage(1); }}
              placeholder="Filtrer par Classe"
            />

            <CustomSelect
              options={statutOptions}
              value={selectedStatut}
              onChange={val => { setSelectedStatut(val); studentsPagination.setPage(1); }}
              placeholder="Filtrer par Statut"
            />

            <CustomSelect
              options={sexeOptions}
              value={selectedSexe}
              onChange={val => { setSelectedSexe(val); studentsPagination.setPage(1); }}
              placeholder="Filtrer par Sexe"
            />
          </div>
        </div>

        {/* CORPS DU CADRE : TABLEAU / GRILLE D'ÉLÈVES */}
        <div className="flex-1">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Chargement des dossiers élèves en cours...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <GraduationCap className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Aucun élève ne correspond à votre recherche</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Vérifiez l'orthographe du nom ou modifiez les filtres de classe et de statut sélectionnés.
              </p>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setShowRegisterModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-indigo-500/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Inscrire un Élève
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* VUE GRILLE D'ÉLÈVES DANS LE CADRE */
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedStudents.map(s => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                >
                  <div className="space-y-3.5">
                    {/* Header Carte Élève */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt={s.prenom}
                            onClick={() => setZoomStudent(s)}
                            className="w-12 h-12 rounded-xl object-cover shadow-xs shrink-0 cursor-pointer hover:scale-110 hover:border-2 hover:border-indigo-500 transition-all"
                            title="Cliquer pour voir la photo en grand"
                          />
                        ) : (
                          <div
                            onClick={() => setZoomStudent(s)}
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-black shrink-0 shadow-xs cursor-pointer hover:scale-110 transition-all"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
                            title="Cliquer pour voir la photo"
                          >
                            {s.prenom[0]}{s.nom[0]}
                          </div>
                        )}
                        <div className="space-y-0.5 min-w-0">
                          <h3 className="font-extrabold text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {s.prenom} {s.nom}
                          </h3>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{s.postnom || '—'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600">
                          {s.statut}
                        </span>
                        <StudentActionMenu
                          student={s}
                          onViewDetail={setSelectedStudent}
                          onViewQrCard={setCardModalStudent}
                          onViewDocs={setDocsModalStudent}
                          onEdit={setEditingStudent}
                          onDelete={setDeleteStudentId}
                          onZoomPhoto={setZoomStudent}
                        />
                      </div>
                    </div>

                    {/* Badges Matricule & Classe */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                        {s.registrationNumber}
                      </span>
                      <span className="font-bold px-2.5 py-0.5 rounded-md border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                        {s.nomClasse}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${s.sexe === 'M' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-pink-500/10 text-pink-500'}`}>
                        {s.sexe === 'M' ? 'Garçon' : 'Fille'}
                      </span>
                    </div>

                    {/* Parent Contact */}
                    <div className="p-3 rounded-xl border space-y-1 text-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                      <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.nomParent || s.nomPere || 'Non renseigné'}</p>
                      <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{s.telephoneParent || s.telephonePere || 'Non renseigné'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ouvrir la Fiche Élève</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* VUE TABLEAU MODERNE FLUIDE (Material Design 3) */
            <div className="modern-table-container border-t" style={{ borderColor: 'var(--border)' }}>
              <table className="modern-table w-full">
                <thead>
                  <tr className="table-sticky-header">
                    <SortableTh label="Élève & Identité" field="name" currentSortField={tableSortField} currentSortOrder={tableSortOrder} onSort={handleTableSort} className="w-1/4" />
                    <SortableTh label="Matricule EPST" field="matricule" currentSortField={tableSortField} currentSortOrder={tableSortOrder} onSort={handleTableSort} />
                    <SortableTh label="Classe & Promotion" field="classe" currentSortField={tableSortField} currentSortOrder={tableSortOrder} onSort={handleTableSort} />
                    <SortableTh label="Sexe" field="sexe" currentSortField={tableSortField} currentSortOrder={tableSortOrder} onSort={handleTableSort} />
                    <SortableTh label="Statut Scolaire" field="statut" currentSortField={tableSortField} currentSortOrder={tableSortOrder} onSort={handleTableSort} />
                    <SortableTh label="Parent / Tuteur" field="parent" currentSortField={tableSortField} currentSortOrder={tableSortOrder} onSort={handleTableSort} />
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map(s => (
                    <tr key={s.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          {s.photoUrl ? (
                            <img
                              src={s.photoUrl}
                              alt={s.prenom}
                              onClick={() => setZoomStudent(s)}
                              className="w-9 h-9 rounded-xl object-cover shadow-xs shrink-0 cursor-pointer hover:scale-110 border border-slate-500/20 hover:border-indigo-500 transition-all"
                              title="Cliquer pour voir la photo en grand"
                            />
                          ) : (
                            <div
                              onClick={() => setZoomStudent(s)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs cursor-pointer hover:scale-110 transition-all bg-gradient-to-tr from-indigo-600 to-indigo-500"
                              title="Cliquer pour voir la photo"
                            >
                              {s.prenom[0]}{s.nom[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                              {s.prenom} {s.nom}
                            </p>
                            <p className="text-[10.5px] font-semibold text-slate-400">{s.postnom || '—'}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                          {s.registrationNumber}
                        </span>
                      </td>
                      <td className="font-bold" style={{ color: 'var(--text-primary)' }}>{s.nomClasse}</td>
                      <td>
                        <span className={`chip-tonal ${s.sexe === 'M' ? 'chip-tonal-indigo' : 'chip-tonal-rose'}`}>
                          {s.sexe === 'M' ? 'Masculin' : 'Féminin'}
                        </span>
                      </td>
                      <td>
                        <span className="chip-tonal chip-tonal-emerald">
                          {s.statut}
                        </span>
                      </td>
                      <td className="font-medium text-slate-600 dark:text-slate-300">
                        <div>
                          <p className="font-semibold text-xs truncate max-w-[160px]">{s.nomParent || s.nomPere || '—'}</p>
                          <p className="text-[10.5px] font-mono text-slate-400 truncate">{s.telephoneParent || s.telephonePere || '—'}</p>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedStudent(s)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs active:scale-[0.97] shadow-xs cursor-pointer transition-all"
                          >
                            Fiche
                          </button>
                          <StudentActionMenu
                            student={s}
                            onViewDetail={setSelectedStudent}
                            onViewQrCard={setCardModalStudent}
                            onViewDocs={setDocsModalStudent}
                            onEdit={setEditingStudent}
                            onDelete={setDeleteStudentId}
                            onZoomPhoto={setZoomStudent}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PIED DU CADRE : CONTRÔLES DE PAGINATION INTÉGRÉS DANS LE MÊME CADRE */}
        {filteredStudents.length > 0 && (
          <Pagination
            currentPage={studentsPagination.page}
            totalPages={studentsPagination.totalPages}
            total={studentsPagination.total}
            pageSize={studentsPagination.pageSize}
            start={studentsPagination.start}
            end={studentsPagination.end}
            onPageChange={studentsPagination.setPage}
            onPageSizeChange={studentsPagination.setPageSize}
          />
        )}
      </div>

      {/* MODALE INDIVIDUELLE CARTE QR */}
      {cardModalStudent && (
        <StudentIdCardModal
          isOpen={!!cardModalStudent}
          onClose={() => setCardModalStudent(null)}
          student={cardModalStudent}
        />
      )}

      {/* MODALE INDIVIDUELLE DOSSIERS & SCANS */}
      {docsModalStudent && (
        <StudentDocumentsModal
          isOpen={!!docsModalStudent}
          onClose={() => {
            setDocsModalStudent(null);
            loadData();
          }}
          student={docsModalStudent}
          mode="student"
        />
      )}

      {/* MODALE BATCH CARTES QR CLASSES */}
      <BulkIdCardModal
        isOpen={showBulkIdCardModal}
        onClose={() => setShowBulkIdCardModal(false)}
        students={students}
      />

      {/* CONFIRMATION DE SUPPRESSION D'ÉLÈVE */}
      {deleteStudentId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setDeleteStudentId(null)}>
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl border-0 p-6 space-y-4 text-center"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border-0 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Confirmer la Suppression ?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Cette action supprimera définitivement le dossier scolaire, la carte QR et l'historique de l'élève.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteStudentId(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs border-0 shadow-xs hover:bg-slate-500/10 cursor-pointer active:scale-[0.97]"
                style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteStudent(deleteStudentId)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/25 cursor-pointer active:scale-[0.97]"
              >
                Supprimer Définitivement
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODALE LIGHTBOX GRAND FORMAT PHOTO ÉLÈVE */}
      <PhotoLightboxModal
        isOpen={!!zoomStudent}
        onClose={() => setZoomStudent(null)}
        photoUrl={zoomStudent?.photoUrl}
        title={zoomStudent ? `${zoomStudent.prenom} ${zoomStudent.nom} ${zoomStudent.postnom || ''}` : ''}
        subtitle={zoomStudent ? `Matricule : ${zoomStudent.registrationNumber} · Classe : ${zoomStudent.nomClasse}` : ''}
        badge={zoomStudent?.statut}
      />
    </div>
  );
};
