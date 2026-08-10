import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, Calendar, Download, Edit3, GraduationCap, Plus, Save, Search, Trash2, Users, X, TrendingUp, FileText } from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { Cote, ClasseScolaire, Discipline, Eleve, TypeEvaluation } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { NumberInput } from '../common/NumberInput';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const EVAL_TYPES: { value: TypeEvaluation; label: string; color: string }[] = [
  { value: 'INTERROGATION', label: 'Interrogation', color: '#6366f1' },
  { value: 'DEVOIR', label: 'Devoir', color: '#8b5cf6' },
  { value: 'EXERCICE_CONTROLE', label: 'Exercice de contrôle', color: '#10b981' },
  { value: 'EXAMEN', label: 'Examen', color: '#f59e0b' },
  { value: 'EXAMEN_BLANC', label: 'Examen blanc', color: '#ef4444' },
  { value: 'PRATIQUE', label: 'Pratique', color: '#06b6d4' },
  { value: 'PROJET', label: 'Projet', color: '#ec4899' },
  { value: 'COMPOSITION', label: 'Composition', color: '#84cc16' },
];

const PERIODS = [
  '1ère Période',
  '2ème Période',
  '3ème Période',
  '4ème Période',
  '5ème Période',
  '6ème Période',
  'Examen 1er Semestre',
  'Examen 2ème Semestre',
  'Examen d\'État',
];

const typeLabel = (t: TypeEvaluation) => EVAL_TYPES.find(e => e.value === t)?.label || t;
const typeColor = (t: TypeEvaluation) => EVAL_TYPES.find(e => e.value === t)?.color || '#6366f1';

