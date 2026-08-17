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
import {
  Calendar, Users, School, CreditCard, Sparkles, Edit3, Trash2, Plus,
  Search, Download, ArrowUpRight, X, AlertTriangle, FileText, MoreVertical,
  Copy, Lock, CheckCircle2, Printer, Eye, FileCheck
} from 'lucide-react';
import { AnneeScolaireConfig, FraisAnnexeConfig, SalleConfig, CycleConfig } from '../../types';

interface SchoolYearsTabProps {
  activeSchoolYear?: string;
}

export const SchoolYearsTab: React.FC<SchoolYearsTabProps> = ({ activeSchoolYear }) => {
  const { format } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'frais' | 'cycles_salles' | 'periodes' | 'migration' | 'rapports'>('frais');

  // Modals state
  const [showBaseFeesModal, setShowBaseFeesModal] = useState<boolean>(false);
  const [showAnnexFeeModal, setShowAnnexFeeModal] = useState<boolean>(false);
  const [editingAnnexFee, setEditingAnnexFee] = useState<FraisAnnexeConfig | null>(null);
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<SalleConfig | null>(null);

  // Action Menu & Edit Year States
  const [openMenuYearId, setOpenMenuYearId] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<AnneeScolaireConfig | null>(null);
  const [showPdfPreviewYear, setShowPdfPreviewYear] = useState<AnneeScolaireConfig | null>(null);

  // Filters & Search for Annex Fees
  const [fraisFilter, setFraisFilter] = useState<'ALL' | 'OBLIGATOIRE' | 'OPTIONNEL'>('ALL');
  const [fraisSearch, setFraisSearch] = useState<string>('');

  // Form states for Base Fees
  const [baseInscription, setBaseInscription] = useState<number>(0);
  const [baseConnexion, setBaseConnexion] = useState<number>(0);
  const [baseReinscription, setBaseReinscription] = useState<number>(0);
  const [baseCarte, setBaseCarte] = useState<number>(0);

  const [realStudentsCount, setRealStudentsCount] = useState<number>(0);

  // Form states for Annex Fee Modal
  const [annexIntitule, setAnnexIntitule] = useState<string>('');
  const [annexMontant, setAnnexMontant] = useState<number>(20);
  const [annexDevise, setAnnexDevise] = useState<string>('USD');
  const [annexObligatoire, setAnnexObligatoire] = useState<boolean>(true);
  const [annexTypeFrais, setAnnexTypeFrais] = useState<FraisAnnexeConfig['typeFrais']>('KIT');


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
    if (activeSchoolYear && years.length > 0) {
      const match = years.find(y => y.nom === activeSchoolYear || y.id === activeSchoolYear);
      if (match) {
        setSelectedYearId(match.id);
      }
    }
  }, [activeSchoolYear, years]);

  const selectedYear = useMemo(() => years.find(y => y.id === selectedYearId) || years[0], [years, selectedYearId]);

  useEffect(() => {
    if (selectedYear) {
      setBaseInscription(selectedYear.fraisInscription ?? 0);
      setBaseConnexion(selectedYear.fraisConnexion ?? 0);
      setBaseReinscription(selectedYear.fraisReinscription ?? 0);
      setBaseCarte(selectedYear.fraisCarte ?? 0);
    }
  }, [selectedYear]);

  const filteredFraisAnnexes = useMemo(() => {
    if (!selectedYear?.fraisAnnexes) return [];
    return selectedYear.fraisAnnexes.filter(fa => {
      const matchFilter = fraisFilter === 'ALL' || (fraisFilter === 'OBLIGATOIRE' ? fa.obligatoire : !fa.obligatoire);
      const matchSearch = !fraisSearch || fa.intitule.toLowerCase().includes(fraisSearch.toLowerCase()) || fa.typeFrais.toLowerCase().includes(fraisSearch.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [selectedYear, fraisFilter, fraisSearch]);

  const { paginated: paginatedYears, ...yearsPagination } = usePagination(years, { defaultPageSize: 6 });
  const { paginated: paginatedFraisAnnexes, ...fraisAnnexesPagination } = usePagination(filteredFraisAnnexes, { defaultPageSize: 6 });
  const { paginated: paginatedSalles, ...sallesPagination } = usePagination((selectedYear?.salles || []), { defaultPageSize: 6 });
  const { paginated: paginatedPeriodes, ...periodesPagination } = usePagination((selectedYear?.periodes || []), { defaultPageSize: 6 });

  const handleSaveBaseFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear) return;
    await LocalDatabaseService.updateSchoolYear(selectedYear.id, {
      fraisInscription: Number(baseInscription),
      fraisConnexion: Number(baseConnexion),
      fraisReinscription: Number(baseReinscription),
      fraisCarte: Number(baseCarte),
    });
    await loadYearsFromDb();
    setShowBaseFeesModal(false);
  };

  const handleOpenAnnexModal = (fa?: FraisAnnexeConfig) => {
    if (fa) {
      setEditingAnnexFee(fa);
      setAnnexIntitule(fa.intitule);
      setAnnexMontant(fa.montant);
      setAnnexDevise((fa.devise as 'USD' | 'CDF') || 'USD');
      setAnnexObligatoire(fa.obligatoire);
      setAnnexTypeFrais(fa.typeFrais);
    } else {
      setEditingAnnexFee(null);
      setAnnexIntitule('');
      setAnnexMontant(20);
      setAnnexDevise('USD');
      setAnnexObligatoire(true);
      setAnnexTypeFrais('KIT');
    }
    setShowAnnexFeeModal(true);
  };

  const handleSaveAnnexFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear || !annexIntitule.trim()) return;

    const currentList = selectedYear.fraisAnnexes || [];
    let updatedList: FraisAnnexeConfig[];

    if (editingAnnexFee) {
      updatedList = currentList.map(item =>
        item.id === editingAnnexFee.id
          ? {
              ...item,
              intitule: annexIntitule.trim(),
              montant: Number(annexMontant),
              devise: annexDevise as string,
              obligatoire: annexObligatoire,
              typeFrais: annexTypeFrais,
            }
          : item
      );
    } else {
      const newFee: FraisAnnexeConfig = {
        id: `fa_${Date.now()}`,
        intitule: annexIntitule.trim(),
        montant: Number(annexMontant),
        devise: annexDevise as string,
        obligatoire: annexObligatoire,
        typeFrais: annexTypeFrais,
      };
      updatedList = [...currentList, newFee];
    }

    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { fraisAnnexes: updatedList });
    await loadYearsFromDb();
    setShowAnnexFeeModal(false);
  };

  const handleDeleteAnnexFee = async (id: string) => {
    if (!selectedYear) return;
    const updatedList = (selectedYear.fraisAnnexes || []).filter(fa => fa.id !== id);
    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { fraisAnnexes: updatedList });
    await loadYearsFromDb();
  };

  const handleSaveRoom = async (roomData: Partial<SalleConfig>) => {
    if (!selectedYear) return;
    const currentSalles = selectedYear.salles || [];
    let updatedSalles: SalleConfig[];

    if (editingRoom) {
      updatedSalles = currentSalles.map(s => (s.id === editingRoom.id ? { ...s, ...roomData } as SalleConfig : s));
    } else {
      const newRoom: SalleConfig = {
        id: `room_${Date.now()}`,
        codeSalle: roomData.codeSalle || `SAL-${currentSalles.length + 1}`,
        nomSalle: roomData.nomSalle || 'Nouvelle Salle Physique',
        capacite: roomData.capacite || 45,
        cycleCode: roomData.cycleCode || 'HUMANITES',
      };
      updatedSalles = [...currentSalles, newRoom];
    }

    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { salles: updatedSalles });
    await loadYearsFromDb();
    setShowRoomModal(false);
    setEditingRoom(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!selectedYear) return;
    const updatedSalles = (selectedYear.salles || []).filter(s => s.id !== roomId);
    await LocalDatabaseService.updateSchoolYear(selectedYear.id, { salles: updatedSalles });
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

  const totalRoomCapacity = useMemo(() => {
    if (!selectedYear?.salles) return 0;
    return selectedYear.salles.reduce((acc, s) => acc + (s.capacite || 0), 0);
  }, [selectedYear]);

  return (
    <div className="space-y-6 animate-fade-in pb-10 select-none">
      {/* EN-TÊTE PRINCIPAL ET ACTIONS STRATÉGIQUES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-xs transition-all" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
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
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-400/30"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Onboarding : Nouvelle Année</span>
          </button>
        </div>
      </div>

      {/* SYNTHÈSE STRATÉGIQUE (KPIS DE L'ANNÉE SELECTIONNEE) */}
      {selectedYear && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border shadow-xs hover:shadow-md hover:-translate-y-0.5 space-y-3 transition-all duration-300 ease-out hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
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

          <div className="p-4 rounded-2xl border shadow-xs hover:shadow-md hover:-translate-y-0.5 space-y-2 transition-all duration-300 ease-out hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
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

          <div className="p-4 rounded-2xl border shadow-xs hover:shadow-md hover:-translate-y-0.5 space-y-2 transition-all duration-300 ease-out hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Frais Majeurs Initialisation</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${(selectedYear?.fraisInscription || 0) + (selectedYear?.fraisConnexion || 0)} <span className="text-xs font-bold text-slate-500">total</span></p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-1">Inscription (${selectedYear?.fraisInscription || 0}) + Connexion (${selectedYear?.fraisConnexion || 0})</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border shadow-xs hover:shadow-md hover:-translate-y-0.5 space-y-2 transition-all duration-300 ease-out hover:border-indigo-500/40" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Locaux & Capacité D'Accueil</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <School className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{selectedYear.salles ? selectedYear.salles.length : 0} <span className="text-xs font-bold text-slate-500">salles</span></p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-1">Capacité maximale : {totalRoomCapacity || 180} places physiques</p>
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
                className={`p-5 rounded-2xl border shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer relative overflow-hidden group ${
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
                          className="p-1.5 rounded-lg border hover:bg-slate-500/15 transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
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
                              className="absolute right-0 top-8 z-50 w-56 p-1.5 rounded-xl border shadow-xl animate-scale-in select-none"
                              style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEditYearModal(y)}
                                className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4 text-indigo-500" />
                                <span>Modifier l'Année</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicateYear(y)}
                                className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <Copy className="w-4 h-4 text-indigo-400" />
                                <span>Dupliquer la Config</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => { setShowPdfPreviewYear(y); setOpenMenuYearId(null); }}
                                className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <FileText className="w-4 h-4 text-amber-500" />
                                <span>PV EPST & Rapport (PDF)</span>
                              </button>

                              {!isCurrent && y.statut !== 'CLOTUREE' && (
                                <button
                                  type="button"
                                  onClick={() => { handleActivateYear(y.id); setOpenMenuYearId(null); }}
                                  className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Sparkles className="w-4 h-4 text-emerald-500" />
                                  <span>Activer comme En Cours</span>
                                </button>
                              )}

                              {isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleCloseYear(y.id)}
                                  className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Lock className="w-4 h-4 text-amber-500" />
                                  <span>Clôturer l'Année</span>
                                </button>
                              )}

                              <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />

                              <button
                                type="button"
                                onClick={() => { setDeleteConfirmId(y.id); setOpenMenuYearId(null); }}
                                className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                                <span>Supprimer l'Année</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Synthèse des 3 Frais Majeurs */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center text-[10.5px]" style={{ borderColor: 'var(--border)' }}>
                    <div className="p-2 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Inscription</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400">${y.fraisInscription}</span>
                    </div>
                    <div className="p-2 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Connexion</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">${y.fraisConnexion}</span>
                    </div>
                    <div className="p-2 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Carte/Badge</span>
                      <span className="font-black text-amber-600 dark:text-amber-400">${y.fraisCarte || 10}</span>
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
                        className="px-3 py-1 rounded-lg text-[11px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer"
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

            {/* Barre de navigation des 5 sous-onglets */}
            <div className="flex items-center gap-1 p-1 rounded-xl border flex-wrap" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              {[
                { id: 'frais', label: 'Tarification & Frais', icon: CreditCard },
                { id: 'cycles_salles', label: 'Cycles & Salles', icon: School },
                { id: 'periodes', label: 'Périodes & Examens', icon: Calendar },
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

          {/* TAB 1: TARIFICATION & FRAIS SCOLAIRES */}
          {activeDetailTab === 'frais' && (
            <div className="space-y-5 animate-fade-in">


              {/* TABLEAU DES FRAIS ANNEXES & OPTIONNELS */}
              <div className="p-5 rounded-2xl border shadow-xs space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Frais Annexes & Optionnels Approuvés ({selectedYear.fraisAnnexes ? selectedYear.fraisAnnexes.length : 0})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Minervaux, kits scolaires, frais d'examens et transports</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={fraisSearch}
                        onChange={e => setFraisSearch(e.target.value)}
                        placeholder="Rechercher un frais..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border text-xs bg-slate-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <button
                      onClick={() => handleOpenAnnexModal()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nouveau Frais
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[10px] font-extrabold text-slate-500 dark:text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <th className="p-3">Intitulé du Frais</th>
                        <th className="p-3">Catégorie / Type</th>
                        <th className="p-3">Montant Fixé</th>
                        <th className="p-3">Statut Obligation</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {paginatedFraisAnnexes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                            Aucun frais annexe enregistré pour cette année scolaire.
                          </td>
                        </tr>
                      ) : (
                        paginatedFraisAnnexes.map(fa => (
                          <tr key={fa.id} className="hover:bg-slate-500/5 transition-colors">
                            <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>{fa.intitule}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                                {fa.typeFrais}
                              </span>
                            </td>
                            <td className="p-3 font-black text-indigo-600 dark:text-indigo-400">{fmt(fa.montant, fa.devise)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border ${
                                fa.obligatoire
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25'
                              }`}>
                                {fa.obligatoire ? 'OBLIGATOIRE' : 'OPTIONNEL'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenAnnexModal(fa)}
                                  className="p-1 rounded-md text-slate-500 hover:bg-slate-500/15 transition-all cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAnnexFee(fa.id)}
                                  className="p-1 rounded-md text-rose-500 hover:bg-rose-500/15 transition-all cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredFraisAnnexes.length > 0 && (
                  <Pagination
                    currentPage={fraisAnnexesPagination.page}
                    totalPages={fraisAnnexesPagination.totalPages}
                    total={fraisAnnexesPagination.total}
                    pageSize={fraisAnnexesPagination.pageSize}
                    start={fraisAnnexesPagination.start}
                    end={fraisAnnexesPagination.end}
                    onPageChange={fraisAnnexesPagination.setPage}
                    onPageSizeChange={fraisAnnexesPagination.setPageSize}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CYCLES & SALLES D'ÉTUDES PHYSIQUES */}
          {activeDetailTab === 'cycles_salles' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {(selectedYear.cycles || []).map(cyc => (
                  <div key={cyc.id} className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cyc.nom}</h4>
                      <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        ACTIF
                      </span>
                    </div>
                    <div className="pt-2 border-t flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--border)' }}>
                      <span>{cyc.classesCount || 4} promotions</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{cyc.sallesCount || 4} salles</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* RÉPERTOIRE DES SALLES PHYSIQUES ATTRIBUÉES */}
              <div className="p-5 rounded-2xl border shadow-xs space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Répertoire des Salles Physiques d'Études ({selectedYear.salles ? selectedYear.salles.length : 0})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Capacités d'accueil et locaux attribués aux classes</p>
                  </div>

                  <button
                    onClick={() => { setEditingRoom(null); setShowRoomModal(true); }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
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

          {/* TAB 3: PÉRIODES & CALENDRIER EXAMENS */}
          {activeDetailTab === 'periodes' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Calendrier Pédagogique & Découpage EPST</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Périodes d'enseignement et sessions d'examens officielles</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paginatedPeriodes.map(per => (
                  <div key={per.id} className="p-4 rounded-xl border flex items-center justify-between space-x-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        per.type === 'EXAM' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{per.nom}</h4>
                        <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">Intervalle : {per.debut} au {per.fin}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${
                      per.type === 'EXAM' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}>
                      {per.type === 'EXAM' ? 'EXAMENS EPST' : 'PÉRIODE NORMALE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MIGRATION & CLÔTURE D'ANNÉE */}
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

      {/* MODAL MODIFICATION DES FRAIS DE BASE */}
      {showBaseFeesModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setShowBaseFeesModal(false)}>
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl border p-6 space-y-5"
            style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Grille Tarifaire de Base — {selectedYear?.nom}</h3>
              </div>
              <button onClick={() => setShowBaseFeesModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-500/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBaseFees} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Frais d'Inscription (USD)</label>
                  <NumberInput
                    value={baseInscription}
                    onChange={setBaseInscription}
                    min={0}
                    placeholder="USD"
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-500/5 font-bold"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Frais de Connexion Système (USD)</label>
                  <NumberInput
                    value={baseConnexion}
                    onChange={setBaseConnexion}
                    min={0}
                    placeholder="USD"
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-500/5 font-bold"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Frais de Réinscription (USD)</label>
                  <NumberInput
                    value={baseReinscription}
                    onChange={setBaseReinscription}
                    min={0}
                    placeholder="USD"
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-500/5 font-bold"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Frais Carte & Badge QR (USD)</label>
                  <NumberInput
                    value={baseCarte}
                    onChange={setBaseCarte}
                    min={0}
                    placeholder="USD"
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-500/5 font-bold"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setShowBaseFeesModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-bold hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Enregistrer les Modificatifs
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL AJOUT / ÉDITION FRAIS ANNEXE */}
      {showAnnexFeeModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setShowAnnexFeeModal(false)}>
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl border p-6 space-y-5"
            style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {editingAnnexFee ? 'Modifier le Frais Annexe' : 'Ajouter un Nouveau Frais Annexe'}
              </h3>
              <button onClick={() => setShowAnnexFeeModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-500/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnexFee} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Intitulé du Frais</label>
                <input
                  type="text"
                  value={annexIntitule}
                  onChange={e => setAnnexIntitule(e.target.value)}
                  placeholder="ex: Uniforme Scolaire, Kit Pédagogique..."
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-500/5 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Montant</label>
                  <NumberInput
                    value={annexMontant}
                    onChange={setAnnexMontant}
                    min={0}
                    placeholder="Montant"
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-500/5 font-bold"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Devise</label>
                  <CustomSelect
                    options={[
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'CDF', label: 'CDF (FC)' },
                    ]}
                    value={annexDevise}
                    onChange={v => setAnnexDevise(v as any)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Catégorie de Frais</label>
                  <CustomSelect
                    options={[
                      { value: 'KIT', label: 'Kit Scolaire & Équipements' },
                      { value: 'CONNEXION', label: 'Système & SMS Parents' },
                      { value: 'INSCRIPTION', label: 'Inscription' },
                      { value: 'REINSCRIPTION', label: 'Réinscription' },
                      { value: 'CARTE', label: 'Carte d\'Élève' },
                      { value: 'AUTRE', label: 'Autre Frais Annexe' },
                    ]}
                    value={annexTypeFrais}
                    onChange={v => setAnnexTypeFrais(v as any)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Obligation</label>
                  <CustomSelect
                    options={[
                      { value: 'OBLIGATOIRE', label: 'Frais Obligatoire' },
                      { value: 'OPTIONNEL', label: 'Frais Optionnel' },
                    ]}
                    value={annexObligatoire ? 'OBLIGATOIRE' : 'OPTIONNEL'}
                    onChange={v => setAnnexObligatoire(v === 'OBLIGATOIRE')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAnnexFeeModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-bold hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {editingAnnexFee ? 'Enregistrer' : 'Créer le Frais'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
