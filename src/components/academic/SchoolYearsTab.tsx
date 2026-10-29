import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { NumberInput } from '../common/NumberInput';
import { RoomFormModal } from './RoomFormModal';
import { SchoolYearOnboardingWizard } from './SchoolYearOnboardingWizard';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { getOptionLabel } from '../../utils/options';
import { NATIONAL_EPST_OPTIONS } from '../../data/referentielEPST';
import {
  Calendar, Users, School, Sparkles, Edit3, Trash2, Plus,
  Download, ArrowUpRight, X, AlertTriangle, FileText, MoreVertical,
  Copy, Lock, LayoutGrid
} from 'lucide-react';
import { AnneeScolaireConfig, SalleConfig, ClasseScolaire, CycleConfig, OptionConfig } from '../../types';

interface SchoolYearsTabProps {
  activeSchoolYear?: string;
}

export const SchoolYearsTab: React.FC<SchoolYearsTabProps> = ({ activeSchoolYear }) => {
  const { config } = useSchoolConfig();
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  // Salles et classes du répertoire global
  const [allSalles, setAllSalles] = useState<SalleConfig[]>([]);
  const [yearClasses, setYearClasses] = useState<ClasseScolaire[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'cycles_salles' | 'migration' | 'rapports'>('cycles_salles');

  // Modals state
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<SalleConfig | null>(null);

  // Action Menu & Edit Year States
  const [openMenuYearId, setOpenMenuYearId] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<AnneeScolaireConfig | null>(null);
  const [showPdfPreviewYear, setShowPdfPreviewYear] = useState<AnneeScolaireConfig | null>(null);

  const [realStudentsCount, setRealStudentsCount] = useState<number>(0);

  // Cycles & Options inline editing
  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<CycleConfig | null>(null);
  const [cycleCode, setCycleCode] = useState<CycleConfig['code']>('MATERNELLE');
  const [cycleNom, setCycleNom] = useState('');

  const [optionFormOpen, setOptionFormOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<OptionConfig | null>(null);
  const [optionCode, setOptionCode] = useState('');
  const [optionNom, setOptionNom] = useState('');
  const [optionCycleCode, setOptionCycleCode] = useState<OptionConfig['cycleCode']>('SECONDAIRE_CTEB');

  const loadYearsFromDb = async () => {
    const data = await LocalDatabaseService.getSchoolYears();
    setYears(data as unknown as AnneeScolaireConfig[]);
    setSelectedYearId(prev => (data.some(y => y.id === prev) ? prev : (data[0]?.id || '')));
  };

  useEffect(() => { loadYearsFromDb(); }, []);

  useEffect(() => {
    const fetchStudentsCount = async () => {
      const allEleves = await LocalDatabaseService.getEleves();
      if (selectedYearId) {
        const count = allEleves.filter(e => e.schoolYearId === selectedYearId || (e as any).anneeScolaireId === selectedYearId || !e.schoolYearId).length;
        setRealStudentsCount(count);
      } else {
        setRealStudentsCount(allEleves.length);
      }
    };
    fetchStudentsCount();
  }, [selectedYearId]);

  useEffect(() => {
    const loadYearData = async () => {
      const [salles, classes] = await Promise.all([
        LocalDatabaseService.getSalles(),
        selectedYearId ? LocalDatabaseService.getClasses(selectedYearId).catch(() => [] as ClasseScolaire[]) : Promise.resolve([] as ClasseScolaire[]),
      ]);
      setAllSalles(salles || []);
      setYearClasses(classes || []);
    };
    loadYearData();
  }, [selectedYearId]);

  useEffect(() => {
    if (activeSchoolYear && years.length > 0) {
      const match = years.find(y => y.nom === activeSchoolYear || y.id === activeSchoolYear);
      if (match) {
        setSelectedYearId(match.id);
      }
    }
  }, [activeSchoolYear, years]);

  const selectedYear = useMemo(() => years.find(y => y.id === selectedYearId) || years[0], [years, selectedYearId]);

  // ── Fusion des salles physiques (année + répertoire global) ──
  const displaySalles = useMemo<SalleConfig[]>(() => {
    const yearSalles = selectedYear?.salles || [];
    const seen = new Map<string, SalleConfig>();
    [...yearSalles, ...allSalles].forEach(s => {
      const key = s.id || s.codeSalle;
      if (!seen.has(key) || !s.id) {
        const existing = seen.get(key);
        if (!existing || (s as any).updatedAt || !existing.statut) seen.set(key, s);
      }
    });
    return Array.from(seen.values());
  }, [selectedYear, allSalles]);

  // ── Fusion des options (année + classes de l'année + options de l'établissement) ──
  const displayOptions = useMemo<OptionConfig[]>(() => {
    const fromYear = selectedYear?.options || [];
    const fromClasses = yearClasses
      .map(cls => {
        const codes = Array.from(new Set([cls.optionCode, ...(cls.options || [])].filter(Boolean) as string[]));
        return codes.map(code => ({
          id: `cls-opt-${cls.id}-${code}`,
          code,
          nom: getOptionLabel(code),
          cycleCode: cls.cycleCode || cls.cycleId || 'HUMANITES',
        } as OptionConfig));
      })
      .flat();
    const fromSchool = (config?.selectedOptions || []).map(code => {
      const national = NATIONAL_EPST_OPTIONS.find(o => o.code === code);
      return {
        id: `sch-opt-${code}`,
        code,
        nom: national?.label || getOptionLabel(code),
        cycleCode: 'HUMANITES',
      } as OptionConfig;
    });
    const seen = new Map<string, OptionConfig>();
    [...fromYear, ...fromClasses, ...fromSchool].forEach(o => {
      if (!seen.has(o.code)) seen.set(o.code, o);
    });
    return Array.from(seen.values()).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [selectedYear, yearClasses, config?.selectedOptions]);

  const totalRoomCapacity = useMemo(() => displaySalles.reduce((acc, s) => acc + (s.capacite || 0), 0), [displaySalles]);

  const { paginated: paginatedYears, ...yearsPagination } = usePagination(years, { defaultPageSize: 6 });
  const { paginated: paginatedSalles, ...sallesPagination } = usePagination(displaySalles, { defaultPageSize: 6 });

  const handleSaveRoom = async (roomData: Partial<SalleConfig>) => {
    if (!selectedYear) return;
    const base = roomData as SalleConfig;

    if (editingRoom) {
      await LocalDatabaseService.updateSalle(editingRoom.id, { ...base, id: editingRoom.id });
      // Synchronise aussi le cache JSON de l'année
      const updatedYearSalles = (selectedYear.salles || []).map(s => (s.id === editingRoom.id ? { ...s, ...base, id: editingRoom.id } : s));
      await LocalDatabaseService.updateSchoolYear(selectedYear.id, { salles: updatedYearSalles });
    } else {
      const newRoom: SalleConfig = {
        ...base,
        id: `room_${Date.now()}`,
        codeSalle: base.codeSalle || `SAL-${(selectedYear.salles || []).length + 1}`,
        nomSalle: base.nomSalle || 'Nouvelle Salle Physique',
        capacite: base.capacite || 45,
        cycleCode: base.cycleCode || 'HUMANITES',
      };
      await LocalDatabaseService.addSalle(newRoom);
      // Synchronise le cache JSON de l'année
      await LocalDatabaseService.updateSchoolYear(selectedYear.id, { salles: [...(selectedYear.salles || []), newRoom] });
    }

    // Rafraîchit les listes
    const salles = await LocalDatabaseService.getSalles();
    setAllSalles(salles || []);
    await loadYearsFromDb();
    setShowRoomModal(false);
    setEditingRoom(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!selectedYear) return;
    await LocalDatabaseService.deleteSalle(roomId);
    // Synchronise aussi le cache JSON de l'année
    const updatedYearSalles = (selectedYear.salles || []).filter(s => s.id !== roomId);
    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { salles: updatedYearSalles });
    const salles = await LocalDatabaseService.getSalles();
    setAllSalles(salles || []);
    await loadYearsFromDb();
  };

  const resetCycleForm = () => {
    setCycleFormOpen(false);
    setEditingCycle(null);
    setCycleCode('MATERNELLE');
    setCycleNom('');
  };

  const openCycleForm = (c?: CycleConfig) => {
    if (c) {
      setEditingCycle(c);
      setCycleCode(c.code);
      setCycleNom(c.nom);
    } else {
      setEditingCycle(null);
      setCycleCode('MATERNELLE');
      setCycleNom('');
    }
    setCycleFormOpen(true);
  };

  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear || !cycleNom.trim()) return;
    const current = selectedYear.cycles || [];
    let updated: CycleConfig[];
    if (editingCycle) {
      updated = current.map(c => c.id === editingCycle.id ? { ...c, code: cycleCode, nom: cycleNom.trim() } : c);
    } else {
      updated = [...current, { id: `cycle_${Date.now()}`, code: cycleCode, nom: cycleNom.trim(), actif: true, classesCount: 0, sallesCount: 0 }];
    }
    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { cycles: updated });
    await loadYearsFromDb();
    resetCycleForm();
  };

  const handleDeleteCycle = async (id: string) => {
    if (!selectedYear) return;
    const updated = (selectedYear.cycles || []).filter(c => c.id !== id);
    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { cycles: updated });
    await loadYearsFromDb();
  };

  const resetOptionForm = () => {
    setOptionFormOpen(false);
    setEditingOption(null);
    setOptionCode('');
    setOptionNom('');
    setOptionCycleCode('SECONDAIRE_CTEB');
  };

  const openOptionForm = (o?: OptionConfig) => {
    if (o) {
      setEditingOption(o);
      setOptionCode(o.code);
      setOptionNom(o.nom);
      setOptionCycleCode(o.cycleCode);
    } else {
      setEditingOption(null);
      setOptionCode('');
      setOptionNom('');
      setOptionCycleCode('SECONDAIRE_CTEB');
    }
    setOptionFormOpen(true);
  };

  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear || !optionCode.trim() || !optionNom.trim()) return;
    const current = selectedYear.options || [];
    let updated: OptionConfig[];
    if (editingOption) {
      updated = current.map(o => o.id === editingOption.id ? { ...o, code: optionCode.trim(), nom: optionNom.trim(), cycleCode: optionCycleCode } : o);
    } else {
      updated = [...current, { id: `opt_${Date.now()}`, code: optionCode.trim(), nom: optionNom.trim(), cycleCode: optionCycleCode }];
    }
    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { options: updated });
    await loadYearsFromDb();
    resetOptionForm();
  };

  const handleDeleteOption = async (id: string) => {
    if (!selectedYear) return;
    const updated = (selectedYear.options || []).filter(o => o.id !== id);
    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { options: updated });
    await loadYearsFromDb();
  };

  const handleDeleteYear = async (id: string) => {
    await LocalDatabaseService.deleteSchoolYear(id);
    await loadYearsFromDb();
    setDeleteConfirmId(null);
  };

  const handleActivateYear = async (id: string) => {
    for (const y of years) {
      const targetStatut = y.id === id ? 'EN_COURS' : (y.statut === 'EN_COURS' ? 'CLOTUREE' : y.statut);
      await LocalDatabaseService.updateSchoolYear(y.id, { statut: targetStatut });
    }
    await loadYearsFromDb();
  };

  const handleOpenEditYearModal = (year: AnneeScolaireConfig) => {
    setEditingYear(year);
    setShowCreateModal(true);
    setOpenMenuYearId(null);
  };

  const handleDuplicateYear = async (year: AnneeScolaireConfig) => {
    setOpenMenuYearId(null);
    const duplicatedYear: AnneeScolaireConfig = {
      ...year,
      id: `sy_${Date.now()}`,
      nom: `${year.nom} (Copie)`,
      statut: 'PLANIFIEE',
    };
    await LocalDatabaseService.addSchoolYear(duplicatedYear);
    await loadYearsFromDb();
    setSelectedYearId(duplicatedYear.id);
  };

  const handleCloseYear = async (yearId: string) => {
    setOpenMenuYearId(null);
    await LocalDatabaseService.updateSchoolYear(yearId, { statut: 'CLOTUREE' });
    await loadYearsFromDb();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 select-none">
      {/* EN-TÊTE PRINCIPAL ET ACTIONS STRATÉGIQUES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm transition-all" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Gestion de l'Année Scolaire & Structuration EPST
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Pilotage des grilles tarifaires, attribution des locaux physiques et calendrier pédagogique officiel RDC.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer border border-indigo-400/30"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span>Onboarding : Nouvelle Année</span>
          </button>
        </div>
      </div>

      {/* SYNTHÈSE STRATÉGIQUE (KPIS DE L'ANNÉE SELECTIONNEE) */}
      {selectedYear && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 space-y-3 transition-all duration-300 ease-out hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Année Sélectionnée</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                selectedYear.statut === 'EN_COURS'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : selectedYear.statut === 'CLOTUREE'
                  ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}>
                {selectedYear.statut === 'EN_COURS' ? '● EN COURS' : selectedYear.statut}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Année {selectedYear.nom}</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{selectedYear.debut} — {selectedYear.fin}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: selectedYear.statut === 'EN_COURS' ? '68%' : selectedYear.statut === 'CLOTUREE' ? '100%' : '15%' }} />
            </div>
          </div>

          <div className="p-5 rounded-3xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 space-y-2 transition-all duration-300 ease-out hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Effectifs Inscrits</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{(realStudentsCount || 0).toLocaleString()} <span className="text-xs font-bold text-slate-500">élèves</span></p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-1">Inscriptions validées & dossiers complets</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 space-y-2 transition-all duration-300 ease-out hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cycles & Options EPST</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <LayoutGrid className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{(selectedYear?.cycles || []).length} <span className="text-xs font-bold text-slate-500">cycles</span></p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-1">{displayOptions.length} option(s) EPST associée(s) à l'année</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 space-y-2 transition-all duration-300 ease-out hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Locaux & Capacité D'Accueil</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <School className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{selectedYear.salles ? selectedYear.salles.length : 0} <span className="text-xs font-bold text-slate-500">salles</span></p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-1">Capacité maximale : {totalRoomCapacity || 0} places physiques</p>
            </div>
          </div>
        </div>
      )}

      {/* GALERIE DE SÉLECTION DES ANNÉES SCOLAIRES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Répertoire des Années Scolaires Enregistrées ({years.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paginatedYears.map(y => {
            const isCurrent = y.statut === 'EN_COURS';
            const isSelected = selectedYearId === y.id;
            return (
              <div
                key={y.id}
                onClick={() => setSelectedYearId(y.id)}
                className={`p-5 rounded-3xl border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/5 shadow-indigo-500/10'
                    : 'hover:border-indigo-500/40'
                }`}
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: isSelected ? '#6366f1' : 'var(--border)'
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        isSelected ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                      }`}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          Année {y.nom}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {y.debut} — {y.fin}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        isCurrent
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : y.statut === 'CLOTUREE'
                          ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}>
                        {isCurrent ? '● EN COURS' : y.statut}
                      </span>

                      {/* BOUTON OPTIONS DROPDOWN */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuYearId(openMenuYearId === y.id ? null : y.id)}
                          className="p-2 rounded-full border hover:bg-slate-500/15 transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}
                          title="Options et actions sur l'année"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* POPOVER DROPDOWN MENU */}
                        {openMenuYearId === y.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuYearId(null)} />
                            <div
                              className="absolute right-0 top-9 z-50 w-64 rounded-2xl border shadow-2xl animate-scale-in select-none overflow-hidden"
                              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            >
                              <div className="px-3 py-2.5 border-b" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions — Année {y.nom}</p>
                              </div>

                              <div className="p-2 space-y-0.5">
                                <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Gestion</p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditYearModal(y)}
                                  className="w-full px-2.5 py-2 text-left text-xs font-black rounded-xl hover:bg-indigo-500/10 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-all cursor-pointer"
                                >
                                  <span className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Edit3 className="w-3.5 h-3.5" /></span>
                                  <span>Modifier l'année</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateYear(y)}
                                  className="w-full px-2.5 py-2 text-left text-xs font-black rounded-xl hover:bg-indigo-500/10 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-all cursor-pointer"
                                >
                                  <span className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center"><Copy className="w-3.5 h-3.5" /></span>
                                  <span>Dupliquer la config</span>
                                </button>

                                <p className="px-2 py-1 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-t" style={{ borderColor: 'var(--border)' }}>Documents</p>
                                <button
                                  type="button"
                                  onClick={() => { setShowPdfPreviewYear(y); setOpenMenuYearId(null); }}
                                  className="w-full px-2.5 py-2 text-left text-xs font-black rounded-xl hover:bg-amber-500/10 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-all cursor-pointer"
                                >
                                  <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center"><FileText className="w-3.5 h-3.5" /></span>
                                  <span>PV EPST & Rapport (PDF)</span>
                                </button>

                                <p className="px-2 py-1 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-t" style={{ borderColor: 'var(--border)' }}>Cycle de vie</p>
                                {!isCurrent && y.statut !== 'CLOTUREE' && (
                                  <button
                                    type="button"
                                    onClick={() => { handleActivateYear(y.id); setOpenMenuYearId(null); }}
                                    className="w-full px-2.5 py-2 text-left text-xs font-black rounded-xl hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 transition-all cursor-pointer"
                                  >
                                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5" /></span>
                                    <span>Activer comme en cours</span>
                                  </button>
                                )}
                                {isCurrent && (
                                  <button
                                    type="button"
                                    onClick={() => handleCloseYear(y.id)}
                                    className="w-full px-2.5 py-2 text-left text-xs font-black rounded-xl hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center gap-3 transition-all cursor-pointer"
                                  >
                                    <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center"><Lock className="w-3.5 h-3.5" /></span>
                                    <span>Clôturer l'année</span>
                                  </button>
                                )}

                                <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                                  <button
                                    type="button"
                                    onClick={() => { setDeleteConfirmId(y.id); setOpenMenuYearId(null); }}
                                    className="w-full px-2.5 py-2 text-left text-xs font-black rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-3 transition-all cursor-pointer"
                                  >
                                    <span className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></span>
                                    <span>Supprimer l'année</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cycles actifs et options */}
                  <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex flex-wrap gap-1.5">
                      {(y.cycles || []).map(c => (
                        <span key={c.id} className="px-2 py-1 rounded-full text-[10px] font-black border bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                          {c.nom}
                        </span>
                      ))}
                      {(y.options || []).length > 0 && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-black border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          {(y.options || []).length} option(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Salles Physiques :</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{y.salles ? y.salles.length : 0} salles</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Découpage :</span>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{y.semestres ? y.semestres.length : 2} Semestres</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">👥 {(y.nombreElevesTotal || 0).toLocaleString()} élèves</span>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isCurrent && (
                      <button
                        onClick={() => handleActivateYear(y.id)}
                        className="px-4 py-1.5 rounded-full text-xs font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer"
                      >
                        Activer
                      </button>
                    )}

                    {!isCurrent && (
                      <button
                        onClick={() => setDeleteConfirmId(y.id)}
                        className="p-2 rounded-full text-rose-500 hover:bg-rose-500/15 transition-all cursor-pointer"
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

        {years.length > 0 && (
          <Pagination
            currentPage={yearsPagination.page}
            totalPages={yearsPagination.totalPages}
            total={yearsPagination.total}
            pageSize={yearsPagination.pageSize}
            start={yearsPagination.start}
            end={yearsPagination.end}
            onPageChange={yearsPagination.setPage}
            onPageSizeChange={yearsPagination.setPageSize}
          />
        )}
      </div>

      {/* DEEP CONFIGURATION WORKSPACE (5 SOUS-ONGLETS POUR L'ANNÉE SELECTIONNÉE) */}
      {selectedYear && (
        <div className="space-y-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Configuration & Infrastructure — Année {selectedYear.nom}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  {selectedYear.statut}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gérez la grille tarifaire des frais, la liste des salles d'études physiques, les dates des examens et le processus de migration.
              </p>
            </div>

            {/* Barre de navigation des sous-onglets */}
            <div className="flex items-center gap-1 p-1 rounded-xl border flex-wrap" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              {[
                { id: 'cycles_salles', label: 'Cycles, Options & Salles', icon: School },
                { id: 'migration', label: 'Clôture & Migration', icon: ArrowUpRight },
                { id: 'rapports', label: 'Documents & PV', icon: FileText },
              ].map(t => {
                const TIcon = t.icon;
                const isActive = activeDetailTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveDetailTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
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

          {/* TAB: CYCLES, OPTIONS & SALLES D'ÉTUDES PHYSIQUES */}
          {activeDetailTab === 'cycles_salles' && (
            <div className="space-y-5 animate-fade-in">
              {/* CYCLES SCOLAIRES */}
              <div className="p-5 rounded-3xl border shadow-sm space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Cycles Scolaires ({(selectedYear.cycles || []).length})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Maternelle, Primaire, Secondaire CTEB, Humanités</p>
                  </div>
                  <button
                    onClick={() => openCycleForm()}
                    className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-500/25"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter un Cycle
                  </button>
                </div>

                {cycleFormOpen && (
                  <form onSubmit={handleSaveCycle} className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Code du cycle</label>
                        <select
                          value={cycleCode}
                          onChange={e => setCycleCode(e.target.value as CycleConfig['code'])}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border text-xs bg-slate-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                          <option value="MATERNELLE">MATERNELLE</option>
                          <option value="PRIMAIRE">PRIMAIRE</option>
                          <option value="SECONDAIRE_CTEB">SECONDAIRE CTEB</option>
                          <option value="HUMANITES">HUMANITÉS</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Nom affiché</label>
                        <input
                          type="text"
                          value={cycleNom}
                          onChange={e => setCycleNom(e.target.value)}
                          placeholder="ex: Maternelle"
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border text-xs bg-slate-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="submit" className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all">
                        {editingCycle ? 'Mettre à jour' : 'Enregistrer'}
                      </button>
                      <button type="button" onClick={resetCycleForm} className="px-3 py-1.5 rounded-lg border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition-all" style={{ borderColor: 'var(--border)' }}>
                        Annuler
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(selectedYear.cycles || []).map(cyc => (
                    <div key={cyc.id} className="p-3.5 rounded-xl border space-y-2 relative group" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {cyc.code}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openCycleForm(cyc)} className="p-1 rounded-md text-slate-500 hover:bg-slate-500/15" title="Modifier"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteCycle(cyc.id)} className="p-1 rounded-md text-rose-500 hover:bg-rose-500/15" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{cyc.nom}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* OPTIONS D'ÉTUDES */}
              <div className="p-5 rounded-3xl border shadow-sm space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Options d'Études ({displayOptions.length})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Math-Physique, Biologie-Chimie, Tronc Commun, etc.</p>
                  </div>
                  <button
                    onClick={() => openOptionForm()}
                    className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-500/25"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une Option
                  </button>
                </div>

                {optionFormOpen && (
                  <form onSubmit={handleSaveOption} className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Code</label>
                        <input
                          type="text"
                          value={optionCode}
                          onChange={e => setOptionCode(e.target.value)}
                          placeholder="ex: MATH-PHYSIQUE"
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border text-xs bg-slate-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Nom</label>
                        <input
                          type="text"
                          value={optionNom}
                          onChange={e => setOptionNom(e.target.value)}
                          placeholder="ex: Mathématiques-Physique"
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border text-xs bg-slate-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Cycle</label>
                        <select
                          value={optionCycleCode}
                          onChange={e => setOptionCycleCode(e.target.value as OptionConfig['cycleCode'])}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg border text-xs bg-slate-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                          <option value="MATERNELLE">MATERNELLE</option>
                          <option value="PRIMAIRE">PRIMAIRE</option>
                          <option value="SECONDAIRE_CTEB">SECONDAIRE CTEB</option>
                          <option value="HUMANITES">HUMANITÉS</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="submit" className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all">
                        {editingOption ? 'Mettre à jour' : 'Enregistrer'}
                      </button>
                      <button type="button" onClick={resetOptionForm} className="px-3 py-1.5 rounded-lg border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition-all" style={{ borderColor: 'var(--border)' }}>
                        Annuler
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[10px] font-extrabold text-slate-500 dark:text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <th className="p-3">Option</th>
                        <th className="p-3">Code</th>
                        <th className="p-3">Cycle</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {displayOptions.length === 0 ? (
                        <tr><td colSpan={4} className="p-6 text-center text-slate-400 text-xs">Aucune option enregistrée pour cette année scolaire.</td></tr>
                      ) : (
                        displayOptions.map(opt => (
                          <tr key={opt.id} className="hover:bg-slate-500/5 transition-colors">
                            <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>{opt.nom}</td>
                            <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{opt.code}</td>
                            <td className="p-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">{opt.cycleCode}</span></td>
                            <td className="p-3 text-right">
                              {opt.id.startsWith('opt_') ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => openOptionForm(opt)} className="p-1 rounded-md text-slate-500 hover:bg-slate-500/15" title="Modifier"><Edit3 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteOption(opt.id)} className="p-1 rounded-md text-rose-500 hover:bg-rose-500/15" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">Détectée</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RÉPERTOIRE DES SALLES PHYSIQUES ATTRIBUÉES */}
              <div className="p-5 rounded-3xl border shadow-sm space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Salles Physiques d'Études ({displaySalles.length})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Capacités d'accueil et locaux attribués aux classes</p>
                  </div>

                  <button
                    onClick={() => { setEditingRoom(null); setShowRoomModal(true); }}
                    className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-500/25"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nouvelle Salle Physique
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginatedSalles.map(sal => (
                    <div key={sal.id} className="p-3.5 rounded-xl border space-y-2 relative group" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{sal.codeSalle}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                            {sal.cycleCode}
                          </span>
                          <button
                            onClick={() => handleDeleteRoom(sal.id)}
                            className="p-1 rounded-md text-rose-500 hover:bg-rose-500/15 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Supprimer la salle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{sal.nomSalle}</p>
                      <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                        <span>Capacité max:</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{sal.capacite} élèves</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedYear?.salles?.length > 0 && (
                  <Pagination
                    currentPage={sallesPagination.page}
                    totalPages={sallesPagination.totalPages}
                    total={sallesPagination.total}
                    pageSize={sallesPagination.pageSize}
                    start={sallesPagination.start}
                    end={sallesPagination.end}
                    onPageChange={sallesPagination.setPage}
                    onPageSizeChange={sallesPagination.setPageSize}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB: MIGRATION & CLÔTURE D'ANNÉE */}
          {activeDetailTab === 'migration' && (
            <div className="space-y-4 animate-fade-in p-5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Passage de Classe & Migration d'Année Scolaire</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-0.5">
                    Le processus de clôture permet de promouvoir automatiquement les élèves admis dans les classes supérieures de l'année scolaire suivante et d'archiver les dossiers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                <div className="p-4 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <span className="text-[10.5px] font-bold text-slate-500">1. Délibération & PV</span>
                  <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Validation des Bulletins</p>
                  <p className="text-[10.5px] text-slate-400">Générer les cotes finales et délibérer les mentions (Admis / Ajournés).</p>
                </div>

                <div className="p-4 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <span className="text-[10.5px] font-bold text-slate-500">2. Basculement des Promos</span>
                  <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Reconduction Automatique</p>
                  <p className="text-[10.5px] text-slate-400">Transfert des dossiers vers l'année scolaire planifiée suivante.</p>
                </div>

                <div className="p-4 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <span className="text-[10.5px] font-bold text-slate-500">3. Clôture Officielle</span>
                  <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">Archivage Sécurisé</p>
                  <p className="text-[10.5px] text-slate-400">Verrouillage des modifications de cotes de l'année clôturée.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS & PV EPST */}
          {activeDetailTab === 'rapports' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
              {[
                { title: 'PV Officiel d’Ouverture & Grille Tarifaire EPST', code: 'PV-EPST-2026-TARIF', desc: 'Décision du conseil d’administration fixant les frais d’inscription, connexion et carte élève.' },
                { title: 'Tableau des Capacités & Locaux Physiques', code: 'PV-EPST-2026-SALLES', desc: 'Rapport d’occupation des locaux d’études et quota maximal par classe.' },
                { title: 'Calendrier Scolaire & Découpage des Périodes', code: 'PV-EPST-2026-CALENDRIER', desc: 'Planning officiel des semestres, vacances et sessions d’examens.' },
                { title: 'Fiche Signalétique d’Immatriculation', code: 'PV-EPST-2026-IMMAT', desc: 'Formulaire homologué d’identification de l’établissement auprès de l’EPST.' },
              ].map((doc, idx) => (
                <div key={idx} className="p-4 rounded-xl border flex items-center justify-between transition-all hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{doc.title}</h4>
                    <span className="font-mono text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">{doc.code}</span>
                    <p className="text-[10.5px] mt-1 text-slate-500 dark:text-slate-400">{doc.desc}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-all">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ROOM FORM MODAL */}
      {showRoomModal && (
        <RoomFormModal
          isOpen={showRoomModal}
          onClose={() => { setShowRoomModal(false); setEditingRoom(null); }}
          onSave={handleSaveRoom}
          initialData={editingRoom}
        />
      )}

      {/* ONBOARDING WIZARD */}
      {showCreateModal && (
        <SchoolYearOnboardingWizard
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setEditingYear(null); }}
          existingYears={years}
          onCreated={() => { loadYearsFromDb(); setEditingYear(null); }}
          editingYear={editingYear}
        />
      )}
    </div>
  );
};