export const EvaluationsExamsManager: React.FC = () => {
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [subjects, setSubjects] = useState<Discipline[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [allCotes, setAllCotes] = useState<Cote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeEvaluation | ''>('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<string | null>(null);

  useEffect(() => {
    if (!showModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showModal]);

  const [form, setForm] = useState({
    titre: '',
    type: 'INTERROGATION' as TypeEvaluation,
    periode: '1ère Période',
    classeId: '',
    matiereId: '',
    dateCote: new Date().toISOString().split('T')[0],
    maxScore: 10,
  });

  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const [cls, subs, allSt, cots] = await Promise.all([
      LocalDatabaseService.getClasses(),
      LocalDatabaseService.getSubjects(),
      LocalDatabaseService.getEleves(),
      LocalDatabaseService.getCotes(),
    ]);
    setClasses(cls);
    setSubjects(subs);
    setStudents(allSt);
    setAllCotes(cots);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const classStudents = useMemo(() => {
    if (!form.classeId) return [];
    const cls = classes.find(c => c.id === form.classeId);
    return students.filter(e => e.classId === form.classeId || (cls && e.nomClasse === cls.nom));
  }, [form.classeId, students, classes]);

  const evaluations = useMemo(() => {
    const groups = new Map<string, { evId: string; titre: string; type: TypeEvaluation; periode: string; classeId: string; matiereId: string; dateCote: string; maxScore: number; cotes: Cote[] }>();
    for (const c of allCotes) {
      const evId = c.evaluationId || `ev-${c.titre || c.type}-${c.classeId}-${c.matiereId}-${c.periode}-${c.dateCote}`;
      let g = groups.get(evId);
      if (!g) {
        g = {
          evId,
          titre: c.titre || typeLabel(c.type),
          type: c.type,
          periode: c.periode,
          classeId: c.classeId || '',
          matiereId: c.matiereId || '',
          dateCote: c.dateCote || '',
          maxScore: c.maxScore,
          cotes: [],
        };
        groups.set(evId, g);
      }
      g.cotes.push(c);
    }
    const arr = Array.from(groups.values());
    return arr.filter(ev => {
      if (classFilter && ev.classeId !== classFilter) return false;
      if (subjectFilter && ev.matiereId !== subjectFilter) return false;
      if (periodFilter && ev.periode !== periodFilter) return false;
      if (typeFilter && ev.type !== typeFilter) return false;
      if (search && !ev.titre.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (b.dateCote || '').localeCompare(a.dateCote || ''));
  }, [allCotes, classFilter, subjectFilter, periodFilter, typeFilter, search]);

  const { paginated: paginatedEvaluations, ...evaluationsPagination } = usePagination(evaluations, { defaultPageSize: 10 });

  const stats = useMemo(() => {
    const totalEvals = evaluations.length;
    const totalCotes = evaluations.reduce((a, ev) => a + ev.cotes.length, 0);
    const avgScore = totalCotes > 0 ? evaluations.reduce((a, ev) => a + ev.cotes.reduce((b, c) => b + (c.score || 0), 0), 0) / totalCotes : 0;
    const maxTotal = totalCotes > 0 ? evaluations.reduce((a, ev) => a + ev.cotes.reduce((b, c) => b + (c.maxScore || 0), 0), 0) : 1;
    return { totalEvals, totalCotes, avgPct: maxTotal > 0 ? Math.round((avgScore / maxTotal) * 100) : 0 };
  }, [evaluations]);

  const openCreate = () => {
    setEditingEvaluation(null);
    setForm({
      titre: '',
      type: 'INTERROGATION',
      periode: '1ère Période',
      classeId: classes[0]?.id || '',
      matiereId: subjects[0]?.id || '',
      dateCote: new Date().toISOString().split('T')[0],
      maxScore: 10,
    });
    setScoreMap({});
    setShowModal(true);
  };

  const openEdit = async (evId: string) => {
    setEditingEvaluation(evId);
    const ev = evaluations.find(e => e.evId === evId);
    if (!ev) return;
    const cotes = await LocalDatabaseService.getCotes({ evaluationId: evId });
    setForm({
      titre: ev.titre,
      type: ev.type,
      periode: ev.periode,
      classeId: ev.classeId,
      matiereId: ev.matiereId,
      dateCote: ev.dateCote || new Date().toISOString().split('T')[0],
      maxScore: ev.maxScore,
    });
    const scMap: Record<string, number> = {};
    for (const c of cotes) scMap[c.eleveId] = c.score;
    setScoreMap(scMap);
    setShowModal(true);
  };

  const handleDelete = async (evId: string) => {
    if (!window.confirm('Supprimer cette évaluation et toutes ses cotes ?')) return;
    const cotes = await LocalDatabaseService.getCotes({ evaluationId: evId });
    await Promise.all(cotes.map(c => LocalDatabaseService.deleteCote(c.id)));
    load();
  };

  const computeMaxScore = (type: TypeEvaluation, matiereId: string) => {
    const subject = subjects.find(s => s.id === matiereId);
    if (!subject) return 10;
    if (type === 'EXAMEN' || type === 'EXAMEN_BLANC' || type === 'COMPOSITION') {
      return subject.maxExamen || subject.maxScore * 2;
    }
    return subject.maxScore;
  };

  const handleSave = async () => {
    if (!form.titre.trim()) return alert('Veuillez saisir un titre pour l\'évaluation.');
    if (!form.classeId || !form.matiereId) return alert('Veuillez sélectionner une classe et une matière.');
    setSaving(true);
    const evId = editingEvaluation || uuid();
    if (editingEvaluation) {
      const existing = await LocalDatabaseService.getCotes({ evaluationId: evId });
      await Promise.all(existing.map(c => LocalDatabaseService.deleteCote(c.id)));
    }
    const maxScore = form.maxScore || computeMaxScore(form.type, form.matiereId);
    const toSave = classStudents.map(st => {
      const score = scoreMap[st.id] ?? 0;
      return {
        id: uuid(),
        evaluationId: evId,
        eleveId: st.id,
        anneeScolaireId: st.schoolYearId,
        matiereId: form.matiereId,
        classeId: form.classeId,
        periode: form.periode,
        type: form.type,
        score: Math.min(maxScore, Math.max(0, Number(score) || 0)),
        maxScore,
        dateCote: form.dateCote,
        titre: form.titre.trim(),
        libelle: form.titre.trim(),
      } as Cote;
    });
    await Promise.all(toSave.map(c => LocalDatabaseService.addCote(c)));
    setSaving(false);
    setShowModal(false);
    setEditingEvaluation(null);
    load();
  };

  const handleScoreChange = (studentId: string, value: number) => {
    setScoreMap(prev => ({ ...prev, [studentId]: Math.max(0, value) }));
  };

  const exportCSV = () => {
    let csv = 'Evaluation,Type,Classe,Matiere,Periode,Date,Eleve,Score,Max\n';
    for (const ev of evaluations) {
      const clsName = classes.find(c => c.id === ev.classeId)?.nom || ev.classeId;
      const subjName = subjects.find(s => s.id === ev.matiereId)?.nom || ev.matiereId;
      for (const c of ev.cotes) {
        const st = students.find(s => s.id === c.eleveId);
        csv += `${ev.titre},${typeLabel(ev.type)},${clsName},${subjName},${ev.periode},${ev.dateCote},${st ? `${st.nom} ${st.prenom}` : c.eleveId},${c.score},${c.maxScore}\n`;
      }
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const classOptions = useMemo(() => classes.map(c => ({ value: c.id, label: `${c.nom} (${c.options?.join(', ') || 'EPST'})` })), [classes]);
  const subjectOptions = useMemo(() => subjects.map(s => ({ value: s.id, label: `${s.nom} (${s.code} - Max ${s.maxScore})` })), [subjects]);
  const periodOptions = useMemo(() => PERIODS.map(p => ({ value: p, label: p })), []);
  const typeOptions = useMemo(() => [{ value: '', label: 'Tous les types' }, ...EVAL_TYPES.map(t => ({ value: t.value, label: t.label }))], []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Évaluations & Examens</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Gérez les interrogations, devoirs, exercices de contrôle et examens par classe.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2.5 rounded-xl border hover:bg-slate-500/10 font-black text-xs flex items-center gap-2 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Download className="w-4 h-4" /> Exporter
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nouvelle évaluation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Évaluations', val: stats.totalEvals, color: '#6366f1', icon: Award },
          { label: 'Cotes saisies', val: stats.totalCotes, color: '#10b981', icon: FileText },
          { label: 'Classes', val: classes.length, color: '#8b5cf6', icon: GraduationCap },
          { label: 'Moyenne générale', val: `${stats.avgPct}%`, color: '#f59e0b', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400">{s.label}</span>
            </div>
            <p className="text-[18px] font-black" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <CustomSelect options={[{ value: '', label: 'Toutes les classes' }, ...classOptions]} value={classFilter} onChange={setClassFilter} placeholder="Classe" />
          <CustomSelect options={[{ value: '', label: 'Toutes les matières' }, ...subjectOptions]} value={subjectFilter} onChange={setSubjectFilter} placeholder="Matière" />
          <CustomSelect options={[{ value: '', label: 'Toutes les périodes' }, ...periodOptions]} value={periodFilter} onChange={setPeriodFilter} placeholder="Période" />
          <CustomSelect options={typeOptions} value={typeFilter} onChange={val => setTypeFilter(val as TypeEvaluation | '')} placeholder="Type" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="input-field w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm font-bold text-slate-400">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {paginatedEvaluations.map(ev => {
            const cls = classes.find(c => c.id === ev.classeId);
            const subj = subjects.find(s => s.id === ev.matiereId);
            const avg = ev.cotes.length > 0 ? ev.cotes.reduce((a, c) => a + (c.score || 0), 0) / ev.cotes.length : 0;
            const avgPct = ev.maxScore > 0 ? Math.round((avg / ev.maxScore) * 100) : 0;
            const color = typeColor(ev.type);
            return (
              <div key={ev.evId} className="p-4 rounded-2xl border shadow-sm hover:border-indigo-500/30 transition-all" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl" style={{ background: `${color}15` }}>
                      <Award className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{ev.titre}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border" style={{ borderColor: `${color}30`, color, background: `${color}10` }}>{typeLabel(ev.type)}</span>
                        <span className="text-[11px] text-slate-400">{cls?.nom || 'Classe inconnue'} • {subj?.nom || 'Matière inconnue'} • {ev.periode}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {ev.dateCote || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400">Moyenne</p>
                      <p className="text-sm font-black" style={{ color }}>{avg.toFixed(1)} / {ev.maxScore} ({avgPct}%)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400">Participants</p>
                      <p className="text-sm font-black flex items-center gap-1 justify-end"><Users className="w-3.5 h-3.5" /> {ev.cotes.length}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(ev.evId)} className="p-2 rounded-xl hover:bg-indigo-50 text-indigo-500 transition-all"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(ev.evId)} className="p-2 rounded-xl hover:bg-rose-50 text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {evaluations.length === 0 && !loading && (
            <div className="text-center py-10 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-bold text-slate-400">Aucune évaluation. Créez la première avec le bouton ci-dessus.</p>
            </div>
          )}
          {!loading && evaluations.length > 0 && (
            <Pagination
              currentPage={evaluationsPagination.page}
              totalPages={evaluationsPagination.totalPages}
              total={evaluationsPagination.total}
              pageSize={evaluationsPagination.pageSize}
              start={evaluationsPagination.start}
              end={evaluationsPagination.end}
              onPageChange={evaluationsPagination.setPage}
              onPageSizeChange={evaluationsPagination.setPageSize}
            />
          )}
        </div>
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditingEvaluation(null); }}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black">{editingEvaluation ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}</h3>
              </div>
              <button onClick={() => { setShowModal(false); setEditingEvaluation(null); }} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-500 transition-all"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <input
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                placeholder="Titre de l'évaluation"
                className="input-field text-xs font-bold"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
              <CustomSelect options={EVAL_TYPES.map(t => ({ value: t.value, label: t.label }))} value={form.type} onChange={val => setForm({ ...form, type: val as TypeEvaluation })} />
              <CustomSelect options={classOptions} value={form.classeId} onChange={val => setForm({ ...form, classeId: val })} placeholder="Classe" />
              <CustomSelect options={subjectOptions} value={form.matiereId} onChange={val => setForm({ ...form, matiereId: val })} placeholder="Matière" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <CustomSelect options={periodOptions} value={form.periode} onChange={val => setForm({ ...form, periode: val })} placeholder="Période" />
              <CustomDatePicker value={form.dateCote} onChange={dateStr => setForm({ ...form, dateCote: dateStr })} placeholder="Date" className="w-full" />
              <NumberInput
                value={form.maxScore}
                onChange={v => setForm({ ...form, maxScore: v })}
                min={1}
                placeholder="Barème (max)"
                className="input-field text-xs font-bold"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-xs">
                <thead style={{ background: 'var(--bg-sunken)' }}>
                  <tr>
                    <th className="text-left p-3 font-black">Élève</th>
                    <th className="text-left p-3 font-black">Matricule</th>
                    <th className="text-right p-3 font-black w-40">Cote / {form.maxScore || 0}</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(st => (
                    <tr key={st.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="p-3 font-bold">{st.nom} {st.prenom}</td>
                      <td className="p-3 text-slate-400 font-mono">{st.registrationNumber}</td>
                      <td className="p-3 text-right">
                        <NumberInput
                          value={scoreMap[st.id] ?? 0}
                          onChange={v => handleScoreChange(st.id, v)}
                          min={0}
                          max={form.maxScore}
                          placeholder="0"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const idx = classStudents.findIndex(s => s.id === st.id);
                              const next = classStudents[idx + 1];
                              const el = next ? document.getElementById(`score-input-${next.id}`) : null;
                              if (el) (el as HTMLInputElement).focus();
                            }
                          }}
                          id={`score-input-${st.id}`}
                          className="w-24 text-right px-3 py-1.5 rounded-lg border font-bold outline-none"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </td>
                    </tr>
                  ))}
                  {classStudents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-400">Aucun élève dans cette classe.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowModal(false); setEditingEvaluation(null); }}
                className="px-4 py-2.5 rounded-xl border hover:bg-slate-500/10 font-black text-xs transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} /> {saving ? 'Enregistrement...' : 'Enregistrer les cotes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
