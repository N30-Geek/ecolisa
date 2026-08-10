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
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { Discipline } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import {
  OFFICIAL_EPST_COURSES,
  EPST_SECTIONS_OPTIONS,
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

const getSafeExamen = (s: Discipline): number => {
  if (s.maxExamen !== undefined && s.maxExamen !== null && !isNaN(Number(s.maxExamen)) && Number(s.maxExamen) > 0) {
    return Number(s.maxExamen);
  }
  const periodScore = getSafeScore(s.maxScore, 20);
  return periodScore * 2;
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
    case 'PRATIQUE':
      return { label: 'Technique & Pro.', style: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
    case 'EVEIL_ART':
      return { label: 'Éveil & Arts', style: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' };
    default:
      return { label: cat || 'Général', style: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' };
  }
};

interface SubjectsManagerProps {
  activeSchoolYear?: string;
}

export const SubjectsManager: React.FC<SubjectsManagerProps> = ({ activeSchoolYear }) => {
  const [subjectsList, setSubjectsList] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Filtres
  const [cycleFilter, setCycleFilter] = useState<string>('ALL');
  const [optionFilter, setOptionFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modale d'ajout / édition
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Discipline | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    categorie: 'LANGUES',
    maxScore: 20,
    maxExamen: 40,
    coefficient: 2,
    cycleCode: 'HUMANITES',
    optionCode: 'COMMERCIALE',
  });

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const list = await LocalDatabaseService.getSubjects();
      setSubjectsList(list || []);
    } catch (e) {
      console.error('Erreur chargement matières:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [activeSchoolYear]);

  // FILTRAGE DES MATIÈRES
  const filteredSubjects = useMemo(() => {
    return subjectsList.filter((s) => {
      if (cycleFilter !== 'ALL' && s.cycleCode && s.cycleCode !== cycleFilter) return false;
      if (optionFilter !== 'ALL' && s.optionCode && s.optionCode !== optionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.nom.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [subjectsList, cycleFilter, optionFilter, search]);

  const { paginated: paginatedSubjects, ...subjectsTabPagination } = usePagination(filteredSubjects, { defaultPageSize: 10 });

  // STATISTIQUES EN TEMPS RÉEL
  const stats = useMemo(() => {
    const totalCount = subjectsList.length;
    const majorCount = subjectsList.filter(s => (s.coefficient || 1) >= 3).length;
    const exactSciences = subjectsList.filter(s => s.categorie === 'SCIENCES_EXACTES' || s.categorie === 'SCIENCES').length;
    const languages = subjectsList.filter(s => s.categorie === 'LANGUES').length;

    return {
      totalCount,
      majorCount,
      exactSciences,
      languages,
    };
  }, [subjectsList]);

  // CHARGER LE PROGRAMME OFFICIEL EPST RDC EN 1 CLIC
  const handleLoadOfficialProgram = async () => {
    if (!window.confirm('Voulez-vous charger le référentiel officiel des cours EPST RDC dans la base de données ?')) return;
    setImporting(true);
    try {
      for (const item of OFFICIAL_EPST_COURSES) {
        const existing = subjectsList.find((s) => s.code === item.code);
        if (!existing) {
          await LocalDatabaseService.addSubject({
            id: uuid(),
            code: item.code,
            nom: item.nom,
            categorie: item.categorie as any,
            maxScore: item.maxScore,
            maxExamen: item.maxExamen,
            coefficient: item.coefficient,
            cycleCode: item.cycleCode,
            optionCode: item.optionCode || 'TRONC_COMMUN',
          } as any);
        }
      }
      await loadSubjects();
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
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
      coefficient: 2,
      cycleCode: 'HUMANITES',
      optionCode: 'COMMERCIALE',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sub: Discipline) => {
    setEditingSubject(sub);
    setFormData({
      code: sub.code || '',
      nom: sub.nom || '',
      categorie: sub.categorie || 'LANGUES',
      maxScore: sub.maxScore || 20,
      maxExamen: sub.maxExamen || (sub.maxScore ? sub.maxScore * 2 : 40),
      coefficient: sub.coefficient || 2,
      cycleCode: (sub as any).cycleCode || 'HUMANITES',
      optionCode: (sub as any).optionCode || 'COMMERCIALE',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette matière ?')) return;
    await LocalDatabaseService.deleteSubject(id);
    loadSubjects();
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) return alert('Veuillez entrer le nom de la matière.');
    try {
      if (editingSubject) {
        await LocalDatabaseService.updateSubject(editingSubject.id, formData as any);
      } else {
        await LocalDatabaseService.addSubject({
          id: uuid(),
          ...formData,
        } as any);
      }
      setShowModal(false);
      loadSubjects();
    } catch (e) {
      console.error(e);
      alert('Erreur de sauvegarde.');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* EN-TÊTE DU GESTIONNAIRE */}
      <div
        className="p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Matières, Disciplines & Coefficients EPST RDC
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Référentiel officiel des cours par cycle, option et maxima de cotation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadOfficialProgram}
            disabled={importing}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer ${
              importSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {importing ? (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : importSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Programme RDC Importé !
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-500" /> Programme Officiel EPST
              </>
            )}
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nouvelle Matière
          </button>
        </div>
      </div>

      {/* CARTES INDICATEURS / KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Matières</p>
            <p className="text-base font-black font-mono" style={{ color: 'var(--text-primary)' }}>{stats.totalCount} cours</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Matières Majeures</p>
            <p className="text-base font-black font-mono text-amber-600 dark:text-amber-400">{stats.majorCount} (Coeff. ≥ 3)</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Sciences Exactes</p>
            <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{stats.exactSciences} cours</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Langues & Comm.</p>
            <p className="text-base font-black font-mono text-purple-600 dark:text-purple-400">{stats.languages} cours</p>
          </div>
        </div>
      </div>

      {/* PANNEAU DE FILTRAGE ET RECHERCHE */}
      <div
        className="p-4 rounded-2xl border space-y-3 shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Filtre Cycle */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Cycle Scolaire</label>
            <CustomSelect
              value={cycleFilter}
              onChange={(v) => setCycleFilter(v)}
              options={[
                { value: 'ALL', label: 'Tous les Cycles Scolaires' },
                { value: 'MATERNELLE', label: 'Cycle Maternelle' },
                { value: 'PRIMAIRE', label: 'Cycle Primaire' },
                { value: 'SECONDAIRE_CTEB', label: 'Cycle CTEB (7è / 8è EB)' },
                { value: 'HUMANITES', label: 'Cycle Humanités' },
              ]}
            />
          </div>

          {/* Filtre Option */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Section / Option</label>
            <CustomSelect
              value={optionFilter}
              onChange={(v) => setOptionFilter(v)}
              options={EPST_SECTIONS_OPTIONS}
            />
          </div>

          {/* Recherche Intitulé avec Bouton X */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Recherche Cours</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Mathématiques, Français, Comptabilité..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl border text-xs bg-slate-500/10 focus:outline-none focus:border-indigo-500 font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
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
      </div>

      {/* TABLEAU RÉPERTOIRE DES MATIÈRES */}
      <div
        className="rounded-2xl border shadow-xs overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <h3 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Répertoire Officiel des Matières · {filteredSubjects.length} résultat(s)
          </h3>
          <span className="text-xs text-slate-400 font-medium">Barèmes officiels EPST RDC</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b uppercase tracking-wider text-[10px] font-black text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <th className="p-3.5">Discipline / Matière</th>
                <th className="p-3.5">Code EPST</th>
                <th className="p-3.5">Domaine / Catégorie</th>
                <th className="p-3.5 text-center">Cycle & Option</th>
                <th className="p-3.5 text-center">Max Période</th>
                <th className="p-3.5 text-center">Max Examen</th>
                <th className="p-3.5 text-center">Coefficient</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginatedSubjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <p className="font-bold mb-2">Aucune matière trouvée.</p>
                    <button
                      onClick={handleLoadOfficialProgram}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" /> Importer le Référentiel EPST RDC
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedSubjects.map((s) => {
                  const catBadge = getCategoryBadge(s.categorie);

                  return (
                    <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-3.5 font-black text-xs" style={{ color: 'var(--text-primary)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                            {s.nom[0]}
                          </div>
                          <span>{s.nom}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-indigo-500 dark:text-indigo-400 font-bold">{s.code}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadge.style}`}>
                          {catBadge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-500 text-[10.5px]">
                        <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 text-[10px]">
                          {(s as any).cycleCode || 'TOUS'} · {(s as any).optionCode || 'TRONC_COMMUN'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-black text-slate-700 dark:text-slate-300">
                        / {getSafeScore(s.maxScore, 20)} pts
                      </td>
                      <td className="p-3.5 text-center font-mono font-black text-indigo-600 dark:text-indigo-400">
                        / {getSafeExamen(s)} pts
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                          getSafeScore(s.coefficient, 1) >= 3
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                            : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                        }`}>
                          Coeff. {getSafeScore(s.coefficient, 1)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                            title="Modifier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* MODALE D'AJOUT / ÉDITION DE MATIÈRE */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setShowModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4"
              style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-black text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <span>{editingSubject ? 'Modifier la Matière' : 'Ajouter une Matière EPST'}</span>
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold mb-1 block">Nom de la Matière</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="ex: Comptabilité Générale"
                    className="w-full px-3 py-2 rounded-xl border font-medium bg-slate-500/10 focus:outline-none focus:border-indigo-500"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold mb-1 block">Code Matière</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold bg-slate-500/10 focus:outline-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold mb-1 block">Domaine / Catégorie</label>
                    <CustomSelect
                      value={formData.categorie}
                      onChange={(v) => setFormData({ ...formData, categorie: v })}
                      options={[
                        { value: 'LANGUES', label: 'Langues & Communication' },
                        { value: 'SCIENCES_EXACTES', label: 'Sciences Exactes' },
                        { value: 'SCIENCES_HUMAINES', label: 'Sciences Humaines' },
                        { value: 'TECHNIQUE_PROF', label: 'Technique & Professionnel' },
                        { value: 'EVEIL_ART', label: 'Éveil & Arts' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold mb-1 block">Cycle Scolaire</label>
                    <CustomSelect
                      value={formData.cycleCode}
                      onChange={(v) => setFormData({ ...formData, cycleCode: v })}
                      options={[
                        { value: 'MATERNELLE', label: 'Cycle Maternelle' },
                        { value: 'PRIMAIRE', label: 'Cycle Primaire' },
                        { value: 'SECONDAIRE_CTEB', label: 'Cycle CTEB (7è / 8è EB)' },
                        { value: 'HUMANITES', label: 'Cycle Humanités' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="font-bold mb-1 block">Section / Option</label>
                    <CustomSelect
                      value={formData.optionCode}
                      onChange={(v) => setFormData({ ...formData, optionCode: v })}
                      options={EPST_SECTIONS_OPTIONS.filter(o => o.value !== 'ALL')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="font-bold mb-1 block">Max Période</label>
                    <NumberInput
                      value={formData.maxScore}
                      onChange={v => setFormData({ ...formData, maxScore: v, maxExamen: v * 2 })}
                      min={1}
                      placeholder="Max"
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold text-center bg-slate-500/10"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold mb-1 block">Max Examen (x2)</label>
                    <NumberInput
                      value={formData.maxExamen}
                      onChange={v => setFormData({ ...formData, maxExamen: v })}
                      min={1}
                      placeholder="Max"
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold text-center bg-slate-500/10"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold mb-1 block">Coefficient</label>
                    <NumberInput
                      value={formData.coefficient}
                      onChange={v => setFormData({ ...formData, coefficient: v })}
                      min={1}
                      placeholder="Coef"
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold text-center bg-slate-500/10"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Enregistrer la Matière
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
