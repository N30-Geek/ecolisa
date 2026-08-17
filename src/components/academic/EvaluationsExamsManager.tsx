import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Award, Calendar, Download, Edit3, GraduationCap, Plus, Save, Search,
  Trash2, Users, X, TrendingUp, FileText, BarChart3, BookOpen,
  CheckCircle2, AlertCircle, Clock, Sparkles, User, ClipboardList,
  Target, Layers, ArrowRight, RefreshCw, CheckCircle, Minus
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { Cote, ClasseScolaire, Discipline, Eleve, TypeEvaluation, MembrePersonnel } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { NumberInput } from '../common/NumberInput';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID)
    return (window as any).crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

type StatutEvaluation = 'PLANIFIEE' | 'EN_COURS' | 'CORRIGEE' | 'PUBLIEE';

const EVAL_TYPES: { value: TypeEvaluation; label: string; color: string; icon: string; abbr: string }[] = [
  { value: 'INTERROGATION',     label: 'Interrogation',         color: '#6366f1', icon: '📝', abbr: 'INT' },
  { value: 'EXERCICE_CONTROLE', label: 'Exercice de Contrôle',  color: '#10b981', icon: '✍️', abbr: 'EC'  },
  { value: 'DEVOIR',            label: 'Devoir à Domicile',     color: '#8b5cf6', icon: '📖', abbr: 'DD'  },
  { value: 'PRATIQUE',          label: 'Travaux Pratiques',     color: '#06b6d4', icon: '🔬', abbr: 'TP'  },
  { value: 'EXAMEN',            label: 'Examen',                color: '#f59e0b', icon: '🎓', abbr: 'EX'  },
  { value: 'EXAMEN_BLANC',      label: 'Examen Blanc',          color: '#ef4444', icon: '📋', abbr: 'EB'  },
  { value: 'PROJET',            label: 'Projet',                color: '#ec4899', icon: '🛠️', abbr: 'PRJ' },
  { value: 'COMPOSITION',       label: 'Composition',           color: '#84cc16', icon: '🖊️', abbr: 'CO'  },
];

const PERIODS = [
  { value: '1ere Periode',         label: '1ère Période'           },
  { value: '2eme Periode',         label: '2ème Période'           },
  { value: 'Examen 1er Semestre',  label: 'Examen 1er Semestre'    },
  { value: '3eme Periode',         label: '3ème Période'           },
  { value: '4eme Periode',         label: '4ème Période'           },
  { value: 'Examen 2eme Semestre', label: 'Examen 2ème Semestre'   },
  { value: "Examen d'Etat",        label: "Examen d'État (EXETAT)" },
  { value: 'Rattrapage',           label: 'Session de Rattrapage'  },
];

