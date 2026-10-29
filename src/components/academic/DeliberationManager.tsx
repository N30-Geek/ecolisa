import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  GraduationCap,
  Layers,
  Pencil,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { DeliberationPVModal } from './DeliberationPVModal';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { Cote, ClasseScolaire, Discipline, Eleve, AnneeScolaireConfig } from '../../types';
import { EPST_SECTIONS_OPTIONS } from '../../data/referentielEpstData';
import { filterSubjectsByContext, getAllowedOptionsForClass, getClassCycle } from '../../utils/academicContext';
import {
  computeClassStats,
  computeStudentAnnualResult,
  getDecisionColor,
  getDecisionLabel,
  getMention,
  rankResults,
  type StudentDeliberationResult,
  type ClassDeliberationStats,
  type DeliberationRules,
  type TypeDecisionDeliberation,
  DEFAULT_DELIBERATION_RULES,
} from '../../utils/deliberation';
import { CustomSelect } from '../common/CustomSelect';
import { Pagination } from '../common/Pagination';
import { NumberInput } from '../common/NumberInput';
import { usePagination } from '../../hooks/usePagination';

const CYCLES = [
  { value: 'ALL', label: 'Tous les cycles' },
  { value: 'MATERNELLE', label: 'Maternelle' },
  { value: 'PRIMAIRE', label: 'Primaire' },
  { value: 'SECONDAIRE_CTEB', label: 'CTEB' },
  { value: 'HUMANITES', label: 'Humanités' },
];

const DECISION_FILTERS = [
  { value: 'ALL', label: 'Toutes les décisions' },
  { value: 'ADMIS', label: 'Admis' },
  { value: 'ADMIS_DISTINCTION', label: 'Admis avec distinction' },
  { value: 'REPECHAGE', label: 'Repêchage' },
  { value: 'REDOUBLEMENT', label: 'Redoublement' },
  { value: 'EXCLUSION', label: 'Exclusion' },
];

const MANUAL_DECISION_OPTIONS = [
  { value: '', label: 'Auto' },
  { value: 'ADMIS', label: 'Admis' },
  { value: 'ADMIS_DISTINCTION', label: 'Admis distinction' },
  { value: 'REPECHAGE', label: 'Repêchage' },
  { value: 'REDOUBLEMENT', label: 'Redoublement' },
  { value: 'EXCLUSION', label: 'Exclusion' },
];

interface DeliberationManagerProps {
  activeSchoolYear?: string;
}

