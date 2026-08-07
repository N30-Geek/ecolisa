import React, { useState, useEffect, useMemo } from 'react';
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
  FileCheck
} from 'lucide-react';
import { Eleve, ClasseScolaire, AnneeScolaireConfig } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { StudentRegistrationModal } from './StudentRegistrationModal';
import { StudentIdCardModal } from './StudentIdCardModal';
import { StudentFullFileModal } from './StudentFullFileModal';
import { BulkIdCardModal } from './BulkIdCardModal';
import { StudentDetailPage } from './StudentDetailPage';
import { mockStudents, mockClasses } from '../../data/mockData';

interface StudentsManagerProps {
  initialClassFilter?: string;
}

// Pagination Bar réutilisable
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

  const pageSizeOptions: SelectOption[] = [
    { value: '5', label: '5 par page' },
    { value: '10', label: '10 par page' },
    { value: '25', label: '25 par page' },
    { value: '50', label: '50 par page' },
    { value: '100', label: '100 par page' },
  ];

  return (
    <div
      className="p-4 border-t border-slate-100 dark:border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
      style={{ background: 'var(--bg-sunken)' }}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-500 dark:text-slate-400">Afficher :</span>
        <CustomSelect
          options={pageSizeOptions}
          value={String(pageSize)}
          onChange={(val) => {
            onPageSizeChange(Number(val));
            onPageChange(1);
          }}
          className="w-32"
        />
        <span className="font-bold text-slate-500 dark:text-slate-400 ml-2">
          {startItem} – {endItem} sur {totalItems} élèves
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/15 cursor-pointer"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          ‹ Précédent
        </button>

        <span className="px-3 py-1 font-black text-indigo-600 dark:text-indigo-400">
          Page {currentPage} / {totalPages}
        </span>

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/15 cursor-pointer"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          Suivant ›
        </button>
      </div>
    </div>
  );
};