const STATUTS: { value: StatutEvaluation; label: string; color: string; bg: string }[] = [
  { value: 'PLANIFIEE', label: 'Planifiée', color: '#6366f1', bg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'   },
  { value: 'EN_COURS',  label: 'En cours',  color: '#f59e0b', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'       },
  { value: 'CORRIGEE',  label: 'Corrigée',  color: '#10b981', bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'},
  { value: 'PUBLIEE',   label: 'Publiée',   color: '#8b5cf6', bg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30'    },
];

// ── INTERFACES ────────────────────────────────────────────────────────────────

interface EpreuveEnrichi {
  id: string; titre: string; type: TypeEvaluation; periode: string;
  classeId: string; nomClasse: string; matiereId: string; nomMatiere: string;
  professeurId?: string; nomProfesseur?: string; dateEvaluation: string;
  baremeMax: number; statut: StatutEvaluation; remarques?: string; cotes: Cote[];
  moyenne: number; moyennePct: number; nbParticipants: number;
  nbReussi: number; nbEchoue: number; tauxReussite: number;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

const typeInfo  = (t: TypeEvaluation)    => EVAL_TYPES.find(e => e.value === t) || EVAL_TYPES[0];
const statutInfo = (s: StatutEvaluation) => STATUTS.find(x => x.value === s)    || STATUTS[0];

const perfBadge = (score: number, max: number) => {
  if (max <= 0) return { label: '—', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' };
  const pct = (score / max) * 100;
  if (pct >= 80) return { label: 'Excellent',   cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
  if (pct >= 60) return { label: 'Bien',         cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'                };
  if (pct >= 50) return { label: 'Passable',     cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'         };
  return            { label: 'Insuffisant', cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'               };
};

const AVATAR_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

const buildEpreuves = (
  cotes: Cote[], classes: ClasseScolaire[], subjects: Discipline[], teachers: MembrePersonnel[]
): EpreuveEnrichi[] => {
  const map = new Map<string, EpreuveEnrichi>();
  for (const c of cotes) {
    const evId = c.evaluationId || `ev-${c.type}-${c.classeId}-${c.matiereId}-${c.periode}-${c.dateCote}`;
    let g = map.get(evId);
    if (!g) {
      const cls  = classes.find(x => x.id === c.classeId);
      const subj = subjects.find(x => x.id === c.matiereId);
      const raw  = c as any;
      const profId = raw.professeurId || '';
      const prof = teachers.find(t => t.id === profId);
      g = {
        id: evId, titre: c.titre || typeInfo(c.type).label, type: c.type, periode: c.periode,
        classeId: c.classeId || '', nomClasse: cls?.nom || c.classeId || '—',
        matiereId: c.matiereId || '', nomMatiere: subj?.nom || c.matiereId || '—',
        professeurId: profId,
        nomProfesseur: prof ? `${prof.prenom} ${prof.nom}` : (raw.nomProfesseur || ''),
        dateEvaluation: c.dateCote || '', baremeMax: c.maxScore,
        statut: (raw.statut as StatutEvaluation) || 'CORRIGEE',
        remarques: raw.remarques || '',
        cotes: [], moyenne: 0, moyennePct: 0, nbParticipants: 0, nbReussi: 0, nbEchoue: 0, tauxReussite: 0,
      };
      map.set(evId, g);
    }
    g.cotes.push(c);
  }
  for (const g of map.values()) {
    const total = g.cotes.reduce((a, c) => a + (c.score || 0), 0);
    g.nbParticipants = g.cotes.length;
    g.moyenne        = g.nbParticipants > 0 ? total / g.nbParticipants : 0;
    g.moyennePct     = g.baremeMax > 0 ? Math.round((g.moyenne / g.baremeMax) * 100) : 0;
    g.nbReussi       = g.cotes.filter(c => c.score >= c.maxScore * 0.5).length;
    g.nbEchoue       = g.nbParticipants - g.nbReussi;
    g.tauxReussite   = g.nbParticipants > 0 ? Math.round((g.nbReussi / g.nbParticipants) * 100) : 0;
  }
  return Array.from(map.values()).sort((a, b) => (b.dateEvaluation || '').localeCompare(a.dateEvaluation || ''));
};

// ── UI ATOMS ──────────────────────────────────────────────────────────────────

const TypeBadge: React.FC<{ type: TypeEvaluation; size?: 'sm' | 'md' }> = ({ type, size = 'md' }) => {
  const info = typeInfo(type);
  return (
    <span
      className={`inline-flex items-center gap-1 font-black rounded-lg border ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}
      style={{ background: `${info.color}12`, color: info.color, borderColor: `${info.color}30` }}
    >
      <span>{info.icon}</span><span>{size === 'sm' ? info.abbr : info.label}</span>
    </span>
  );
};

const StatutPill: React.FC<{ statut: StatutEvaluation }> = ({ statut }) => {
  const info = statutInfo(statut);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${info.bg}`}>
      {statut === 'PLANIFIEE' && <Clock className="w-2.5 h-2.5" />}
      {statut === 'EN_COURS'  && <RefreshCw className="w-2.5 h-2.5" />}
      {statut === 'CORRIGEE'  && <CheckCircle className="w-2.5 h-2.5" />}
      {statut === 'PUBLIEE'   && <Sparkles className="w-2.5 h-2.5" />}
      {info.label}
    </span>
  );
};

const ScoreBar: React.FC<{ pct: number; color?: string }> = ({ pct, color = '#6366f1' }) => (
  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
  </div>
);

const EmptyStateBlock: React.FC<{ icon: React.FC<any>; title: string; desc?: string; action?: React.ReactNode }> = ({ icon: Icon, title, desc, action }) => (
  <div className="p-14 text-center rounded-2xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
      <Icon className="w-8 h-8 text-indigo-500" />
    </div>
    <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    {desc && <p className="text-xs text-slate-400 max-w-sm mx-auto">{desc}</p>}
    {action}
  </div>
);

const LoadingBlock = () => (
  <div className="p-12 text-center rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
    <p className="text-xs text-slate-400 font-bold">Chargement des données...</p>
  </div>
);

// ── MODAL ─────────────────────────────────────────────────────────────────────

interface EvalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<EpreuveEnrichi> & { scoreMap: Record<string, number> }) => Promise<void>;
  initialEval?: EpreuveEnrichi | null;
  classes: ClasseScolaire[];
  subjects: Discipline[];
  teachers: MembrePersonnel[];
  students: Eleve[];
  saving: boolean;
}

const EvalModal: React.FC<EvalModalProps> = ({ isOpen, onClose, onSave, initialEval, classes, subjects, teachers, students, saving }) => {
  const [titre,        setTitre]        = useState('');
  const [type,         setType]         = useState<TypeEvaluation>('INTERROGATION');
  const [periode,      setPeriode]      = useState('1ere Periode');
  const [classeId,     setClasseId]     = useState('');
  const [matiereId,    setMatiereId]    = useState('');
  const [professeurId, setProfesseurId] = useState('');
  const [dateEval,     setDateEval]     = useState(new Date().toISOString().split('T')[0]);
  const [baremeMax,    setBaremeMax]    = useState(10);
  const [statut,       setStatut]       = useState<StatutEvaluation>('PLANIFIEE');
  const [remarques,    setRemarques]    = useState('');
  const [scoreMap,     setScoreMap]     = useState<Record<string, number | 'ABS'>>({});
  const [error,        setError]        = useState('');

  const classStudents = useMemo(() => {
    if (!classeId) return [];
    const cls = classes.find(c => c.id === classeId);
    return students
      .filter(e => e.classId === classeId || (cls && e.nomClasse === cls.nom))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [classeId, students, classes]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialEval) {
      setTitre(initialEval.titre); setType(initialEval.type); setPeriode(initialEval.periode);
      setClasseId(initialEval.classeId); setMatiereId(initialEval.matiereId);
      setProfesseurId(initialEval.professeurId || '');
      setDateEval(initialEval.dateEvaluation || new Date().toISOString().split('T')[0]);
      setBaremeMax(initialEval.baremeMax); setStatut(initialEval.statut);
      setRemarques(initialEval.remarques || '');
      const sm: Record<string, number | 'ABS'> = {};
      for (const c of initialEval.cotes) sm[c.eleveId] = c.score;
      setScoreMap(sm);
    } else {
      setTitre(''); setType('INTERROGATION'); setPeriode('1ere Periode');
      setClasseId(classes[0]?.id || ''); setMatiereId(subjects[0]?.id || '');
      setProfesseurId(''); setDateEval(new Date().toISOString().split('T')[0]);
      setBaremeMax(10); setStatut('PLANIFIEE'); setRemarques(''); setScoreMap({});
    }
    setError('');
  }, [isOpen, initialEval]);

  useEffect(() => {
    if (!matiereId) return;
    const subj = subjects.find(s => s.id === matiereId);
    if (!subj) return;
    if (type === 'EXAMEN' || type === 'EXAMEN_BLANC' || type === 'COMPOSITION')
      setBaremeMax(subj.maxExamen || subj.maxScore * 2);
    else setBaremeMax(subj.maxScore);
  }, [type, matiereId, subjects]);

  const avgScore = useMemo(() => {
    const vals = classStudents.map(s => scoreMap[s.id]).filter((v): v is number => typeof v === 'number');
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [scoreMap, classStudents]);

  const handleSubmit = async () => {
    if (!titre.trim()) { setError("Veuillez saisir un titre."); return; }
    if (!classeId)     { setError('Veuillez sélectionner une classe.'); return; }
    if (!matiereId)    { setError('Veuillez sélectionner une matière.'); return; }
    const sm: Record<string, number> = {};
    for (const [k, v] of Object.entries(scoreMap))
      sm[k] = v === 'ABS' ? 0 : Math.min(baremeMax, Math.max(0, Number(v) || 0));
    await onSave({ titre, type, periode, classeId, matiereId, professeurId, dateEvaluation: dateEval, baremeMax, statut, remarques, scoreMap: sm });
  };

  if (!isOpen) return null;

  const classOpts   = classes.map(c  => ({ value: c.id,    label: c.nom }));
  const subjectOpts = subjects.map(s => ({ value: s.id,    label: `${s.nom} (max ${s.maxScore})` }));
  const teacherOpts = [{ value: '', label: '— Non assigné —' }, ...teachers.map(t => ({ value: t.id, label: `${t.prenom} ${t.nom}` }))];
  const periodOpts  = PERIODS.map(p    => ({ value: p.value,  label: p.label }));
  const typeOpts    = EVAL_TYPES.map(t => ({ value: t.value,  label: `${t.icon} ${t.label}` }));
  const statutOpts  = STATUTS.map(s   => ({ value: s.value,  label: s.label }));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-500"><ClipboardList className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                {initialEval ? "Modifier l'Évaluation" : 'Nouvelle Évaluation / Examen'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Renseignez les informations et saisissez les cotes des élèves</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto sidebar-scroll">
          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            {/* Titre + Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Titre de l'Évaluation <span className="text-rose-500">*</span>
                </label>
                <input value={titre} onChange={e => setTitre(e.target.value)}
                  placeholder="ex: Interrogation de Mathématiques — Chapitre 3"
                  className="w-full px-3.5 py-2.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Type <span className="text-rose-500">*</span></label>
                <CustomSelect options={typeOpts} value={type} onChange={v => setType(v as TypeEvaluation)} placeholder="Type" />
              </div>
            </div>

            {/* Classe + Matière + Professeur */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Classe <span className="text-rose-500">*</span></label>
                <CustomSelect options={classOpts} value={classeId} onChange={setClasseId} placeholder="Sélectionner..." />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Matière <span className="text-rose-500">*</span></label>
                <CustomSelect options={subjectOpts} value={matiereId} onChange={setMatiereId} placeholder="Sélectionner..." />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Professeur Évaluateur</label>
                <CustomSelect options={teacherOpts} value={professeurId} onChange={setProfesseurId} placeholder="Non assigné" />
              </div>
            </div>

            {/* Période + Date + Barème + Statut */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Période</label>
                <CustomSelect options={periodOpts} value={periode} onChange={setPeriode} placeholder="Période" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Date de l'épreuve</label>
                <CustomDatePicker value={dateEval} onChange={setDateEval} placeholder="Date" className="w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Barème (Max)</label>
                <NumberInput value={baremeMax} onChange={setBaremeMax} min={1} max={500} integer placeholder="Max"
                  className="w-full px-3.5 py-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Statut</label>
                <CustomSelect options={statutOpts} value={statut} onChange={v => setStatut(v as StatutEvaluation)} placeholder="Statut" />
              </div>
            </div>

            {/* Remarques */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Remarques / Instructions</label>
              <textarea value={remarques} onChange={e => setRemarques(e.target.value)} rows={2}
                placeholder="Instructions particulières, contexte de l'évaluation..."
                className="w-full px-3.5 py-2.5 rounded-lg border text-xs font-semibold resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            </div>

            {/* Tableau saisie cotes */}
            {classeId && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Saisie des Cotes — {classStudents.length} élève{classStudents.length !== 1 ? 's' : ''}
                  </h4>
                  {classStudents.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Moyenne :</span>
                      <span className="font-black" style={{ color: avgScore / baremeMax >= 0.5 ? '#10b981' : '#ef4444' }}>
                        {avgScore.toFixed(1)} / {baremeMax}
                      </span>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <div className="grid text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-2.5"
                    style={{ background: 'var(--bg-sunken)', gridTemplateColumns: '2rem 1fr 7rem 7rem 6rem' }}>
                    <span>#</span><span>Élève</span>
                    <span className="text-center">Matricule</span>
                    <span className="text-center">Cote / {baremeMax}</span>
                    <span className="text-center">Perf.</span>
                  </div>
                  {classStudents.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Aucun élève inscrit dans cette classe.</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {classStudents.map((st, idx) => {
                        const rawVal = scoreMap[st.id];
                        const numVal = rawVal === 'ABS' ? 0 : (typeof rawVal === 'number' ? rawVal : 0);
                        const isAbs  = rawVal === 'ABS';
                        const perf   = isAbs ? null : perfBadge(numVal, baremeMax);
                        const aColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        return (
                          <div key={st.id} className="grid items-center px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                            style={{ gridTemplateColumns: '2rem 1fr 7rem 7rem 6rem' }}>
                            <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                            <div className="flex items-center gap-2.5 min-w-0">
                              {st.photoUrl
                                ? <img src={st.photoUrl} alt={st.prenom} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                                : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ background: aColor }}>
                                    {(st.prenom[0]||'').toUpperCase()}{(st.nom[0]||'').toUpperCase()}
                                  </div>
                              }
                              <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{st.nom} {st.prenom}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 text-center">{st.registrationNumber || '—'}</span>
                            <div className="flex items-center gap-1.5 justify-center">
                              {!isAbs && (
                                <NumberInput value={numVal} onChange={v => setScoreMap(prev => ({ ...prev, [st.id]: v }))}
                                  min={0} max={baremeMax} id={`score-${st.id}`} placeholder="0"
                                  className="w-16 text-center px-2 py-1.5 rounded-lg border text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                  onKeyDown={(e: React.KeyboardEvent) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const next = classStudents[idx + 1];
                                      if (next) document.getElementById(`score-${next.id}`)?.focus();
                                    }
                                  }} />
                              )}
                              <button type="button" title={isAbs ? 'Marquer présent' : 'Marquer absent'}
                                onClick={() => setScoreMap(prev => ({ ...prev, [st.id]: isAbs ? 0 : 'ABS' }))}
                                className={`px-1.5 py-1.5 rounded-lg border text-[10px] font-black transition-all cursor-pointer ${isAbs ? 'bg-rose-500/15 text-rose-600 border-rose-500/30' : 'bg-slate-500/10 text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                {isAbs ? 'ABS' : <Minus className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="flex justify-center">
                              {isAbs
                                ? <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 border border-rose-500/30">Absent</span>
                                : perf ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${perf.cls}`}>{perf.label}</span>
                                : <span className="text-slate-300">—</span>
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-3 shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border text-xs font-black hover:bg-slate-500/10 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer">
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Enregistrement...' : initialEval ? 'Enregistrer les modifications' : "Créer l'évaluation"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────

type Tab = 'overview' | 'evaluations' | 'byclass' | 'analytics';

export const EvaluationsExamsManager: React.FC = () => {
  const [classes,  setClasses]  = useState<ClasseScolaire[]>([]);
  const [subjects, setSubjects] = useState<Discipline[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [teachers, setTeachers] = useState<MembrePersonnel[]>([]);
  const [allCotes, setAllCotes] = useState<Cote[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [activeTab,   setActiveTab]   = useState<Tab>('overview');
  const [showModal,   setShowModal]   = useState(false);
  const [editingEval, setEditingEval] = useState<EpreuveEnrichi | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);

  const [classFilter,   setClassFilter]   = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [periodFilter,  setPeriodFilter]  = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [statutFilter,  setStatutFilter]  = useState('');
  const [profFilter,    setProfFilter]    = useState('');
  const [search,        setSearch]        = useState('');
  const [byClassId,     setByClassId]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, subs, sts, stf, cots, userAssigned] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSubjects(),
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getStaff(),
        LocalDatabaseService.getCotes(),
        LocalDatabaseService.getCurrentUserAssignedClasses(),
      ]);

      let filteredCls = cls || [];
      let filteredSts = sts || [];

      if (userAssigned !== null) {
        // Enseignant / Titulaire : Ne garder que les classes & élèves assignés
        filteredCls = (cls || []).filter(c =>
          userAssigned.some(ac =>
            ac.toLowerCase().trim() === c.nom.toLowerCase().trim() ||
            c.nom.toLowerCase().includes(ac.toLowerCase().trim()) ||
            ac.toLowerCase().includes(c.nom.toLowerCase().trim())
          )
        );
        filteredSts = (sts || []).filter(s => {
          const sc = (s.nomClasse || (s as any).classe || (s as any).salle || '').toLowerCase().trim();
          return userAssigned.some(ac => {
            const acLower = ac.toLowerCase().trim();
            return sc === acLower || sc.includes(acLower) || acLower.includes(sc);
          });
        });
      }

      setClasses(filteredCls);
      setSubjects(subs || []);
      setStudents(filteredSts);
      setTeachers(stf || []);
      setAllCotes(cots || []);
    } catch (err) { console.error('[EvaluationsExamsManager] load error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const epreuves = useMemo(() => buildEpreuves(allCotes, classes, subjects, teachers), [allCotes, classes, subjects, teachers]);

  const filteredEpreuves = useMemo(() => epreuves.filter(ev => {
    if (classFilter   && ev.classeId    !== classFilter)   return false;
    if (subjectFilter && ev.matiereId   !== subjectFilter) return false;
    if (periodFilter  && ev.periode     !== periodFilter)  return false;
    if (typeFilter    && ev.type        !== typeFilter)    return false;
    if (statutFilter  && ev.statut      !== statutFilter)  return false;
    if (profFilter    && ev.professeurId !== profFilter)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!ev.titre.toLowerCase().includes(q) &&
          !ev.nomClasse.toLowerCase().includes(q) &&
          !ev.nomMatiere.toLowerCase().includes(q) &&
          !(ev.nomProfesseur || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [epreuves, classFilter, subjectFilter, periodFilter, typeFilter, statutFilter, profFilter, search]);

  const { paginated, ...pagination } = usePagination(filteredEpreuves, { defaultPageSize: 12 });

  const globalStats = useMemo(() => {
    const totalEvals   = epreuves.length;
    const totalCotes   = epreuves.reduce((a, e) => a + e.nbParticipants, 0);
    const avgPct       = epreuves.length > 0 ? Math.round(epreuves.reduce((a, e) => a + e.moyennePct, 0) / epreuves.length) : 0;
    const tauxReussite = epreuves.length > 0 ? Math.round(epreuves.reduce((a, e) => a + e.tauxReussite, 0) / epreuves.length) : 0;
    const byType    = EVAL_TYPES.map(t => ({ ...t, count: epreuves.filter(e => e.type === t.value).length })).filter(t => t.count > 0);
    const byPeriode = PERIODS.map(p => {
      const pe = epreuves.filter(e => e.periode === p.value);
      return { ...p, count: pe.length, avgPct: pe.length > 0 ? Math.round(pe.reduce((a, e) => a + e.moyennePct, 0) / pe.length) : 0 };
    }).filter(p => p.count > 0);
    return { totalEvals, totalCotes, avgPct, tauxReussite, byType, byPeriode };
  }, [epreuves]);

  const handleSave = async (data: Partial<EpreuveEnrichi> & { scoreMap: Record<string, number> }) => {
    setSaving(true);
    try {
      const evId = editingEval?.id || uuid();
      if (editingEval) {
        const existing = await LocalDatabaseService.getCotes({ evaluationId: evId });
        await Promise.all(existing.map(c => LocalDatabaseService.deleteCote(c.id)));
      }
      const cls = classes.find(c => c.id === data.classeId);
      const classStudents = students.filter(s => s.classId === data.classeId || (cls && s.nomClasse === cls.nom));
      const prof = teachers.find(t => t.id === data.professeurId);
      const toSave: any[] = classStudents.map(st => ({
        id: uuid(), evaluationId: evId, eleveId: st.id, anneeScolaireId: st.schoolYearId,
        matiereId: data.matiereId || '', classeId: data.classeId || '',
        periode: data.periode || '1ere Periode', type: data.type || 'INTERROGATION',
        score: Math.min(data.baremeMax || 10, Math.max(0, data.scoreMap[st.id] ?? 0)),
        maxScore: data.baremeMax || 10,
        dateCote: data.dateEvaluation || new Date().toISOString().split('T')[0],
        titre: data.titre || '', libelle: data.titre || '',
        professeurId: data.professeurId || '',
        nomProfesseur: prof ? `${prof.prenom} ${prof.nom}` : '',
        statut: data.statut || 'CORRIGEE',
        remarques: data.remarques || '',
      }));
      await Promise.all(toSave.map(c => LocalDatabaseService.addCote(c)));
      setShowModal(false); setEditingEval(null); await load();
    } catch (err) { console.error('[handleSave]', err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const cotes = await LocalDatabaseService.getCotes({ evaluationId: id });
    await Promise.all(cotes.map(c => LocalDatabaseService.deleteCote(c.id)));
    setDeleteId(null); await load();
  };

  const openCreate = () => { setEditingEval(null); setShowModal(true); };
  const openEdit   = (ev: EpreuveEnrichi) => { setEditingEval(ev); setShowModal(true); };

  const exportCSV = () => {
    let csv = 'Evaluation,Type,Classe,Matière,Période,Professeur,Date,Élève,Matricule,Score,Bareme,Pct\n';
    for (const ev of epreuves) {
      for (const c of ev.cotes) {
        const st  = students.find(s => s.id === c.eleveId);
        const pct = ev.baremeMax > 0 ? Math.round((c.score / ev.baremeMax) * 100) : 0;
        csv += `"${ev.titre}","${typeInfo(ev.type).label}","${ev.nomClasse}","${ev.nomMatiere}","${ev.periode}","${ev.nomProfesseur || '—'}","${ev.dateEvaluation}","${st ? `${st.nom} ${st.prenom}` : c.eleveId}","${st?.registrationNumber || ''}",${c.score},${ev.baremeMax},${pct}%\n`;
      }
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = `evaluations-ecolisa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const classOpts   = [{ value: '', label: 'Toutes les classes'   }, ...classes.map(c  => ({ value: c.id,    label: c.nom  }))];
  const subjectOpts = [{ value: '', label: 'Toutes les matières'  }, ...subjects.map(s => ({ value: s.id,    label: s.nom  }))];
  const periodOpts  = [{ value: '', label: 'Toutes les périodes'  }, ...PERIODS.map(p    => ({ value: p.value, label: p.label }))];
  const typeOpts    = [{ value: '', label: 'Tous les types'        }, ...EVAL_TYPES.map(t => ({ value: t.value, label: `${t.icon} ${t.label}` }))];
  const statutOpts  = [{ value: '', label: 'Tous les statuts'      }, ...STATUTS.map(s   => ({ value: s.value, label: s.label }))];
  const profOpts    = [{ value: '', label: 'Tous les professeurs'  }, ...teachers.map(t  => ({ value: t.id,    label: `${t.prenom} ${t.nom}` }))];

  const byClassEpreuves = useMemo(() => byClassId ? epreuves.filter(e => e.classeId === byClassId) : [], [epreuves, byClassId]);
  const byClassStudents = useMemo(() => {
    if (!byClassId) return [];
    const cls = classes.find(c => c.id === byClassId);
    return students
      .filter(s => s.classId === byClassId || (cls && s.nomClasse === cls.nom))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [byClassId, students, classes]);

  const TABS: { id: Tab; label: string; icon: React.FC<any> }[] = [
    { id: 'overview',    label: "Vue d'ensemble", icon: BarChart3      },
    { id: 'evaluations', label: 'Évaluations',    icon: ClipboardList  },
    { id: 'byclass',     label: 'Par Classe',      icon: GraduationCap },
    { id: 'analytics',   label: 'Analyses',        icon: TrendingUp     },
  ];

  const clearFilters = () => {
    setClassFilter(''); setSubjectFilter(''); setPeriodFilter('');
    setTypeFilter('');  setStatutFilter('');  setProfFilter(''); setSearch('');
  };
  const hasFilters = !!(classFilter || subjectFilter || periodFilter || typeFilter || statutFilter || profFilter || search);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">

      {/* ═══ HEADER ═══ */}
      <div className="p-5 rounded-2xl border-0 shadow-md" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Évaluations & Examens</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">EPST RDC · Interrogations, Devoirs, Examens & Travaux Pratiques</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={exportCSV}
              className="px-3.5 py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 hover:bg-slate-500/10 transition-all cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <Download className="w-3.5 h-3.5" /> Exporter CSV
            </button>
            <button onClick={openCreate}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white text-xs font-black shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all cursor-pointer">
              <Plus className="w-4 h-4" /> Nouvelle Évaluation
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/40">
          {[
            { label: 'Évaluations créées', val: globalStats.totalEvals,         color: '#6366f1', icon: ClipboardList, sub: `${classes.length} classe(s)` },
            { label: 'Cotes saisies',       val: globalStats.totalCotes,         color: '#10b981', icon: FileText,      sub: `${students.length} élèves` },
            { label: 'Moyenne générale',    val: `${globalStats.avgPct}%`,       color: '#f59e0b', icon: TrendingUp,    sub: 'Sur toutes périodes' },
            { label: 'Taux de réussite',    val: `${globalStats.tauxReussite}%`, color: '#8b5cf6', icon: CheckCircle2,  sub: 'Score ≥ 50%' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl hover:shadow-md transition-all" style={{ background: 'var(--bg-sunken)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ONGLETS NAV ═══ */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl border shadow-xs overflow-x-auto"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer
                ${isActive ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                           : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-500/10'}`}>
              <Icon className="w-3.5 h-3.5" /><span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ ONGLET 1 — VUE D'ENSEMBLE ═══ */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-fade-in">
          {loading ? <LoadingBlock /> : epreuves.length === 0 ? (
            <EmptyStateBlock icon={ClipboardList} title="Aucune évaluation encore créée"
              desc="Commencez par créer la première évaluation de votre établissement."
              action={
                <button onClick={openCreate} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md inline-flex items-center gap-2 cursor-pointer">
                  <Plus className="w-4 h-4" /> Créer la première évaluation
                </button>
              }
            />
          ) : (
            <>
              {/* Par type */}
              <div className="p-5 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Layers className="w-4 h-4 text-indigo-500" /> Répartition par Type d'Évaluation
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {globalStats.byType.map(t => (
                    <div key={t.value} className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: `${t.color}20` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{t.icon}</span>
                        <span className="text-xl font-black" style={{ color: t.color }}>{t.count}</span>
                      </div>
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                      <ScoreBar pct={(t.count / Math.max(1, globalStats.totalEvals)) * 100} color={t.color} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Par période */}
              <div className="p-5 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Calendar className="w-4 h-4 text-indigo-500" /> Progression par Période Scolaire
                </h3>
                {globalStats.byPeriode.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {globalStats.byPeriode.map(p => (
                      <div key={p.value} className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-500 w-44 shrink-0 truncate">{p.label}</span>
                        <div className="flex-1"><ScoreBar pct={p.avgPct} color={p.avgPct >= 50 ? '#10b981' : '#ef4444'} /></div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-black" style={{ color: p.avgPct >= 50 ? '#10b981' : '#ef4444' }}>{p.avgPct}%</span>
                          <span className="text-[10px] text-slate-400">({p.count} éval.)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Récentes */}
              <div className="p-5 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Clock className="w-4 h-4 text-indigo-500" /> Évaluations Récentes
                  </h3>
                  <button onClick={() => setActiveTab('evaluations')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer">
                    Voir tout <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {epreuves.slice(0, 5).map(ev => {
                    const info = typeInfo(ev.type);
                    return (
                      <div key={ev.id} className="flex items-center justify-between p-3 rounded-xl hover:shadow-xs transition-all" style={{ background: 'var(--bg-sunken)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: `${info.color}15` }}>
                            {info.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{ev.titre}</p>
                            <p className="text-[10.5px] text-slate-400">{ev.nomClasse} · {ev.nomMatiere} · {ev.periode}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-black" style={{ color: ev.moyennePct >= 50 ? '#10b981' : '#ef4444' }}>{ev.moyennePct}%</span>
                          <StatutPill statut={ev.statut} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ ONGLET 2 — ÉVALUATIONS ═══ */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filtres */}
          <div className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <CustomSelect options={classOpts}   value={classFilter}   onChange={setClassFilter}   placeholder="Filtrer par classe"  />
              <CustomSelect options={subjectOpts} value={subjectFilter} onChange={setSubjectFilter} placeholder="Filtrer par matière" />
              <CustomSelect options={periodOpts}  value={periodFilter}  onChange={setPeriodFilter}  placeholder="Filtrer par période" />
              <CustomSelect options={typeOpts}    value={typeFilter}    onChange={setTypeFilter}    placeholder="Filtrer par type"    />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CustomSelect options={statutOpts} value={statutFilter} onChange={setStatutFilter} placeholder="Filtrer par statut"     />
              <CustomSelect options={profOpts}   value={profFilter}   onChange={setProfFilter}   placeholder="Filtrer par professeur" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher titre, classe, matière..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-semibold text-slate-400">
                {filteredEpreuves.length} évaluation{filteredEpreuves.length !== 1 ? 's' : ''} trouvée{filteredEpreuves.length !== 1 ? 's' : ''}
              </span>
              {hasFilters && (
                <button onClick={clearFilters} className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer">
                  <X className="w-3 h-3" /> Effacer les filtres
                </button>
              )}
            </div>
          </div>

          {/* Liste */}
          {loading ? <LoadingBlock /> : filteredEpreuves.length === 0 ? (
            <EmptyStateBlock icon={FileText} title="Aucune évaluation"
              desc="Créez la première ou modifiez vos filtres."
              action={
                <button onClick={openCreate} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md inline-flex items-center gap-2 cursor-pointer hover:bg-indigo-700">
                  <Plus className="w-4 h-4" /> Nouvelle évaluation
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {paginated.map(ev => {
                const info = typeInfo(ev.type);
                const perfColor = ev.moyennePct >= 70 ? '#10b981' : ev.moyennePct >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={ev.id} className="p-4 rounded-2xl border hover:border-indigo-500/30 hover:shadow-md transition-all duration-200"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ background: `${info.color}12` }}>{info.icon}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{ev.titre}</h3>
                            <TypeBadge type={ev.type} size="sm" />
                            <StatutPill statut={ev.statut} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-indigo-400" />{ev.nomClasse}</span>
                            <span className="flex items-center gap-1"><Target className="w-3 h-3 text-violet-400" />{ev.nomMatiere}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-sky-400" />{ev.periode}</span>
                            {ev.nomProfesseur && <span className="flex items-center gap-1"><User className="w-3 h-3 text-emerald-400" />{ev.nomProfesseur}</span>}
                            {ev.dateEvaluation && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" />{ev.dateEvaluation}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-slate-400">Participants</p>
                          <p className="text-sm font-black flex items-center gap-1 justify-end" style={{ color: 'var(--text-primary)' }}>
                            <Users className="w-3.5 h-3.5 text-indigo-400" />{ev.nbParticipants}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-slate-400">Moyenne</p>
                          <p className="text-sm font-black" style={{ color: perfColor }}>
                            {ev.moyenne.toFixed(1)}<span className="text-[10px] text-slate-400 font-medium">/{ev.baremeMax}</span>
                          </p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-black uppercase text-slate-400">Réussite</p>
                          <p className="text-sm font-black" style={{ color: ev.tauxReussite >= 50 ? '#10b981' : '#ef4444' }}>{ev.tauxReussite}%</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(ev)} className="p-2 rounded-xl text-indigo-500 hover:bg-indigo-500/10 active:scale-[0.95] transition-all cursor-pointer" title="Modifier">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(ev.id)} className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 active:scale-[0.95] transition-all cursor-pointer" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <ScoreBar pct={ev.moyennePct} color={perfColor} />
                        <span className="text-[11px] font-black shrink-0" style={{ color: perfColor }}>{ev.moyennePct}%</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{ev.nbReussi} réussi / {ev.nbEchoue} insuffisant</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && filteredEpreuves.length > 0 && (
                <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} total={pagination.total}
                  pageSize={pagination.pageSize} start={pagination.start} end={pagination.end}
                  onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ ONGLET 3 — PAR CLASSE ═══ */}
      {activeTab === 'byclass' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-xs">
                <CustomSelect
                  options={[{ value: '', label: 'Sélectionner une classe...' }, ...classes.map(c => ({ value: c.id, label: c.nom }))]}
                  value={byClassId} onChange={setByClassId} placeholder="Choisir une classe" />
              </div>
              {byClassId && (
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="font-bold"><span className="text-indigo-500">{byClassEpreuves.length}</span> évaluations</span>
                  <span className="font-bold"><span className="text-emerald-500">{byClassStudents.length}</span> élèves</span>
                </div>
              )}
            </div>
          </div>

          {!byClassId ? (
            <EmptyStateBlock icon={GraduationCap} title="Sélectionnez une classe" desc="Visualisez toutes les évaluations et performances des élèves." />
          ) : byClassEpreuves.length === 0 ? (
            <EmptyStateBlock icon={ClipboardList} title="Aucune évaluation pour cette classe"
              action={
                <button onClick={openCreate} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer hover:bg-indigo-700">
                  <Plus className="w-3.5 h-3.5" /> Créer une évaluation
                </button>
              }
            />
          ) : (
            <div className="modern-table-container rounded-2xl border shadow-xs overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="overflow-x-auto">
                <table className="modern-table w-full">
                  <thead>
                    <tr className="table-sticky-header">
                      <th className="text-left font-black sticky left-0 z-10"
                        style={{ minWidth: '180px' }}>Élève & Matricule</th>
                      {byClassEpreuves.map(ev => (
                        <th key={ev.id} className="text-center font-black"
                          style={{ minWidth: '90px' }}>
                          <div className="flex flex-col items-center gap-1">
                            <TypeBadge type={ev.type} size="sm" />
                            <span className="text-[10px] text-slate-400 max-w-[80px] truncate">{ev.nomMatiere}</span>
                            <span className="text-[10px] font-mono text-slate-400">/{ev.baremeMax}</span>
                          </div>
                        </th>
                      ))}
                      <th className="text-center font-black" style={{ minWidth: '80px' }}>Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byClassStudents.map((st, idx) => {
                      const scores = byClassEpreuves.map(ev => {
                        const cote = ev.cotes.find(c => c.eleveId === st.id);
                        return cote ? { score: cote.score, max: ev.baremeMax } : null;
                      });
                      const valid  = scores.filter((s): s is { score: number; max: number } => s !== null);
                      const avgRaw = valid.length > 0 ? valid.reduce((a, s) => a + (s.score / s.max), 0) / valid.length * 100 : 0;
                      const avgColor = avgRaw >= 70 ? '#10b981' : avgRaw >= 50 ? '#f59e0b' : '#ef4444';
                      const aColor   = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                      return (
                        <tr key={st.id} className="group">
                          <td className="sticky left-0 z-10" style={{ background: 'var(--bg-surface)' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-xs"
                                style={{ background: aColor }}>
                                {(st.prenom[0] || '').toUpperCase()}{(st.nom[0] || '').toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-xs truncate max-w-[144px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" style={{ color: 'var(--text-primary)' }}>{st.nom} {st.prenom}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{st.registrationNumber}</p>
                              </div>
                            </div>
                          </td>
                          {scores.map((s, i) => {
                            if (!s) return <td key={i} className="text-center text-slate-300 dark:text-slate-600 font-mono">—</td>;
                            const pct  = s.max > 0 ? (s.score / s.max) * 100 : 0;
                            const perf = perfBadge(s.score, s.max);
                            return (
                              <td key={i} className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-black text-xs" style={{ color: pct >= 50 ? '#10b981' : '#ef4444' }}>{s.score}</span>
                                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${perf.cls}`}>{perf.label}</span>
                                </div>
                              </td>
                            );
                          })}
                          <td className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-black" style={{ color: avgColor }}>{Math.round(avgRaw)}%</span>
                              <ScoreBar pct={avgRaw} color={avgColor} />
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

      {/* ═══ ONGLET 4 — ANALYSES ═══ */}
      {activeTab === 'analytics' && (
        <div className="space-y-5 animate-fade-in">
          {epreuves.length === 0 ? (
            <EmptyStateBlock icon={BarChart3} title="Pas encore de données analytiques"
              desc="Créez des évaluations et saisissez des cotes pour voir les analyses." />
          ) : (
            <>
              {/* Performances par classe */}
              <div className="p-5 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <GraduationCap className="w-4 h-4 text-indigo-500" /> Performances par Classe
                </h3>
                <div className="space-y-3">
                  {classes.map(cls => {
                    const ce  = epreuves.filter(e => e.classeId === cls.id);
                    const avg = ce.length > 0 ? Math.round(ce.reduce((a, e) => a + e.moyennePct, 0) / ce.length) : 0;
                    if (ce.length === 0) return null;
                    return (
                      <div key={cls.id} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-48 shrink-0">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0"
                            style={{ background: avg >= 70 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444' }}>
                            {avg >= 70 ? '🏆' : avg >= 50 ? '✅' : '⚠️'}
                          </div>
                          <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{cls.nom}</span>
                        </div>
                        <div className="flex-1"><ScoreBar pct={avg} color={avg >= 70 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444'} /></div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-black" style={{ color: avg >= 70 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444' }}>{avg}%</span>
                          <span className="text-[10px] text-slate-400">({ce.length} éval.)</span>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>

              {/* Top / Flop Matières */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { title: '🏆 Meilleures Matières',  top: true  },
                  { title: '⚠️ Matières à Renforcer', top: false },
                ].map(({ title, top }) => {
                  const bySubject = subjects
                    .map(s => {
                      const evals = epreuves.filter(e => e.matiereId === s.id);
                      const avg   = evals.length > 0 ? Math.round(evals.reduce((a, e) => a + e.moyennePct, 0) / evals.length) : 0;
                      return { subj: s, avg, count: evals.length };
                    })
                    .filter(x => x.count > 0)
                    .sort((a, b) => top ? b.avg - a.avg : a.avg - b.avg)
                    .slice(0, 5);
                  return (
                    <div key={title} className="p-5 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                      <h3 className="text-sm font-black mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                      <div className="space-y-2.5">
                        {bySubject.length === 0 ? <p className="text-xs text-slate-400 text-center py-3">Aucune donnée</p> :
                          bySubject.map(({ subj, avg }, rank) => (
                            <div key={subj.id} className="flex items-center gap-3">
                              <span className="text-[11px] font-black text-slate-400 w-5 shrink-0">#{rank + 1}</span>
                              <span className="text-[11px] font-bold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{subj.nom}</span>
                              <ScoreBar pct={avg} color={top ? '#10b981' : '#ef4444'} />
                              <span className="text-[11px] font-black shrink-0" style={{ color: top ? '#10b981' : '#ef4444' }}>{avg}%</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Distribution */}
              <div className="p-5 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <BarChart3 className="w-4 h-4 text-indigo-500" /> Distribution des Performances
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Excellent (≥80%)',  min: 80, max: 100, color: '#10b981', bg: 'bg-emerald-500/10' },
                    { label: 'Bien (60-79%)',      min: 60, max: 79,  color: '#6366f1', bg: 'bg-indigo-500/10'  },
                    { label: 'Passable (50-59%)',  min: 50, max: 59,  color: '#f59e0b', bg: 'bg-amber-500/10'   },
                    { label: 'Insuffisant (<50%)', min: 0,  max: 49,  color: '#ef4444', bg: 'bg-rose-500/10'    },
                  ].map(range => {
                    const count = epreuves.filter(e => e.moyennePct >= range.min && e.moyennePct <= range.max).length;
                    const pct   = epreuves.length > 0 ? Math.round((count / epreuves.length) * 100) : 0;
                    return (
                      <div key={range.label} className={`p-4 rounded-xl ${range.bg} border`} style={{ borderColor: `${range.color}20` }}>
                        <p className="text-2xl font-black" style={{ color: range.color }}>{count}</p>
                        <p className="text-[11px] font-bold mt-1 mb-2" style={{ color: 'var(--text-primary)' }}>{range.label}</p>
                        <ScoreBar pct={pct} color={range.color} />
                        <p className="text-[10px] text-slate-400 mt-1">{pct}% des évaluations</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ MODAL CRÉATION/ÉDITION ═══ */}
      <EvalModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingEval(null); }}
        onSave={handleSave}
        initialEval={editingEval}
        classes={classes} subjects={subjects} teachers={teachers} students={students}
        saving={saving}
      />

      {/* ═══ CONFIRMATION SUPPRESSION ═══ */}
      {deleteId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/15 text-rose-500"><AlertCircle className="w-5 h-5" /></div>
              <div>
                <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Supprimer l'évaluation ?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Toutes les cotes associées seront supprimées définitivement.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2.5 rounded-xl border text-xs font-black hover:bg-slate-500/10 transition-all cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteId!)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Supprimer définitivement
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
