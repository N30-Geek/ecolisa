import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Shield, Search, RefreshCw, Download, Filter,
  LogIn, LogOut, Plus, Pencil, Trash2, CreditCard,
  FileText, Printer, Eye, Loader2, ChevronDown,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { AuditLogEntry } from '../../types';

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  CONNEXION:     { icon: LogIn,     color: 'text-emerald-600', bg: 'bg-emerald-500/10',  label: 'Connexion' },
  DECONNEXION:   { icon: LogOut,    color: 'text-slate-500',   bg: 'bg-slate-500/10',    label: 'Déconnexion' },
  CREATION:      { icon: Plus,      color: 'text-indigo-600',  bg: 'bg-indigo-500/10',   label: 'Création' },
  MODIFICATION:  { icon: Pencil,    color: 'text-amber-600',   bg: 'bg-amber-500/10',    label: 'Modification' },
  SUPPRESSION:   { icon: Trash2,    color: 'text-rose-600',    bg: 'bg-rose-500/10',     label: 'Suppression' },
  PAIEMENT:      { icon: CreditCard,color: 'text-violet-600',  bg: 'bg-violet-500/10',   label: 'Paiement' },
  EXPORT:        { icon: Download,  color: 'text-cyan-600',    bg: 'bg-cyan-500/10',     label: 'Export' },
  IMPRESSION:    { icon: Printer,   color: 'text-blue-600',    bg: 'bg-blue-500/10',     label: 'Impression' },
  CONSULTATION:  { icon: Eye,       color: 'text-sky-600',     bg: 'bg-sky-500/10',      label: 'Consultation' },
};

const MODULE_COLORS: Record<string, string> = {
  FINANCE:    'text-emerald-600 bg-emerald-500/10',
  ELEVES:     'text-indigo-600 bg-indigo-500/10',
  FRAIS:      'text-violet-600 bg-violet-500/10',
  USERS:      'text-rose-600 bg-rose-500/10',
  CLASSES:    'text-cyan-600 bg-cyan-500/10',
  PERSONNEL:  'text-amber-600 bg-amber-500/10',
  ACADEMIQUE: 'text-sky-600 bg-sky-500/10',
  SYSTEME:    'text-slate-600 bg-slate-500/10',
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  } catch {
    return { date: '—', time: '—' };
  }
};

const exportCSV = (entries: AuditLogEntry[]) => {
  const headers = ['Date', 'Heure', 'Utilisateur', 'Rôle', 'Action', 'Module', 'Entité', 'Entité ID', 'Détails'];
  const rows = entries.map(e => {
    const t = formatTime(e.createdAt);
    return [
      t.date, t.time,
      e.userNom || '—', e.userRole || '—',
      e.action, e.module || '—',
      e.entite || '—', e.entiteId || '—',
      JSON.stringify(e.details || {}),
    ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(';');
  });
  const csv = [headers.join(';'), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal_audit_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const AuditLogViewer: React.FC = () => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const data = await LocalDatabaseService.getAuditLog({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setEntries(data);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const actionOptions = [
    { value: 'ALL', label: 'Toutes les actions' },
    ...Object.entries(ACTION_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
  ];

  const modules = useMemo(() => {
    const s = new Set(entries.map(e => e.module).filter(Boolean) as string[]);
    return [{ value: 'ALL', label: 'Tous les modules' }, ...Array.from(s).map(m => ({ value: m, label: m }))];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || `${e.userNom} ${e.action} ${e.module} ${e.entite} ${e.entiteId}`.toLowerCase().includes(q);
      const matchAction = actionFilter === 'ALL' || e.action === actionFilter;
      const matchModule = moduleFilter === 'ALL' || e.module === moduleFilter;
      return matchSearch && matchAction && matchModule;
    });
  }, [entries, search, actionFilter, moduleFilter]);

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"><Shield className="w-5 h-5" /></div>
          <div>
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Journal d'Audit</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Traçabilité complète des actions ({filtered.length} entrée{filtered.length !== 1 ? 's' : ''})</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-500/10 transition-all" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <RefreshCw className="w-3 h-3" /> Actualiser
          </button>
          <button onClick={() => exportCSV(filtered)} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50" style={{ background: '#10b981', color: 'white' }}>
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input w-full pl-9" placeholder="Rechercher…" />
        </div>
        <CustomSelect options={actionOptions} value={actionFilter} onChange={setActionFilter} />
        <CustomSelect options={modules} value={moduleFilter} onChange={setModuleFilter} />
        <div className="flex gap-2">
          <CustomDatePicker value={dateFrom} onChange={setDateFrom} placeholder="Depuis" />
          <CustomDatePicker value={dateTo} onChange={setDateTo} placeholder="Jusqu'à" />
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="w-8 h-8 text-slate-300 mb-3" />
            <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Aucune entrée dans le journal</p>
            <p className="text-xs mt-1 text-slate-400">Les actions des utilisateurs apparaîtront ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {paginated.map(entry => {
              const ac = ACTION_CONFIG[entry.action] || { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10', label: entry.action };
              const Icon = ac.icon;
              const t = formatTime(entry.createdAt);
              const isExpanded = expanded.has(entry.id);
              const modColor = MODULE_COLORS[entry.module || ''] || 'text-slate-600 bg-slate-500/10';
              const hasDetails = entry.details && Object.keys(entry.details).length > 0;

              return (
                <div key={entry.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-500/[0.03] transition-colors">
                    {/* Icône action */}
                    <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${ac.bg}`}>
                      <Icon className={`w-4 h-4 ${ac.color}`} />
                    </div>
                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{entry.userNom || 'Système'}</span>
                        {entry.userRole && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-500/10" style={{ color: 'var(--text-muted)' }}>{entry.userRole}</span>}
                        <span className={`text-[10px] font-black ${ac.color}`}>{ac.label}</span>
                        {entry.module && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${modColor}`}>{entry.module}</span>}
                        {entry.entite && <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{entry.entite}</span>}
                        {entry.entiteId && <span className="text-[9px] font-mono text-slate-400 truncate max-w-[100px]">{entry.entiteId}</span>}
                      </div>
                    </div>
                    {/* Date / heure */}
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{t.date}</p>
                      <p className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>{t.time}</p>
                    </div>
                    {/* Toggle détails */}
                    {hasDetails && (
                      <button onClick={() => toggleExpand(entry.id)} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 transition-all">
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  {/* Détails étendus */}
                  {isExpanded && hasDetails && (
                    <div className="px-4 pb-3 ml-11">
                      <pre className="text-[10px] p-3 rounded-xl overflow-x-auto font-mono" style={{ background: 'var(--bg-sunken)', color: 'var(--text-secondary)', maxHeight: 120 }}>
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length > paginated.length && (
              <div className="flex justify-center p-3">
                <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-500/10 transition-all" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  Charger plus ({filtered.length - paginated.length} restants)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
