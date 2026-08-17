import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Layers,
  Plus,
  Search,
  Edit3,
  Trash2,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Filter,
  RefreshCw,
  Award,
  X,
  BookMarked,
  Calculator,
  Compass,
  GraduationCap,
  Clock,
  UserCheck,
  School,
  FileSpreadsheet,
  Palette,
  ShieldCheck,
  Check,
  AlertCircle,
  Users,
  ChevronRight,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { Discipline, MembrePersonnel, GroupeActiviteMaternelle } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import {
  OFFICIAL_EPST_COURSES,
  EPST_SECTIONS_OPTIONS,
  GROUPE_MATERNELLE_LABELS,
  CourseReference,
} from '../../data/referentielEpstData';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getSafeScore = (val: any, defaultVal: number = 20): number => {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = Number(val);
  return isNaN(num) || num <= 0 ? defaultVal : num;
};

const getCategoryBadge = (cat?: string) => {
  switch (cat) {
    case 'LANGUES':
      return { label: 'Langues & Comm.', style: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' };
    case 'SCIENCES_EXACTES':
    case 'SCIENCES':
      return { label: 'Sciences Exactes', style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
    case 'SCIENCES_HUMAINES':
    case 'CULTURE_GENERALE':
      return { label: 'Sciences Humaines', style: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' };
    case 'TECHNIQUE_PROF':
    case 'OPTION':
      return { label: 'Technique & Pro.', style: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
    case 'PRATIQUE':
      return { label: 'Pratique & Atelier', style: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' };
    case 'EVEIL_ART':
      return { label: 'Éveil, EPS & Arts', style: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' };
    default:
      return { label: cat || 'Général', style: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' };
  }
};

const getCycleBadge = (cycle?: string) => {
  switch (cycle) {
    case 'MATERNELLE':
      return { label: 'Maternelle', style: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30' };
    case 'PRIMAIRE':
      return { label: 'Primaire', style: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' };
    case 'SECONDAIRE_CTEB':
      return { label: 'CTEB (7è/8è)', style: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30' };
    case 'HUMANITES':
      return { label: 'Humanités', style: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' };
    default:
      return { label: cycle || 'Tronc Commun', style: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' };
  }
};

interface SubjectsManagerProps {
  activeSchoolYear?: string;
}

export const SubjectsManager: React.FC<SubjectsManagerProps> = ({ activeSchoolYear }) => {
  const [subjectsList, setSubjectsList] = useState<Discipline[]>([]);
  const [staffList, setStaffList] = useState<MembrePersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Filtres
  const [cycleFilter, setCycleFilter] = useState<string>('ALL');
  const [optionFilter, setOptionFilter] = useState<string>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modale d'ajout / édition
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Discipline | null>(null);
  const [formData, setFormData] = useState<{
    code: string;
    nom: string;
    categorie: string;
    maxScore: number;
    maxExamen: number;
    maxSemestre: number;
    maxAnnuel: number;
    coefficient: number;
    volumeHoraire: number;
    cycleCode: string;
    optionCode: string;
    groupeMaternelle?: GroupeActiviteMaternelle;
    enseignantId?: string;
    isOptionMajora: boolean;
  }>({
    code: '',
    nom: '',
    categorie: 'LANGUES',
    maxScore: 20,
    maxExamen: 40,
    maxSemestre: 80,
    maxAnnuel: 160,
    coefficient: 2,
    volumeHoraire: 4,
    cycleCode: 'HUMANITES',
    optionCode: 'COMMERCIALE',
    groupeMaternelle: undefined,
    enseignantId: '',
    isOptionMajora: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [subjects, staff] = await Promise.all([
        LocalDatabaseService.getSubjects(),
        LocalDatabaseService.getStaff(),
      ]);
      setSubjectsList(subjects || []);
      setStaffList(staff || []);
    } catch (e) {
      console.error('Erreur chargement matières & personnel:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolYear]);

  // Options du personnel enseignant
  const teacherOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'Tous les Enseignants' },
      { value: 'NON_ASSIGNE', label: '— Cours Non Assigné —' },
      ...staffList.map((st) => ({
        value: st.id,
        label: `${st.nom} ${st.prenom || ''} (${st.role})`,
      })),
    ];
  }, [staffList]);

  // FILTRAGE DES MATIÈRES
  const filteredSubjects = useMemo(() => {
    return subjectsList.filter((s) => {
      if (cycleFilter !== 'ALL' && s.cycleCode && s.cycleCode !== cycleFilter) return false;
      if (optionFilter !== 'ALL' && s.optionCode && s.optionCode !== optionFilter) return false;
      if (teacherFilter !== 'ALL') {
        if (teacherFilter === 'NON_ASSIGNE') {
          if (s.enseignantId) return false;
        } else if (s.enseignantId !== teacherFilter) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const tName = (s.enseignantNom || '').toLowerCase();
        return (
          s.nom.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          tName.includes(q)
        );
      }
      return true;
    });
  }, [subjectsList, cycleFilter, optionFilter, teacherFilter, search]);

  const { paginated: paginatedSubjects, ...subjectsTabPagination } = usePagination(filteredSubjects, { defaultPageSize: 10 });

  // STATISTIQUES EN TEMPS RÉEL
  const stats = useMemo(() => {
    const totalCount = subjectsList.length;
    const majorCount = subjectsList.filter((s) => s.isOptionMajora || (s.coefficient || 1) >= 3).length;
    const exactSciences = subjectsList.filter((s) => s.categorie === 'SCIENCES_EXACTES' || s.categorie === 'SCIENCES').length;
    const languages = subjectsList.filter((s) => s.categorie === 'LANGUES').length;
    const maternelleActivities = subjectsList.filter((s) => s.cycleCode === 'MATERNELLE').length;

    return {
      totalCount,
      majorCount,
      exactSciences,
      languages,
      maternelleActivities,
    };
  }, [subjectsList]);

  // CHARGER LE PROGRAMME OFFICIEL EPST RDC EN 1 CLIC
  const handleLoadOfficialProgram = async () => {
    if (!window.confirm('Voulez-vous synchroniser et charger le référentiel officiel complet des cours & activités EPST RDC ?')) return;
    setImporting(true);
    try {
      await LocalDatabaseService.seedOfficialEPSTSubjects();
      await loadData();
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 4000);
    } catch (e) {
      console.error(e);
      alert('Erreur lors du chargement du programme officiel EPST.');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setFormData({
      code: `DISC-${Math.floor(Math.random() * 900 + 100)}`,
      nom: '',
      categorie: 'LANGUES',
      maxScore: 20,
      maxExamen: 40,
      maxSemestre: 80,
      maxAnnuel: 160,
      coefficient: 2,
      volumeHoraire: 4,
      cycleCode: 'HUMANITES',
      optionCode: 'COMMERCIALE',
      groupeMaternelle: undefined,
      enseignantId: '',
      isOptionMajora: false,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sub: Discipline) => {
    setEditingSubject(sub);
    const pScore = getSafeScore(sub.maxScore, 20);
    const exScore = sub.maxExamen || pScore * 2;
    const semScore = sub.maxSemestre || pScore * 4;
    const annScore = sub.maxAnnuel || (sub.cycleCode === 'MATERNELLE' ? pScore * 3 : pScore * 8);

    setFormData({
      code: sub.code || '',
      nom: sub.nom || '',
      categorie: sub.categorie || 'LANGUES',
      maxScore: pScore,
      maxExamen: exScore,
      maxSemestre: semScore,
      maxAnnuel: annScore,
      coefficient: sub.coefficient || 1,
      volumeHoraire: sub.volumeHoraire || 2,
      cycleCode: sub.cycleCode || 'HUMANITES',
      optionCode: sub.optionCode || 'COMMERCIALE',
      groupeMaternelle: sub.groupeMaternelle,
      enseignantId: sub.enseignantId || '',
      isOptionMajora: !!sub.isOptionMajora,
    });
    setShowModal(true);
  };

  // Synchroniser automatiquement les maxima en fonction du Max Période
  const handleMaxScoreChange = (val: number) => {
    const safeP = Math.max(1, val);
    if (formData.cycleCode === 'MATERNELLE') {
      setFormData((prev) => ({
        ...prev,
        maxScore: safeP,
        maxExamen: 0,
        maxSemestre: safeP * 2,
        maxAnnuel: safeP * 3,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        maxScore: safeP,
        maxExamen: safeP * 2,
        maxSemestre: safeP * 4,
        maxAnnuel: safeP * 8,
      }));
    }
  };

  const handleCycleChangeInModal = (cycle: string) => {
    if (cycle === 'MATERNELLE') {
      setFormData((prev) => ({
        ...prev,
        cycleCode: cycle,
        optionCode: 'TRONC_COMMUN',
        categorie: 'EVEIL_ART',
        maxScore: 8,
        maxExamen: 0,
        maxSemestre: 16,
        maxAnnuel: 24,
        groupeMaternelle: 'GROUPE_II',
        coefficient: 1,
        volumeHoraire: 3,
        isOptionMajora: false,
      }));
    } else if (cycle === 'PRIMAIRE') {
      setFormData((prev) => ({
        ...prev,
        cycleCode: cycle,
        optionCode: 'TRONC_COMMUN',
        maxScore: 20,
        maxExamen: 40,
        maxSemestre: 80,
        maxAnnuel: 160,
        coefficient: 2,
        volumeHoraire: 6,
        groupeMaternelle: undefined,
      }));
    } else if (cycle === 'SECONDAIRE_CTEB') {
      setFormData((prev) => ({
        ...prev,
        cycleCode: cycle,
        optionCode: 'TRONC_COMMUN',
        maxScore: 20,
        maxExamen: 40,
        maxSemestre: 80,
        maxAnnuel: 160,
        coefficient: 2,
        volumeHoraire: 4,
        groupeMaternelle: undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        cycleCode: cycle,
        optionCode: prev.optionCode === 'TRONC_COMMUN' ? 'COMMERCIALE' : prev.optionCode,
        maxScore: 20,
        maxExamen: 40,
        maxSemestre: 80,
        maxAnnuel: 160,
        coefficient: 3,
        volumeHoraire: 5,
        groupeMaternelle: undefined,
      }));
    }
  };

  const handleGroupeMaternelleChange = (grp: GroupeActiviteMaternelle) => {
    const meta = GROUPE_MATERNELLE_LABELS[grp];
    setFormData((prev) => ({
      ...prev,
      groupeMaternelle: grp,
      maxScore: meta.maxTrimestre,
      maxExamen: 0,
      maxSemestre: meta.maxTrimestre * 2,
      maxAnnuel: meta.maxAnnuel,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      alert('Veuillez renseigner le nom de la matière ou de l’activité.');
      return;
    }

    // Trouver le nom de l'enseignant si assigné
    const assignedStaff = staffList.find((st) => st.id === formData.enseignantId);
    const teacherName = assignedStaff ? `${assignedStaff.nom} ${assignedStaff.prenom || ''}`.trim() : undefined;

    const payload: Discipline = {
      id: editingSubject ? editingSubject.id : uuid(),
      code: formData.code.trim().toUpperCase(),
      nom: formData.nom.trim(),
      categorie: formData.categorie,
      maxScore: formData.maxScore,
      maxExamen: formData.maxExamen,
      maxSemestre: formData.maxSemestre,
      maxAnnuel: formData.maxAnnuel,
      coefficient: formData.coefficient,
      volumeHoraire: formData.volumeHoraire,
      cycleCode: formData.cycleCode,
      optionCode: formData.optionCode,
      groupeMaternelle: formData.groupeMaternelle,
      enseignantId: formData.enseignantId || undefined,
      enseignantNom: teacherName,
      isOptionMajora: formData.isOptionMajora,
    };

    try {
      if (editingSubject) {
        await LocalDatabaseService.updateSubject(editingSubject.id, payload);
      } else {
        await LocalDatabaseService.addSubject(payload);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l’enregistrement de la matière.');
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (!window.confirm(`Supprimer la matière « ${nom} » ? Cette action est irréversible.`)) return;
    try {
      await LocalDatabaseService.deleteSubject(id);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la suppression.');
    }
  };

  // Maternelle Grouped Data
  const maternelleGrouped = useMemo(() => {
    const items = subjectsList.filter((s) => s.cycleCode === 'MATERNELLE');
    return {
      GROUPE_I: items.filter((s) => s.groupeMaternelle === 'GROUPE_I'),
      GROUPE_II: items.filter((s) => s.groupeMaternelle === 'GROUPE_II'),
      GROUPE_III: items.filter((s) => s.groupeMaternelle === 'GROUPE_III'),
      GROUPE_IV: items.filter((s) => s.groupeMaternelle === 'GROUPE_IV'),
    };
  }, [subjectsList]);

  return (
    <div className="space-y-4 animate-fade-in p-1">
      {/* ===== BANNIÈRE PRINCIPALE & STATS ===== */}
      <div
        className="p-4 sm:p-5 rounded-2xl border shadow-xs relative overflow-hidden flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-colors"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Programme & Barèmes — EPST RDC
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Référentiel Actif
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>Gestion des Cours & Activités Scolaires</span>
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Structure officielle des matières pour la Maternelle (4 groupes d'activités), le Primaire, le Secondaire CTEB et toutes les options des Humanités avec maxima automatiques.
          </p>
        </div>

        {/* Boutons d'Action */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleLoadOfficialProgram}
            disabled={importing}
            className="px-3.5 py-2 rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-50"
            style={{
              background: 'var(--bg-sunken)',
              borderColor: 'var(--border)',
            }}
            title="Charger le catalogue officiel complet des cours et activités EPST RDC"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${importing ? 'animate-spin' : ''}`} />
            <span>{importing ? 'Synchronisation EPST...' : 'Référentiel Officiel RDC'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Ajouter Cours / Activité</span>
          </button>
        </div>
      </div>

      {/* Message de succès synchronisation */}
      {importSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-scale-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Le référentiel officiel complet des cours EPST RDC a été chargé et synchronisé avec succès dans la base de données.</span>
        </div>
      )}

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/25">
            <BookMarked className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate">Total Matières</p>
            <p className="text-base font-black font-mono" style={{ color: 'var(--text-primary)' }}>{stats.totalCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate">Majeures (Seuil 50%)</p>
            <p className="text-base font-black font-mono text-amber-600 dark:text-amber-400">{stats.majorCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
            <Calculator className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate">Sciences & Tech.</p>
            <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{stats.exactSciences}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/25">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate">Langues & Comm.</p>
            <p className="text-base font-black font-mono text-purple-600 dark:text-purple-400">{stats.languages}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3 col-span-2 sm:col-span-1" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/25">
            <Palette className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate">Maternelle (4 Grp)</p>
            <p className="text-base font-black font-mono text-rose-600 dark:text-rose-400">{stats.maternelleActivities} act.</p>
          </div>
        </div>
      </div>

      {/* ===== BARRE DE FILTRAGE INTELLIGENTE MULTI-CRITÈRES ===== */}
      <div
        className="p-3.5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--elevation-1)',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
          {/* Filtre Cycle */}
          <div>
            <CustomSelect
              value={cycleFilter}
              onChange={(v) => {
                setCycleFilter(v);
                if (v === 'MATERNELLE') setOptionFilter('ALL');
              }}
              options={[
                { value: 'ALL', label: 'Tous les Cycles EPST', icon: School },
                { value: 'MATERNELLE', label: 'École Maternelle (Activités)', icon: Palette },
                { value: 'PRIMAIRE', label: 'Cycle Primaire (1ère - 6ème)', icon: School },
                { value: 'SECONDAIRE_CTEB', label: 'Secondaire CTEB (7ème / 8ème EB)', icon: BookOpen },
                { value: 'HUMANITES', label: 'Humanités (Par Option)', icon: GraduationCap },
              ]}
              placeholder="Cycle Scolaire"
            />
          </div>

          {/* Filtre Option */}
          <div>
            <CustomSelect
              value={optionFilter}
              onChange={setOptionFilter}
              options={EPST_SECTIONS_OPTIONS}
              placeholder="Section / Option"
              disabled={cycleFilter === 'MATERNELLE' || cycleFilter === 'PRIMAIRE' || cycleFilter === 'SECONDAIRE_CTEB'}
            />
          </div>

          {/* Filtre Enseignant */}
          <div>
            <CustomSelect
              value={teacherFilter}
              onChange={setTeacherFilter}
              options={teacherOptions}
              placeholder="Professeur Titulaire"
            />
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher matière, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 font-medium transition-all"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== VUE SPÉCIALE ÉCOLE MATERNELLE (BULLETIN OFFICIEL 4 GROUPES) ===== */}
      {cycleFilter === 'MATERNELLE' ? (
        <div
          className="rounded-2xl border shadow-xs overflow-hidden space-y-4 p-4 sm:p-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/30">
                  RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
                </span>
                <span className="text-xs font-bold text-slate-500">MINISTÈRE DE L'EPST</span>
              </div>
              <h2 className="text-base font-extrabold mt-1" style={{ color: 'var(--text-primary)' }}>
                BULLETIN DE L'ENFANT DE LA 2è, 3è ANNÉE MATERNELLE
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                14 Activités officielles réparties en 4 Groupes · Total Trimestre : 120 pts · Total Annuel : 360 pts
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                Qualité (TB / B / M / MAV) · Couleur (Vert / Bleu / Jaune / Rouge)
              </span>
            </div>
          </div>

          {/* Grille des 4 Groupes */}
          <div className="space-y-4">
            {(['GROUPE_I', 'GROUPE_II', 'GROUPE_III', 'GROUPE_IV'] as GroupeActiviteMaternelle[]).map((grpKey) => {
              const meta = GROUPE_MATERNELLE_LABELS[grpKey];
              const groupItems = maternelleGrouped[grpKey] || [];
              const groupTrimTotal = groupItems.length * meta.maxTrimestre;
              const groupAnnTotal = groupItems.length * meta.maxAnnuel;

              return (
                <div
                  key={grpKey}
                  className="rounded-xl border overflow-hidden transition-all"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                >
                  <div className="p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-500/10" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        {meta.label}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{meta.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-black">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                        Max T1-T3: /{groupTrimTotal} pts
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        Total Annuel: /{groupAnnTotal} pts
                      </span>
                    </div>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {groupItems.map((act, idx) => (
                      <div
                        key={act.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-500/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            {act.ordre || idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
                              {act.nom}
                            </p>
                            <p className="text-[10.5px] font-mono text-indigo-600 dark:text-indigo-400">
                              {act.code} · Volume: {act.volumeHoraire || 2}h/sem · {act.enseignantNom ? `Éducateur: ${act.enseignantNom}` : 'Non assigné'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right font-mono text-xs">
                            <span className="font-bold text-slate-500">Trimestre : </span>
                            <span className="font-black text-indigo-600 dark:text-indigo-400">/{act.maxScore} pts</span>
                            <span className="mx-2 text-slate-400">|</span>
                            <span className="font-bold text-slate-500">Annuel : </span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">/{act.maxAnnuel} pts</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(act)}
                              className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
                              title="Modifier"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(act.id, act.nom)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Synthèse Totale Maternelle */}
          <div className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">TOTAL GÉNÉRAL BULLETIN MATERNELLE</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">14 Activités (Groupes I + II + III + IV)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono font-black">
              <span>Trimestre 1 : <strong className="text-indigo-600">/120 pts</strong></span>
              <span>Trimestre 2 : <strong className="text-indigo-600">/120 pts</strong></span>
              <span>Trimestre 3 : <strong className="text-indigo-600">/120 pts</strong></span>
              <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white shadow-xs">ANNUEL : /360 pts</span>
            </div>
          </div>
        </div>
      ) : (
        /* ===== VUE GÉNÉRALE PRIMAIRE / CTEB / HUMANITÉS ===== */
        <div
          className="rounded-2xl border shadow-xs overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Répertoire Académique des Cours EPST RDC · {filteredSubjects.length} résultat(s)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Période, Examen (double), Semestre (4x) et Grand Total Annuel (8x)
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Calcul automatisé des pondérations</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b uppercase tracking-wider text-[10px] font-black text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <th className="p-3.5">Discipline / Cours</th>
                  <th className="p-3.5">Code EPST</th>
                  <th className="p-3.5">Domaine / Catégorie</th>
                  <th className="p-3.5 text-center">Cycle & Option</th>
                  <th className="p-3.5 text-center">Pondération</th>
                  <th className="p-3.5 text-center">Horaire</th>
                  <th className="p-3.5 text-center">Barème (P / Ex / Sem / Ann)</th>
                  <th className="p-3.5">Professeur Titulaire</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {paginatedSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                      <p className="font-bold mb-2">Aucun cours trouvé pour ces critères de filtrage.</p>
                      <button
                        onClick={handleLoadOfficialProgram}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" /> Charger le Référentiel EPST RDC
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedSubjects.map((s) => {
                    const catBadge = getCategoryBadge(s.categorie);
                    const cycBadge = getCycleBadge(s.cycleCode);
                    const pScore = getSafeScore(s.maxScore, 20);
                    const exScore = s.maxExamen || pScore * 2;
                    const semScore = s.maxSemestre || pScore * 4;
                    const annScore = s.maxAnnuel || pScore * 8;
                    const isMajor = s.isOptionMajora || (s.coefficient || 1) >= 3;

                    return (
                      <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                        {/* Discipline */}
                        <td className="p-3.5 font-black text-xs" style={{ color: 'var(--text-primary)' }}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-500/25">
                              {s.nom[0]}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate">{s.nom}</span>
                              {isMajor && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 mt-0.5">
                                  ★ Branche Majeure (Seuil 50%)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="p-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{s.code}</td>

                        {/* Catégorie */}
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadge.style}`}>
                            {catBadge.label}
                          </span>
                        </td>

                        {/* Cycle & Option */}
                        <td className="p-3.5 text-center font-bold text-slate-500 text-[10.5px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${cycBadge.style}`}>
                              {cycBadge.label}
                            </span>
                            <span className="text-[10px] text-slate-400">{s.optionCode?.replace(/_/g, ' ') || 'Tronc Commun'}</span>
                          </div>
                        </td>

                        {/* Coefficient */}
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-black ${isMajor ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'}`}>
                            x{s.coefficient || 1}
                          </span>
                        </td>

                        {/* Horaire */}
                        <td className="p-3.5 text-center font-mono text-xs font-bold text-slate-500">
                          {s.volumeHoraire ? `${s.volumeHoraire}h/sem` : '2h/sem'}
                        </td>

                        {/* Barème */}
                        <td className="p-3.5 text-center font-mono">
                          <div className="flex items-center justify-center gap-1 text-[11px]">
                            <span className="font-bold text-slate-600 dark:text-slate-300" title="Max Période">{pScore}p</span>
                            <span className="text-slate-400">/</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400" title="Max Examen (Double)">{exScore}ex</span>
                            <span className="text-slate-400">/</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400" title="Max Semestre (4x)">{semScore}s</span>
                            <span className="text-slate-400">/</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400" title="Grand Total Annuel (8x)">{annScore}an</span>
                          </div>
                        </td>

                        {/* Enseignant Titulaire */}
                        <td className="p-3.5 text-xs font-bold">
                          {s.enseignantNom ? (
                            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300">
                              <UserCheck className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[140px]">{s.enseignantNom}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">— Non assigné —</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                              title="Modifier"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.nom)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredSubjects.length > 0 && (
            <div className="p-3.5 border-t" style={{ borderColor: 'var(--border)' }}>
              <Pagination
                currentPage={subjectsTabPagination.page}
                totalPages={subjectsTabPagination.totalPages}
                total={subjectsTabPagination.total}
                pageSize={subjectsTabPagination.pageSize}
                start={subjectsTabPagination.start}
                end={subjectsTabPagination.end}
                onPageChange={subjectsTabPagination.setPage}
                onPageSizeChange={subjectsTabPagination.setPageSize}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== MODALE D'AJOUT / ÉDITION ===== */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-2xl rounded-2xl border shadow-xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            {/* Header Modale */}
            <div className="p-4 border-b flex items-center justify-between" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {editingSubject ? 'Modifier le Cours / Activité' : 'Nouveau Cours / Activité EPST'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configuration des pondérations, maxima et affectation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-500/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps du Formulaire */}
            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto sidebar-scroll flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Cycle Scolaire</label>
                  <CustomSelect
                    value={formData.cycleCode}
                    onChange={handleCycleChangeInModal}
                    options={[
                      { value: 'MATERNELLE', label: 'École Maternelle' },
                      { value: 'PRIMAIRE', label: 'Cycle Primaire' },
                      { value: 'SECONDAIRE_CTEB', label: 'Secondaire CTEB (7è/8è)' },
                      { value: 'HUMANITES', label: 'Humanités' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Section / Option</label>
                  <CustomSelect
                    value={formData.optionCode}
                    onChange={(v) => setFormData({ ...formData, optionCode: v })}
                    options={EPST_SECTIONS_OPTIONS.filter((o) => o.value !== 'ALL')}
                    disabled={formData.cycleCode === 'MATERNELLE' || formData.cycleCode === 'PRIMAIRE' || formData.cycleCode === 'SECONDAIRE_CTEB'}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Code Matière</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    placeholder="Ex: COMPTA-CG, STENO"
                  />
                </div>
              </div>

              {/* Si Maternelle : Sélection du Groupe Officiel */}
              {formData.cycleCode === 'MATERNELLE' && (
                <div className="p-3 rounded-xl border space-y-2 bg-pink-500/5 border-pink-500/20">
                  <label className="text-xs font-bold text-pink-700 dark:text-pink-300 block">
                    Groupe Officiel de Maternelle (Bulletin RDC)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['GROUPE_I', 'GROUPE_II', 'GROUPE_III', 'GROUPE_IV'] as GroupeActiviteMaternelle[]).map((grp) => {
                      const meta = GROUPE_MATERNELLE_LABELS[grp];
                      const isSel = formData.groupeMaternelle === grp;
                      return (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => handleGroupeMaternelleChange(grp)}
                          className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                            isSel
                              ? 'bg-pink-500/20 border-pink-500 text-pink-900 dark:text-pink-100 font-bold shadow-xs'
                              : 'bg-slate-500/5 border-slate-500/20 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <p className="font-extrabold">{grp.replace('_', ' ')}</p>
                          <p className="text-[10px] opacity-80">Trimestre : /{meta.maxTrimestre} pts · Annuel : /{meta.maxAnnuel} pts</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                  Intitulé du Cours ou de l'Activité
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-xs font-bold focus:outline-none focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Ex: Comptabilité Générale & Analytique"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Domaine / Catégorie</label>
                  <CustomSelect
                    value={formData.categorie}
                    onChange={(v) => setFormData({ ...formData, categorie: v })}
                    options={[
                      { value: 'LANGUES', label: 'Langues & Communication' },
                      { value: 'SCIENCES_EXACTES', label: 'Sciences Exactes' },
                      { value: 'SCIENCES_HUMAINES', label: 'Sciences Humaines' },
                      { value: 'TECHNIQUE_PROF', label: 'Technique & Professionnel' },
                      { value: 'PRATIQUE', label: 'Pratique & Atelier' },
                      { value: 'EVEIL_ART', label: 'Éveil, EPS & Arts' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Pondération / Coefficient</label>
                  <NumberInput
                    value={formData.coefficient}
                    onChange={(v) => setFormData({ ...formData, coefficient: v })}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Volume Horaire (h/sem)</label>
                  <NumberInput
                    value={formData.volumeHoraire}
                    onChange={(v) => setFormData({ ...formData, volumeHoraire: v })}
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>
              </div>

              {/* Barème des Maxima & Calcul Automatique */}
              <div className="p-3.5 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                    Barème des Maxima EPST (Calcul Automatisé)
                  </span>
                  <span className="text-[10px] text-slate-400">Examen = 2x Période</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">
                      {formData.cycleCode === 'MATERNELLE' ? 'Max Trimestre' : 'Max Période (P)'}
                    </label>
                    <NumberInput
                      value={formData.maxScore}
                      onChange={handleMaxScoreChange}
                      min={1}
                      max={100}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Max Examen (2x)</label>
                    <input
                      type="number"
                      readOnly
                      value={formData.maxExamen}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-black text-indigo-600 bg-slate-500/10 cursor-not-allowed"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Max Semestre (4x)</label>
                    <input
                      type="number"
                      readOnly
                      value={formData.maxSemestre}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-black text-purple-600 bg-slate-500/10 cursor-not-allowed"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Grand Total Annuel</label>
                    <input
                      type="number"
                      readOnly
                      value={formData.maxAnnuel}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-black text-emerald-600 bg-slate-500/10 cursor-not-allowed"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Professeur Titulaire Assigné */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                  Professeur Titulaire du Cours (Optionnel)
                </label>
                <CustomSelect
                  value={formData.enseignantId || 'NON_ASSIGNE'}
                  onChange={(v) => setFormData({ ...formData, enseignantId: v === 'NON_ASSIGNE' ? '' : v })}
                  options={teacherOptions.filter((t) => t.value !== 'ALL')}
                />
              </div>

              {/* Toggle Branche Majeure */}
              {formData.cycleCode === 'HUMANITES' && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer hover:bg-slate-500/5 transition-all" style={{ borderColor: 'var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={formData.isOptionMajora}
                    onChange={(e) => setFormData({ ...formData, isOptionMajora: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                  />
                  <div>
                    <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>
                      Branche Majeure / Spécifique de l'Option
                    </p>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      L'élève doit obligatoirement obtenir au moins 50% dans cette matière pour réussir l'année scolaire.
                    </p>
                  </div>
                </label>
              )}

              {/* Boutons Footer */}
              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-500/10 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Enregistrer la Matière</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
