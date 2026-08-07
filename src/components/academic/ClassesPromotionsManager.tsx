import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  School,
  Users,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Edit3,
  Trash2,
  Eye,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building,
  UserCheck,
  UserX,
  Sparkles,
  Printer,
  ChevronRight,
  Layers,
  GraduationCap,
  RefreshCw,
  X,
  ShieldCheck,
  Award,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { ClasseScolaire, SalleConfig, MembrePersonnel, AnneeScolaireConfig, Eleve } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { ClassFormModal } from './ClassFormModal';
import { RoomFormModal } from './RoomFormModal';

interface ClassesPromotionsManagerProps {
  onNavigateToStudents?: (classId?: string) => void;
}

const cycleOptions: SelectOption[] = [
  { value: 'ALL', label: 'Tous les Cycles Scolaires' },
  { value: 'MATERNELLE', label: 'Maternelle (Petite, Moyenne, Grande)' },
  { value: 'PRIMAIRE', label: 'Primaire (1ère à 6ème Éducation de Base)' },
  { value: 'SECONDAIRE_CTEB', label: 'CTEB (7ème & 8ème Terminal Base)' },
  { value: 'HUMANITES', label: 'Humanités (Math-Phys, Bio-Chim, Comm, Ped, etc.)' },
];

const optionFilterOptions: SelectOption[] = [
  { value: 'ALL', label: 'Toutes les Options & Sections' },
  { value: 'TRONC_COMMUN', label: 'Tronc Commun / Sans Option' },
  { value: 'Math-Physique', label: 'Math-Physique' },
  { value: 'Biologie-Chimie', label: 'Biologie-Chimie' },
  { value: 'Commerciale', label: 'Commerciale & Gestion' },
  { value: 'Pédagogie', label: 'Pédagogie Générale' },
  { value: 'Littéraire', label: 'Littéraire & Philosophie' },
  { value: 'Electricite', label: 'Électricité Technique' },
  { value: 'Mecanique', label: 'Mécanique Générale' },
];