export const DeliberationManager: React.FC<DeliberationManagerProps> = ({ activeSchoolYear }) => {
  const [schoolYears, setSchoolYears] = useState<AnneeScolaireConfig[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [subjects, setSubjects] = useState<Discipline[]>([]);
  const [cotes, setCotes] = useState<Cote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedYearId, setSelectedYearId] = useState<string>(activeSchoolYear || '');
  const [selectedCycle, setSelectedCycle] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedOptionCode, setSelectedOptionCode] = useState<string>('');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [rules, setRules] = useState<DeliberationRules>({ ...DEFAULT_DELIBERATION_RULES });
  const [manualOverrides, setManualOverrides] = useState<Record<string, TypeDecisionDeliberation | ''>>({});
  const [pvOpen, setPvOpen] = useState(false);

  // Chargement initial
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [years, cls, subs] = await Promise.all([
        LocalDatabaseService.getSchoolYears(),
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSubjects(),
      ]);
      if (!mounted) return;
      setSchoolYears(years);
      setClasses(cls);
      setSubjects(subs);
      const activeYear = years.find((y) => y.id === activeSchoolYear) || years.find((y) => y.statut === 'EN_COURS') || years[0];
      if (activeYear) setSelectedYearId(activeYear.id);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [activeSchoolYear]);

  const activeYear = useMemo(
    () => schoolYears.find((y) => y.id === selectedYearId) || schoolYears[0],
    [schoolYears, selectedYearId]
  );

  const filteredClasses = useMemo(() => {
    let list = classes.filter((c) => c.schoolYearId === selectedYearId || !selectedYearId);
    if (selectedCycle !== 'ALL') list = list.filter((c) => (c.cycleId || '').toUpperCase() === selectedCycle);
    return list;
  }, [classes, selectedYearId, selectedCycle]);

  const currentClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || filteredClasses[0],
    [classes, selectedClassId, filteredClasses]
  );

  // Chargement des élèves et cotes quand la classe change
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!currentClass) { setStudents([]); setCotes([]); setManualOverrides({}); return; }
      setLoading(true);
      const [st, co] = await Promise.all([
        LocalDatabaseService.getEleves({ classId: currentClass.id, schoolYearId: selectedYearId }),
        LocalDatabaseService.getCotes({ classeId: currentClass.id }),
      ]);
      if (!mounted) return;
      setStudents(st);
      setCotes(co);
      setManualOverrides({});
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [currentClass, selectedYearId]);

  // Options autorisées pour la classe
  const allowedOptions = useMemo(() => {
    if (!currentClass) return [];
    const base = getAllowedOptionsForClass(currentClass, classes, null);
    return base.length ? base : EPST_SECTIONS_OPTIONS.filter((o) => o.value !== 'ALL');
  }, [currentClass, classes]);

  // Initialiser l'option sélectionnée quand la classe ou ses options change
  useEffect(() => {
    if (!currentClass) { setSelectedOptionCode(''); return; }
    const classOption = currentClass.optionCode && currentClass.optionCode !== 'TRONC_COMMUN' ? currentClass.optionCode : '';
    if (getClassCycle(currentClass) === 'HUMANITES') {
      setSelectedOptionCode(classOption || allowedOptions[0]?.value || 'TRONC_COMMUN');
    } else {
      setSelectedOptionCode('TRONC_COMMUN');
    }
  }, [currentClass, allowedOptions]);

  const relevantSubjects = useMemo(() => {
    if (!currentClass) return [];
    const option = getClassCycle(currentClass) === 'HUMANITES' ? (selectedOptionCode || currentClass.optionCode) : currentClass.optionCode;
    return filterSubjectsByContext(subjects, currentClass, option).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  }, [subjects, currentClass, selectedOptionCode]);

  // Calcul des résultats avec règles ajustables
  const baseResults = useMemo(() => {
    if (!students.length || !relevantSubjects.length) return [];
    const computed = students.map((s) =>
      computeStudentAnnualResult(s, cotes, relevantSubjects, rules)
    );
    return rankResults(computed);
  }, [students, cotes, relevantSubjects, rules]);

  const results = useMemo(() => {
    return baseResults.map((r) => {
      const forced = manualOverrides[r.eleve.id];
      if (!forced) return r;
      return {
        ...r,
        decision: forced,
        reason: `Décision manuelle du conseil de classe. ${r.reason}`,
      };
    });
  }, [baseResults, manualOverrides]);

  const stats: ClassDeliberationStats | null = useMemo(
    () => (results.length ? computeClassStats(results) : null),
    [results]
  );

  const filteredResults = useMemo(() => {
    let list = [...results];
    if (decisionFilter !== 'ALL') list = list.filter((r) => r.decision === decisionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          `${r.eleve.nom} ${r.eleve.prenom} ${r.eleve.postnom || ''}`.toLowerCase().includes(q) ||
          (r.eleve.registrationNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [results, decisionFilter, search]);

  const pagination = usePagination(filteredResults, { defaultPageSize: 25 });

  const onApplyDecisions = async () => {
    if (!results.length || !currentClass) return;
    setSaving(true);
    try {
      await Promise.all(
        results.map((r) => {
          const updates: Partial<Eleve> = {
            decisionConseil: r.decision,
            mentionConseil: r.mention.code,
            pourcentageGeneral: r.generalPercent,
            rangClasse: r.rank,
            branchesEchecMajeur: r.failedMajorSubjects.length,
            branchesEchecMineur: r.failedMinorSubjects.length,
            observationsDeliberation: r.reason,
            dateDeliberation: new Date().toISOString(),
          };
          if (r.decision === 'EXCLUSION') updates.statut = 'EXCLU';
          else if (r.decision === 'REDOUBLEMENT') updates.statut = 'REDOUBLANT';
          else if (['ADMIS', 'ADMIS_DISTINCTION'].includes(r.decision)) {
            updates.statut = currentClass.nom?.toUpperCase().includes('TERMINAL') ? 'FINALISTE' : 'ACTIF';
          }
          return LocalDatabaseService.updateEleve(r.eleve.id, updates);
        })
      );
      const updated = await LocalDatabaseService.getEleves({ classId: currentClass.id, schoolYearId: selectedYearId });
      setStudents(updated);
      setManualOverrides({});
    } finally {
      setSaving(false);
    }
  };

  const onResetRules = () => setRules({ ...DEFAULT_DELIBERATION_RULES });

  const updateRule = (key: keyof DeliberationRules, value: number) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  const yearOptions = useMemo(() => schoolYears.map((y) => ({ value: y.id, label: y.nom })), [schoolYears]);
  const classOptions = useMemo(() => filteredClasses.map((c) => ({ value: c.id, label: c.nom })), [filteredClasses]);

  const StatCard: React.FC<{
    label: string;
    value: string | number;
    icon: any;
    valueClass?: string;
    borderClass?: string;
  }> = ({ label, value, icon: Icon, valueClass = '', borderClass = '' }) => (
    <div className={`p-4 rounded-xl border ${borderClass}`} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className={`text-xl font-black ${valueClass}`} style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );

  if (loading && !schoolYears.length) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement des données...
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Délibérations EPST RDC
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Conseil de classe, décisions de passage, repêchage et redoublement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${showAdvanced ? 'bg-indigo-600 text-white border-indigo-600' : ''}`}
            style={{ borderColor: 'var(--border)', color: showAdvanced ? '#fff' : 'var(--text-muted)' }}
            title="Paramètres des seuils"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Paramètres</span>
          </button>
          <button
            onClick={() => setPvOpen(true)}
            disabled={!results.length}
            className="p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            title="Procès-verbal"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PV</span>
          </button>
          <button
            onClick={onApplyDecisions}
            disabled={saving || !results.length}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Appliquer les décisions
          </button>
        </div>
      </div>

      {/* Paramètres ajustables */}
      {showAdvanced && (
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>Seuils de délibération</span>
            </div>
            <button
              onClick={onResetRules}
              className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 hover:bg-slate-500/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <RotateCcw className="w-3 h-3" /> EPST par défaut
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { key: 'passThreshold' as const, label: 'Passage ≥ (%)', hint: 'Admission directe' },
              { key: 'majorSubjectThreshold' as const, label: 'Majeure ≥ (%)', hint: 'Branche option majeure' },
              { key: 'repechageThreshold' as const, label: 'Repêchage ≥ (%)', hint: 'Seuil bas repêchage' },
              { key: 'redoublementThreshold' as const, label: 'Redoublement < (%)', hint: 'Seuil bas redoublement' },
              { key: 'maxMinorFailsForRepechage' as const, label: 'Max branches 2nd', hint: 'Repêchage autorisé' },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="block text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{field.label}</label>
                <NumberInput
                  value={rules[field.key]}
                  onChange={(v) => updateRule(field.key, v)}
                  min={0}
                  max={field.key === 'maxMinorFailsForRepechage' ? 20 : 100}
                  integer={field.key === 'maxMinorFailsForRepechage'}
                  className="w-full px-3 py-2 rounded-lg border text-xs font-black"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{field.hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
          <CustomSelect options={yearOptions} value={selectedYearId} onChange={setSelectedYearId} />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Cycle</label>
          <CustomSelect options={CYCLES} value={selectedCycle} onChange={(v) => { setSelectedCycle(v); setSelectedClassId(''); }} />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Classe</label>
          <CustomSelect options={classOptions} value={currentClass?.id || ''} onChange={setSelectedClassId} />
        </div>
        {currentClass && (currentClass.cycleId || '').toUpperCase() === 'HUMANITES' && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Option</label>
            <CustomSelect options={allowedOptions} value={selectedOptionCode} onChange={setSelectedOptionCode} />
          </div>
        )}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Décision</label>
          <CustomSelect options={DECISION_FILTERS} value={decisionFilter} onChange={setDecisionFilter} />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Recherche élève</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom / matricule"
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Users} label="Inscrits" value={stats.inscrits} borderClass="border-l-4 border-slate-400" />
          <StatCard icon={CheckCircle2} label="Admis" value={stats.admis + stats.admisDistinction} borderClass="border-l-4 border-emerald-500" valueClass="text-emerald-600" />
          <StatCard icon={BookOpen} label="Repêchage" value={stats.repechage} borderClass="border-l-4 border-amber-500" valueClass="text-amber-600" />
          <StatCard icon={RefreshCw} label="Redoublement" value={stats.redoublement} borderClass="border-l-4 border-rose-500" valueClass="text-rose-600" />
          <StatCard icon={XCircle} label="Exclusion" value={stats.exclusion} borderClass="border-l-4 border-red-600" valueClass="text-red-600" />
          <StatCard icon={TrendingUp} label="Taux de réussite" value={`${stats.tauxReussite}%`} borderClass="border-l-4 border-indigo-500" valueClass="text-indigo-600" />
        </div>
      )}

      {/* Tableau */}
      <div className="rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-sunken)' }}>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>N°</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Matricule</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider min-w-[170px]" style={{ color: 'var(--text-muted)' }}>Nom et prénom</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>%</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mention</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Éch. maj.</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Éch. min.</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider min-w-[180px]" style={{ color: 'var(--text-muted)' }}>Décision</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rang</th>
              </tr>
            </thead>
            <tbody>
              {pagination.paginated.map((r) => {
                const mention = r.mention;
                const colorCls = getDecisionColor(r.decision);
                const base = baseResults.find((b) => b.eleve.id === r.eleve.id);
                const isManual = !!manualOverrides[r.eleve.id];
                return (
                  <tr
                    key={r.eleve.id}
                    className="border-t hover:bg-slate-500/5 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="p-3 font-bold">{r.rank}</td>
                    <td className="p-3 text-slate-500">{r.eleve.registrationNumber}</td>
                    <td className="p-3 font-bold">
                      {r.eleve.nom} {r.eleve.prenom} {r.eleve.postnom}
                    </td>
                    <td className="p-3 font-black">{r.generalPercent.toFixed(1)}%</td>
                    <td className={`p-3 font-black ${mention.color}`}>{mention.code}</td>
                    <td className="p-3">
                      {r.failedMajorSubjects.length > 0 ? (
                        <span
                          className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold cursor-help"
                          title={r.failedMajorSubjects.map((f) => `${f.subject.nom} (${f.percent.toFixed(1)}%)`).join(', ')}
                        >
                          {r.failedMajorSubjects.length}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {r.failedMinorSubjects.length > 0 ? (
                        <span
                          className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold cursor-help"
                          title={r.failedMinorSubjects.map((f) => `${f.subject.nom} (${f.percent.toFixed(1)}%)`).join(', ')}
                        >
                          {r.failedMinorSubjects.length}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5 min-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${colorCls}`}
                            title={r.reason}
                          >
                            {getDecisionLabel(r.decision)}
                          </span>
                          {isManual && (
                            <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5" title={`Automatique : ${getDecisionLabel(base?.decision || r.decision)}`}>
                              <Pencil className="w-3 h-3" /> Manuel
                            </span>
                          )}
                        </div>
                        <CustomSelect
                          options={MANUAL_DECISION_OPTIONS}
                          value={manualOverrides[r.eleve.id] || ''}
                          onChange={(v) => {
                            const val = v as TypeDecisionDeliberation | '';
                            setManualOverrides((prev) => ({ ...prev, [r.eleve.id]: val }));
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 font-black">{r.rank}</td>
                  </tr>
                );
              })}
              {pagination.paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    {currentClass ? 'Aucun résultat pour cette classe.' : 'Sélectionnez une classe.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            pageSizeOptions={pagination.pageSizeOptions}
            start={pagination.start}
            end={pagination.end}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            compact
          />
        </div>
      </div>

      {/* Détails matières */}
      {currentClass && results.length > 0 && (
        <div className="p-4 rounded-xl border text-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-black" style={{ color: 'var(--text-primary)' }}>
              Matières prises en compte ({relevantSubjects.length} dont {relevantSubjects.filter((s) => s.isOptionMajora || (s.coefficient || 1) >= 3).length} majeures)
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {relevantSubjects.map((s) => (
              <span key={s.id} className="px-2 py-1 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                {s.nom} {(s.isOptionMajora || (s.coefficient || 1) >= 3) ? <span className="text-amber-600 font-bold">(Majeure)</span> : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {pvOpen && (
        <DeliberationPVModal
          isOpen={pvOpen}
          onClose={() => setPvOpen(false)}
          currentClass={currentClass}
          yearName={activeYear?.nom}
          results={results}
          stats={stats}
        />
      )}
    </div>
  );
};