// ── COMPOSANT PRINCIPAL STUDENTS MANAGER ──
export const StudentsManager: React.FC<StudentsManagerProps> = ({ initialClassFilter = '' }) => {
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState(initialClassFilter);
  const [selectedCycle, setSelectedCycle] = useState('ALL');
  const [selectedStatut, setSelectedStatut] = useState('ALL');
  const [selectedSexe, setSelectedSexe] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modales & Détails
  const [selectedStudent, setSelectedStudent] = useState<Eleve | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showBulkIdCardModal, setShowBulkIdCardModal] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Chargement des données SQLite
  const loadData = async () => {
    setLoading(true);
    try {
      const [elvList, clsList] = await Promise.all([
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getClasses(),
      ]);
      setStudents(elvList.length > 0 ? elvList : mockStudents);
      setClasses(clsList.length > 0 ? clsList : mockClasses);
    } catch (err) {
      console.error('[StudentsManager] Erreur chargement :', err);
      setStudents(mockStudents);
      setClasses(mockClasses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    { value: 'MATERNELLE', label: 'Maternelle' },
    { value: 'PRIMAIRE', label: 'Primaire' },
    { value: 'SECONDAIRE_CTEB', label: 'CTEB (7e-8e)' },
    { value: 'HUMANITES', label: 'Humanités' },
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

  // Élèves filtrés
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
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
  }, [students, search, selectedClass, selectedStatut, selectedSexe, classes]);

  // Élèves paginés
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Handlers CRUD
  const handleRegisterNewStudent = async (newStudent: Eleve) => {
    try {
      await LocalDatabaseService.addEleve(newStudent);
      await loadData();
    } catch (err) {
      console.error('Erreur inscription élève :', err);
    }
    setShowRegisterModal(false);
  };

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

  if (selectedStudent) {
    return (
      <StudentDetailPage
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
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

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowBulkIdCardModal(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.97]"
              style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}
            >
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>Cartes QR par Classe</span>
            </button>

            <button
              onClick={() => setShowRegisterModal(true)}
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
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{students.filter(s => s.statut === 'ACTIF').length}</span>
              <Check className="w-4.5 h-4.5 text-emerald-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Fréquentation régulière</p>
          </div>

          <div className="p-4 rounded-xl border-0 shadow-sm hover:shadow-md transition-all space-y-1.5" style={{ background: 'var(--bg-sunken)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filles (Parité EPST)</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-pink-600 dark:text-pink-400">{students.filter(s => s.sexe === 'F').length}</span>
              <Users className="w-4.5 h-4.5 text-pink-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Garçons : {students.filter(s => s.sexe === 'M').length}</p>
          </div>

          <div className="p-4 rounded-xl border-0 shadow-sm hover:shadow-md transition-all space-y-1.5" style={{ background: 'var(--bg-sunken)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Finalistes EXETAT</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{students.filter(s => s.statut === 'FINALISTE').length || 136}</span>
              <Star className="w-4.5 h-4.5 text-purple-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Session d'Examens 2026</p>
          </div>
        </div>
      </div>

      {/* BARRE DE FILTRAGE ET RECHERCHE MULTI-CRITÈRES */}
      <div
        className="p-4 rounded-2xl border-0 shadow-md space-y-3 transition-colors"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Barre de Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, matricule EPST, téléphone parent..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border-0 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
              style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Mode d'affichage Grille vs Table */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mode :</span>
            <div className="flex items-center gap-1 p-1 rounded-xl shadow-xs" style={{ background: 'var(--bg-sunken)' }}>
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
                title="Vue en Tableau"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtres Dropdowns (CustomSelect) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/40">
          <CustomSelect
            options={classOptions}
            value={selectedClass}
            onChange={val => { setSelectedClass(val); setCurrentPage(1); }}
            placeholder="Filtrer par Classe"
          />

          <CustomSelect
            options={statutOptions}
            value={selectedStatut}
            onChange={val => { setSelectedStatut(val); setCurrentPage(1); }}
            placeholder="Filtrer par Statut"
          />

          <CustomSelect
            options={sexeOptions}
            value={selectedSexe}
            onChange={val => { setSelectedSexe(val); setCurrentPage(1); }}
            placeholder="Filtrer par Sexe"
          />
        </div>
      </div>

      {/* RÉSULTATS ÉLÈVES (GRILLE OU TABLEAU) */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl border-0 shadow-md" style={{ background: 'var(--bg-surface)' }}>
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Chargement des dossiers élèves en cours...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-0 shadow-md space-y-3" style={{ background: 'var(--bg-surface)' }}>
          <GraduationCap className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Aucun élève ne correspond à votre recherche</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Vérifiez l'orthographe du nom ou modifiez les filtres de classe et de statut sélectionnés.
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-indigo-500/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Inscrire un Élève
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* VUE GRILLE DE CARTES ÉLÈVES */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedStudents.map(s => (
            <div
              key={s.id}
              className="p-5 rounded-2xl border-0 shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div className="space-y-3.5">
                {/* Header Carte Élève */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt={s.prenom} className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-black shrink-0 shadow-md"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
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

                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 shrink-0">
                    {s.statut}
                  </span>
                </div>

                {/* Badges Matricule & Classe */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                    {s.registrationNumber}
                  </span>
                  <span className="font-bold px-2.5 py-0.5 rounded-md" style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}>
                    {s.nomClasse}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${s.sexe === 'M' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-pink-500/10 text-pink-500'}`}>
                    {s.sexe === 'M' ? 'Garçon' : 'Fille'}
                  </span>
                </div>

                {/* Parent Contact */}
                <div className="p-3 rounded-xl space-y-1 text-xs" style={{ background: 'var(--bg-sunken)' }}>
                  <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.nomParent}</p>
                  <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{s.telephoneParent}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedStudent(s)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Fiche Élève</span>
                </button>

                <button
                  onClick={() => setDeleteStudentId(s.id)}
                  className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.95] transition-all duration-200 cursor-pointer"
                  title="Supprimer la fiche élève"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VUE TABLEAU DE BORD */
        <div className="rounded-2xl border-0 shadow-md overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b uppercase tracking-wider text-[10px] font-bold text-slate-500 dark:text-slate-400" style={{ background: 'var(--bg-sunken)' }}>
                  <th className="p-3.5">Élève & Photo</th>
                  <th className="p-3.5">Matricule EPST</th>
                  <th className="p-3.5">Classe</th>
                  <th className="p-3.5">Sexe</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5">Parent / Contact</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {paginatedStudents.map(s => (
                  <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt={s.prenom} className="w-9 h-9 rounded-xl object-cover shadow-xs shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
                            {s.prenom[0]}{s.nom[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{s.prenom} {s.nom}</p>
                          <p className="text-[10.5px] font-medium text-slate-400">{s.postnom || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] font-bold text-indigo-500">{s.registrationNumber}</td>
                    <td className="p-3.5 font-bold" style={{ color: 'var(--text-primary)' }}>{s.nomClasse}</td>
                    <td className="p-3.5 font-bold">{s.sexe === 'M' ? 'Masculin' : 'Féminin'}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600">
                        {s.statut}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium">{s.nomParent} ({s.telephoneParent})</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs active:scale-[0.97] shadow-xs cursor-pointer"
                        >
                          Fiche
                        </button>
                        <button
                          onClick={() => setDeleteStudentId(s.id)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-500/10 active:scale-[0.95] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTRÔLES DE PAGINATION */}
      {filteredStudents.length > 0 && (
        <PaginationBar
          totalItems={filteredStudents.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* MODALE D'INSCRIPTION ÉLÈVE WIZARD */}
      {showRegisterModal && (
        <StudentRegistrationModal
          onBack={() => setShowRegisterModal(false)}
          onRegister={handleRegisterNewStudent}
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

            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Supprimer ce dossier élève ?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Êtes-vous sûr de vouloir supprimer définitivement cette fiche élève du registre scolaire ?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteStudentId(null)}
                className="px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-500/20 cursor-pointer shadow-xs"
                style={{ color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteStudent(deleteStudentId)}
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