export const ClassesPromotionsManager: React.FC<ClassesPromotionsManagerProps> = ({ onNavigateToStudents }) => {
  // State principal
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [salles, setSalles] = useState<SalleConfig[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [teachers, setTeachers] = useState<MembrePersonnel[]>([]);
  const [schoolYears, setSchoolYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres & Navigation
  const [activeTab, setActiveTab] = useState<'promotions' | 'cycles' | 'passage' | 'locaux'>('promotions');
  const [cycleFilter, setCycleFilter] = useState<string>('ALL');
  const [optionFilter, setOptionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modales & Sélection
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClasseScolaire | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<SalleConfig | null>(null);
  const [selectedClassDetail, setSelectedClassDetail] = useState<ClasseScolaire | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  // État du module de passage de promotion (réadmission/promotion des élèves)
  const [sourceClassId, setSourceClassId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);

  // Chargement des données
  const loadData = async () => {
    setLoading(true);
    try {
      const [cls, sal, elv, stf, yrs] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSalles(),
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getStaff(),
        LocalDatabaseService.getSchoolYears(),
      ]);
      setClasses(cls);
      setSalles(sal);
      setEleves(elv);
      setTeachers(stf);
      setSchoolYears(yrs);
    } catch (err) {
      console.error('[ClassesPromotionsManager] Erreur chargement :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calcul du nombre réel d'élèves par classe
  const studentCountByClass = useMemo(() => {
    const map: Record<string, number> = {};
    eleves.forEach(e => {
      if (e.classId) {
        map[e.classId] = (map[e.classId] || 0) + 1;
      } else if (e.nomClasse) {
        // Fallback par nom de classe
        const foundCls = classes.find(c => c.nom === e.nomClasse);
        if (foundCls) {
          map[foundCls.id] = (map[foundCls.id] || 0) + 1;
        }
      }
    });
    return map;
  }, [eleves, classes]);

  // Classes filtrées
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSearch = !searchQuery.trim() ||
        c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.salle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.professeurTitulaire.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.optionCode && c.optionCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCycle = cycleFilter === 'ALL' || c.cycleId === cycleFilter;
      const matchesOption = optionFilter === 'ALL' || (c.optionCode || 'TRONC_COMMUN') === optionFilter;

      return matchesSearch && matchesCycle && matchesOption;
    });
  }, [classes, searchQuery, cycleFilter, optionFilter]);

  // Salles filtrées
  const filteredSalles = useMemo(() => {
    return salles.filter(s => {
      const matchesSearch = !searchQuery.trim() ||
        s.nomSalle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.codeSalle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.batiment && s.batiment.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCycle = cycleFilter === 'ALL' || s.cycleCode === cycleFilter;
      return matchesSearch && matchesCycle;
    });
  }, [salles, searchQuery, cycleFilter]);

  // Statistiques globales
  const totalCapacity = useMemo(() => classes.reduce((sum, c) => sum + (c.capacite || 45), 0), [classes]);
  const totalEnrolled = useMemo(() => eleves.length, [eleves]);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;
  const unassignedTitulairesCount = useMemo(() => classes.filter(c => !c.professeurTitulaire || c.professeurTitulaire === 'Non Attribué').length, [classes]);

  // Handlers CRUD Classe
  const handleSaveClass = async (classData: Partial<ClasseScolaire>) => {
    if (editingClass?.id) {
      await LocalDatabaseService.updateClass(editingClass.id, classData);
    } else {
      await LocalDatabaseService.addClass({
        id: `cls_${Date.now()}`,
        nom: classData.nom || 'Nouvelle Classe',
        cycleId: classData.cycleId || 'HUMANITES',
        optionCode: classData.optionCode || 'TRONC_COMMUN',
        salle: classData.salle || 'Salle d\'étude',
        salleCode: classData.salleCode,
        professeurTitulaire: classData.professeurTitulaire || 'Non Attribué',
        capacite: classData.capacite || 45,
        nombreEleves: 0,
        schoolYearId: classData.schoolYearId,
      });
    }
    await loadData();
    setIsClassModalOpen(false);
    setEditingClass(null);
  };

  const handleDeleteClass = async (id: string) => {
    await LocalDatabaseService.deleteClass(id);
    await loadData();
    setDeleteClassId(null);
  };

  // Handlers CRUD Salle
  const handleSaveRoom = async (roomData: Partial<SalleConfig>) => {
    if (editingRoom?.id) {
      await LocalDatabaseService.updateSalle(editingRoom.id, roomData);
    } else {
      await LocalDatabaseService.addSalle({
        id: `sal_${Date.now()}`,
        codeSalle: roomData.codeSalle || `SALLE-${Date.now()}`,
        nomSalle: roomData.nomSalle || 'Nouvelle Salle',
        capacite: roomData.capacite || 45,
        cycleCode: roomData.cycleCode || 'HUMANITES',
        batiment: roomData.batiment || 'Bâtiment Principal',
        statut: roomData.statut || 'DISPONIBLE',
      });
    }
    await loadData();
    setIsRoomModalOpen(false);
    setEditingRoom(null);
  };

  const handleDeleteRoom = async (id: string) => {
    await LocalDatabaseService.deleteSalle(id);
    await loadData();
    setDeleteRoomId(null);
  };

  // Passage de promotion des élèves (Bulk Promote)
  const sourceClassStudents = useMemo(() => {
    if (!sourceClassId) return [];
    return eleves.filter(e => e.classId === sourceClassId || e.nomClasse === classes.find(c => c.id === sourceClassId)?.nom);
  }, [eleves, sourceClassId, classes]);

  const handleToggleSelectAllPromotion = () => {
    if (selectedStudentIds.length === sourceClassStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(sourceClassStudents.map(s => s.id));
    }
  };

  const handleToggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleExecutePromotion = async () => {
    if (!targetClassId || selectedStudentIds.length === 0) return;
    const destClass = classes.find(c => c.id === targetClassId);
    if (!destClass) return;

    setIsPromoting(true);
    try {
      for (const studentId of selectedStudentIds) {
        await LocalDatabaseService.updateEleve(studentId, {
          classId: destClass.id,
          nomClasse: destClass.nom,
        });
      }
      await loadData();
      setSelectedStudentIds([]);
      alert(`Félicitations ! ${selectedStudentIds.length} élève(s) ont été promus vers la classe "${destClass.nom}".`);
    } catch (err) {
      console.error('Erreur lors de la promotion des élèves :', err);
    } finally {
      setIsPromoting(false);
    }
  };

  // Helper Couleurs de Cycle
  const getCycleBadge = (cycleId: string) => {
    switch (cycleId) {
      case 'MATERNELLE':
        return { label: 'Maternelle', bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' };
      case 'PRIMAIRE':
        return { label: 'Primaire', bg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' };
      case 'SECONDAIRE_CTEB':
        return { label: 'CTEB (7e-8e)', bg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' };
      case 'HUMANITES':
        return { label: 'Humanités', bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      default:
        return { label: cycleId, bg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* ── EN-TÊTE PRINCIPAL & STATISTIQUES GLOBALES ── */}
      <div
        className="p-5 sm:p-6 rounded-2xl border shadow-xs transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
                <School className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Gestion des Classes, Cycles & Promotions
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Architecture académique EPST RDC · Affectation des titulaires & gestion des capacités de locaux
                </p>
              </div>
            </div>
          </div>

          {/* Boutons d'Action Haut de Page */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setEditingClass(null);
                setIsClassModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-500/40"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Créer une Promotion / Classe</span>
            </button>

            <button
              onClick={() => setActiveTab('passage')}
              className="px-3.5 py-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer hover:bg-slate-500/10"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <RefreshCw className="w-4 h-4 text-indigo-500" />
              <span>Passage de Promotion</span>
            </button>
          </div>
        </div>

        {/* BANDEAU DES KPI KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-5 mt-5 border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Card 1: Total Classes */}
          <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Classes</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{classes.length}</span>
              <BookOpen className="w-4 h-4 text-indigo-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Réparties sur 4 cycles</p>
          </div>

          {/* Card 2: Effectif Global */}
          <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Élèves Inscrits</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalEnrolled}</span>
              <Users className="w-4 h-4 text-emerald-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Capacité totale : {totalCapacity}</p>
          </div>

          {/* Card 3: Taux d'occupation */}
          <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Occupation Salles</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-sky-600 dark:text-sky-400">{occupancyRate}%</span>
              <Building className="w-4 h-4 text-sky-500/60" />
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full rounded-full transition-all ${occupancyRate > 90 ? 'bg-amber-500' : 'bg-sky-500'}`}
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
          </div>

          {/* Card 4: Titulaires en Attente */}
          <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Titulaires Désignés</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{classes.length - unassignedTitulairesCount} / {classes.length}</span>
              <UserCheck className="w-4 h-4 text-indigo-500/60" />
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              {unassignedTitulairesCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{unassignedTitulairesCount} sans titulaire</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% attribués</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── BARRE DE NAVIGATION INTERNE & FILTRES DE CYCLES ── */}
      <div
        className="p-3 rounded-2xl border shadow-xs space-y-3 transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sous-onglets de navigation */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border overflow-x-auto sidebar-scroll" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            {[
              { id: 'promotions', label: 'Classes & Promotions', icon: School },
              { id: 'cycles', label: 'Structure des Cycles & Options', icon: Layers },
              { id: 'passage', label: 'Passage de Promotion', icon: RefreshCw },
              { id: 'locaux', label: 'Salles Physiques', icon: Building },
            ].map(t => {
              const TIcon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <TIcon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sélecteurs de vue (Grille vs Table) si dans l'onglet promotions */}
          {activeTab === 'promotions' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mode d'affichage :</span>
              <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Affichage en Grille de Cartes"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Affichage en Tableau"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BARRE DE RECHERCHE ET SECTEURS DE FILTRES DROPDOWNS (CUSTOM SELECT) */}
        {(activeTab === 'promotions' || activeTab === 'locaux') && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            {/* Barre de Recherche */}
            <div className="sm:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher une classe, un titulaire, un local..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* CustomSelect Cycle */}
            <div className="sm:col-span-3">
              <CustomSelect
                options={cycleOptions}
                value={cycleFilter}
                onChange={val => setCycleFilter(val)}
                placeholder="Filtrer par Cycle"
              />
            </div>

            {/* CustomSelect Option / Section */}
            {activeTab === 'promotions' && (
              <div className="sm:col-span-3">
                <CustomSelect
                  options={optionFilterOptions}
                  value={optionFilter}
                  onChange={val => setOptionFilter(val)}
                  placeholder="Filtrer par Option"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CONTENU DE L'ONGLET 1 : CLASSES & PROMOTIONS ── */}
      {activeTab === 'promotions' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Chargement des structures de classes en cours...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Aucune classe ne correspond à vos filtres</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Modifiez les termes de votre recherche ou ajoutez une nouvelle promotion dans l'année scolaire active.
              </p>
              <button
                onClick={() => {
                  setEditingClass(null);
                  setIsClassModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Créer une Classe
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* AFFICHAGE GRILLE DE CARTES HIGH-END */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map(c => {
                const badge = getCycleBadge(c.cycleId);
                const countEnrolled = studentCountByClass[c.id] || c.nombreEleves || 0;
                const capacity = c.capacite || 45;
                const ratio = Math.round((countEnrolled / capacity) * 100);

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl border shadow-xs space-y-4 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="space-y-3">
                      {/* Badge Cycle & Options */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {c.optionCode && c.optionCode !== 'TRONC_COMMUN' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                            {c.optionCode}
                          </span>
                        )}
                      </div>

                      {/* Intitulé & Prof Titulaire */}
                      <div>
                        <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          {c.nom}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {c.professeurTitulaire || 'Non Attribué'}
                          </span>
                        </div>
                      </div>

                      {/* Local & Capacité */}
                      <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>Local : <strong style={{ color: 'var(--text-primary)' }}>{c.salle}</strong></span>
                          </div>
                          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                            {countEnrolled} / {capacity}
                          </span>
                        </div>

                        {/* Jauge d'occupation */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${ratio >= 100 ? 'bg-rose-500' : ratio >= 85 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                            style={{ width: `${Math.min(100, ratio)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions de Carte */}
                    <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
                      <button
                        onClick={() => setSelectedClassDetail(c)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Voir Élèves ({countEnrolled})</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingClass(c);
                            setIsClassModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition-colors cursor-pointer"
                          title="Modifier la classe"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteClassId(c.id)}
                          className="p-1.5 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Supprimer la classe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* AFFICHAGE TABLEAU DE CLASSES */
            <div className="rounded-2xl border shadow-xs overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b uppercase tracking-wider text-[10px] font-bold text-slate-500 dark:text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <th className="p-3.5">Classe / Promotion</th>
                      <th className="p-3.5">Cycle Scolaire</th>
                      <th className="p-3.5">Option / Section</th>
                      <th className="p-3.5">Local Physique</th>
                      <th className="p-3.5">Professeur Titulaire</th>
                      <th className="p-3.5">Effectif / Capacité</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {filteredClasses.map(c => {
                      const badge = getCycleBadge(c.cycleId);
                      const countEnrolled = studentCountByClass[c.id] || c.nombreEleves || 0;

                      return (
                        <tr key={c.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="p-3.5 font-bold" style={{ color: 'var(--text-primary)' }}>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span>{c.nom}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-slate-600 dark:text-slate-400">
                            {c.optionCode || 'TRONC_COMMUN'}
                          </td>
                          <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                            {c.salle}
                          </td>
                          <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                            {c.professeurTitulaire || 'Non Attribué'}
                          </td>
                          <td className="p-3.5 font-bold">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                              {countEnrolled} / {c.capacite || 45} élèves
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedClassDetail(c)}
                                className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Édélves
                              </button>
                              <button
                                onClick={() => {
                                  setEditingClass(c);
                                  setIsClassModalOpen(true);
                                }}
                                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteClassId(c.id)}
                                className="p-1 rounded-md border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONTENU DE L'ONGLET 2 : STRUCTURE DES CYCLES & OPTIONS EPST ── */}
      {activeTab === 'cycles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cycle Maternelle */}
            <div className="p-5 rounded-2xl border shadow-xs space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  Cycle Maternelle
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ge : 3 à 5 ans</span>
              </div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Éveil & Socialisation Maternelle</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Subdivisé en 3 niveaux : Petite Section (PS), Moyenne Section (MS) et Grande Section (GS). Axé sur le développement psychomoteur et la préparation au Primaire.
              </p>
              <div className="pt-3 border-t flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300" style={{ borderColor: 'var(--border)' }}>
                <span>Classes actives : 3 promotions</span>
                <span className="text-indigo-600 dark:text-indigo-400">Option : Tronc Commun</span>
              </div>
            </div>

            {/* Cycle Primaire */}
            <div className="p-5 rounded-2xl border shadow-xs space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                  Cycle Primaire
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">1ère à 6ème Année</span>
              </div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Éducation de Base Primaire</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Niveaux 1 à 6 sanctionnés par le Certificat d'Études Primaires (TENAFEP/ENAFEP). Apprentissage fondamental de la lecture, écriture et calcul.
              </p>
              <div className="pt-3 border-t flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300" style={{ borderColor: 'var(--border)' }}>
                <span>Classes actives : 6 promotions</span>
                <span className="text-indigo-600 dark:text-indigo-400">Option : Tronc Commun</span>
              </div>
            </div>

            {/* Cycle Terminal d'Éducation de Base (CTEB) */}
            <div className="p-5 rounded-2xl border shadow-xs space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  Cycle CTEB (7e & 8e)
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Nouveaux Réf. EPST</span>
              </div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Cycle Terminal d'Éducation de Base</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                7ème et 8ème Année CTEB (anciennes 1ère et 2ème Secondaire). Tronc commun obligatoire avant l'orientation vers les Humanités Générales ou Techniques.
              </p>
              <div className="pt-3 border-t flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300" style={{ borderColor: 'var(--border)' }}>
                <span>Classes actives : 2 promotions</span>
                <span className="text-indigo-600 dark:text-indigo-400">Examen d'Orientation 8ème</span>
              </div>
            </div>

            {/* Cycle Humanités Générales & Techniques */}
            <div className="p-5 rounded-2xl border shadow-xs space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Cycle Humanités (1e-4e H)
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Finalistes EXETAT</span>
              </div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Humanités Générales & Techniques</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                1ère H à 4ème H (3e à 6e Secondaire). Filières spécialisées : Math-Physique, Biologie-Chimie, Commerciale & Gestion, Pédagogie, Technique.
              </p>
              <div className="pt-3 border-t flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300" style={{ borderColor: 'var(--border)' }}>
                <span>Options autorisées : 8 filières</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Diplôme d'État RDC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENU DE L'ONGLET 3 : PASSAGE DE PROMOTION (BULK PROMOTE) ── */}
      {activeTab === 'passage' && (
        <div className="p-6 rounded-2xl border shadow-xs space-y-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Passage de Promotion & Mutation des Élèves
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sélectionnez une classe d'origine et promouvez collectivement les élèves admis vers leur classe supérieure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Classe Source */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                1. Classe d'Origine (Actuelle)
              </label>
              <CustomSelect
                options={classes.map(c => ({ value: c.id, label: `${c.nom} (${studentCountByClass[c.id] || 0} élèves)` }))}
                value={sourceClassId}
                onChange={val => {
                  setSourceClassId(val);
                  setSelectedStudentIds([]);
                }}
                placeholder="Sélectionner la classe source"
              />
            </div>

            {/* Classe Destination */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                2. Classe de Destination (Promotion Cible)
              </label>
              <CustomSelect
                options={classes.filter(c => c.id !== sourceClassId).map(c => ({ value: c.id, label: `${c.nom} (${c.salle})` }))}
                value={targetClassId}
                onChange={val => setTargetClassId(val)}
                placeholder="Sélectionner la classe cible"
              />
            </div>
          </div>

          {/* Liste des Élèves à Promouvoir */}
          {sourceClassId ? (
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Liste des élèves de la promotion ({sourceClassStudents.length} élèves inscrits)
                </span>
                <button
                  onClick={handleToggleSelectAllPromotion}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {selectedStudentIds.length === sourceClassStudents.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border divide-y" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                {sourceClassStudents.length === 0 ? (
                  <p className="p-4 text-xs text-center text-slate-400">Aucun élève inscrit dans cette classe d'origine.</p>
                ) : (
                  sourceClassStudents.map(s => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleStudentSelection(s.id)}
                        className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-500/10' : 'hover:bg-slate-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{s.prenom} {s.nom} {s.postnom}</span>
                          <span className="font-mono text-[10.5px] text-slate-400">Mat: {s.registrationNumber}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                          {s.statut}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  disabled={!targetClassId || selectedStudentIds.length === 0 || isPromoting}
                  onClick={handleExecutePromotion}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isPromoting ? 'animate-spin' : ''}`} />
                  <span>{isPromoting ? 'Promotion en cours...' : `Promouvoir ${selectedStudentIds.length} Élèves Sélectionné(s)`}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              Veuillez d'abord choisir une classe d'origine ci-dessus pour afficher l'effectif à promouvoir.
            </p>
          )}
        </div>
      )}

      {/* ── CONTENU DE L'ONGLET 4 : SALLES PHYSIQUES ── */}
      {activeTab === 'locaux' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                Salles & Locaux Physiques ({salles.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inventaire du patrimoine immobilier et affectation des capacités d'accueil.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingRoom(null);
                setIsRoomModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ajouter une Salle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSalles.map(s => (
              <div
                key={s.id}
                className="p-4 rounded-2xl border shadow-xs space-y-3"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    {s.codeSalle}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.statut === 'DISPONIBLE' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'}`}>
                    {s.statut}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{s.nomSalle}</h4>
                  <p className="text-xs text-slate-400 font-medium">{s.batiment || 'Bâtiment Principal'}</p>
                </div>

                <div className="pt-2 border-t flex justify-between text-xs font-bold" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-slate-500 dark:text-slate-400">Capacité :</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{s.capacite} places assises</span>
                </div>

                <div className="pt-2 flex justify-end gap-1">
                  <button
                    onClick={() => {
                      setEditingRoom(s);
                      setIsRoomModalOpen(true);
                    }}
                    className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteRoomId(s.id)}
                    className="p-1 rounded-md border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALE DÉTAIL CLASSE : LISTE ÉLÈVES INSCRITS DANS LA PROMOTION ── */}
      {selectedClassDetail && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none"
          onClick={() => setSelectedClassDetail(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border shadow-xs overflow-hidden flex flex-col max-h-[85vh] transition-all"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="p-5 border-b flex items-center justify-between gap-3 shrink-0"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Rôle de la Classe : {selectedClassDetail.nom}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Titulaire : {selectedClassDetail.professeurTitulaire} · Local : {selectedClassDetail.salle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClassDetail(null)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student Roster Table */}
            <div className="p-5 overflow-y-auto flex-1 sidebar-scroll space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Total : {eleves.filter(e => e.classId === selectedClassDetail.id || e.nomClasse === selectedClassDetail.nom).length} Élèves Inscrits
                </span>
                <button
                  onClick={() => alert(`Impression du rôle d'appel pour la classe ${selectedClassDetail.nom}...`)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer Liste de Présence</span>
                </button>
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b uppercase text-[10px] font-bold text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <th className="p-3">Matricule</th>
                      <th className="p-3">Nom & Prénom de l'Élève</th>
                      <th className="p-3">Sexe</th>
                      <th className="p-3">Date Naissance</th>
                      <th className="p-3">Parent / Contact</th>
                      <th className="p-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {eleves.filter(e => e.classId === selectedClassDetail.id || e.nomClasse === selectedClassDetail.nom).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
                          Aucun élève inscrit actuellement dans cette classe.
                        </td>
                      </tr>
                    ) : (
                      eleves.filter(e => e.classId === selectedClassDetail.id || e.nomClasse === selectedClassDetail.nom).map(s => (
                        <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="p-3 font-mono font-bold text-indigo-500">{s.registrationNumber}</td>
                          <td className="p-3 font-extrabold" style={{ color: 'var(--text-primary)' }}>
                            {s.prenom} {s.nom} {s.postnom}
                          </td>
                          <td className="p-3 font-bold">{s.sexe === 'M' ? 'M' : 'F'}</td>
                          <td className="p-3 font-medium text-slate-400">{s.dateNaissance}</td>
                          <td className="p-3 font-medium text-slate-400">{s.telephoneParent || s.nomParent}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                              {s.statut}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODALE NOUVELLE CLASSE / MODIFICATION DE CLASSE ── */}
      <ClassFormModal
        isOpen={isClassModalOpen}
        onClose={() => {
          setIsClassModalOpen(false);
          setEditingClass(null);
        }}
        onSave={handleSaveClass}
        initialData={editingClass}
        salles={salles}
        teachers={teachers}
        schoolYears={schoolYears}
      />

      {/* ── MODALE SALLE PHYSIQUE ── */}
      <RoomFormModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
          setEditingRoom(null);
        }}
        onSave={handleSaveRoom}
        initialData={editingRoom}
      />

      {/* ── CONFIRMATION SUPPRESSION CLASSE ── */}
      {deleteClassId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setDeleteClassId(null)}>
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 text-center"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Supprimer cette classe ?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Êtes-vous sûr de vouloir supprimer cette classe ? Cette action supprimera sa référence académique.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteClassId(null)}
                className="px-4 py-2 rounded-lg border font-bold text-xs hover:bg-slate-500/20 cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteClass(deleteClassId)}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── CONFIRMATION SUPPRESSION SALLE ── */}
      {deleteRoomId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setDeleteRoomId(null)}>
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 text-center"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Supprimer ce local / salle ?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Êtes-vous sûr de vouloir supprimer cette salle d'étude du registre ?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteRoomId(null)}
                className="px-4 py-2 rounded-lg border font-bold text-xs hover:bg-slate-500/20 cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteRoom(deleteRoomId)}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
