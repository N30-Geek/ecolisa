import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, X, Trash2, Loader2, Save, FileText, Search, Eye, Filter, Calendar, Printer, Download } from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency } from '../../utils/currency';
import type { CompteComptable, JournalComptable, EcritureComptable, LigneEcriture } from '../../types';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const TYPES_COMPTE = ['ACTIF', 'PASSIF', 'CAPITAUX', 'CHARGE', 'PRODUIT'];
const TYPES_JOURNAL = ['ACHATS', 'VENTES', 'CAISSE', 'BANQUE', 'OD', 'PAYE'];

export const AccountingTab: React.FC = () => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [comptes, setComptes] = useState<CompteComptable[]>([]);
  const [journaux, setJournaux] = useState<JournalComptable[]>([]);
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'plan' | 'journaux' | 'ecritures' | 'balance' | 'ledger'>('plan');
  const [editing, setEditing] = useState<CompteComptable | JournalComptable | EcritureComptable | null>(null);
  const [previewEcriture, setPreviewEcriture] = useState<EcritureComptable | null>(null);
  const [searchEcriture, setSearchEcriture] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCompte, setSelectedCompte] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const [c, j, e] = await Promise.all([
      LocalDatabaseService.getComptes(),
      LocalDatabaseService.getJournaux(),
      LocalDatabaseService.getEcritures(),
    ]);
    setComptes(c);
    setJournaux(j);
    setEcritures(e);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const soldes = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of ecritures) {
      for (const l of e.lignes || []) {
        const cur = map.get(l.compteId) || 0;
        map.set(l.compteId, cur + (l.debit || 0) - (l.credit || 0));
      }
    }
    return map;
  }, [ecritures]);

  const filteredEcritures = useMemo(() => {
    return ecritures.filter(e => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      if (selectedCompte && !e.lignes?.some(l => l.compteId === selectedCompte)) return false;
      if (searchEcriture) {
        const q = searchEcriture.toLowerCase();
        const hay = [e.reference, e.libelle, e.journalCode, e.lignes?.map(l => l.compteNom).join(' ')].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ecritures, dateFrom, dateTo, selectedCompte, searchEcriture]);

  const totalDebitCredit = useMemo(() => {
    return filteredEcritures.reduce((acc, e) => {
      for (const l of e.lignes || []) {
        acc.debit += l.debit || 0;
        acc.credit += l.credit || 0;
      }
      return acc;
    }, { debit: 0, credit: 0 });
  }, [filteredEcritures]);

  const balance = useMemo(() => {
    const map = new Map<string, { code: string; nom: string; type: string; debit: number; credit: number }>();
    for (const e of ecritures) {
      for (const l of e.lignes || []) {
        const c = comptes.find(cc => cc.id === l.compteId);
        const cur = map.get(l.compteId) || { code: c?.code || '', nom: c?.nom || l.compteNom || l.compteId, type: c?.type || '—', debit: 0, credit: 0 };
        cur.debit += l.debit || 0;
        cur.credit += l.credit || 0;
        map.set(l.compteId, cur);
      }
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data, solde: data.debit - data.credit }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [ecritures, comptes]);

  const ledgerByCompte = useMemo(() => {
    const map = new Map<string, { code: string; nom: string; type: string; lignes: (LigneEcriture & { ecritureId: string; date: string; reference: string; libelle: string; journalCode?: string })[] }>();
    for (const e of ecritures) {
      for (const l of e.lignes || []) {
        const c = comptes.find(cc => cc.id === l.compteId);
        const cur = map.get(l.compteId) || { code: c?.code || '', nom: c?.nom || l.compteNom || l.compteId, type: c?.type || '—', lignes: [] };
        cur.lignes.push({ ...l, ecritureId: e.id, date: e.date, reference: e.reference, libelle: e.libelle, journalCode: e.journalCode });
        map.set(l.compteId, cur);
      }
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [ecritures, comptes]);

  const handleDelete = async (type: 'compte' | 'journal' | 'ecriture', id: string) => {
    if (!window.confirm('Supprimer cet element ?')) return;
    if (type === 'compte') await LocalDatabaseService.deleteCompte(id);
    if (type === 'journal') await LocalDatabaseService.deleteJournal(id);
    if (type === 'ecriture') await LocalDatabaseService.deleteEcriture(id);
    load();
  };

  const saveCompte = async (c: CompteComptable) => {
    if (c.id) await LocalDatabaseService.updateCompte(c.id, c);
    else await LocalDatabaseService.addCompte(c);
    setEditing(null);
    load();
  };

  const saveJournal = async (j: JournalComptable) => {
    if (j.id) await LocalDatabaseService.updateJournal(j.id, j);
    else await LocalDatabaseService.addJournal(j);
    setEditing(null);
    load();
  };

  const saveEcriture = async (e: EcritureComptable) => {
    await LocalDatabaseService.addEcriture(e);
    setEditing(null);
    load();
  };

  const allViews: { id: typeof view; label: string }[] = [
    { id: 'plan', label: 'Plan comptable' },
    { id: 'journaux', label: 'Journaux' },
    { id: 'ecritures', label: 'Écritures' },
    { id: 'balance', label: 'Balance' },
    { id: 'ledger', label: 'Grand-Livre' },
  ];

  const handleAdd = () => {
    if (view === 'plan') setEditing({ id: '', code: '', nom: '', type: 'CHARGE', actif: true });
    if (view === 'journaux') setEditing({ id: '', code: '', nom: '', type: 'OD', actif: true });
    if (view === 'ecritures' || view === 'balance' || view === 'ledger') setEditing({ id: '', journalId: '', journalCode: '', date: new Date().toISOString().split('T')[0], reference: '', libelle: '', lignes: [] });
  };

  const exportCSV = () => {
    let csv = '';
    if (view === 'balance') {
      csv = 'Code,Compte,Type,Debit,Credit,Solde\n';
      csv += balance.map(b => `${b.code},"${b.nom}",${b.type},${b.debit},${b.credit},${b.solde}`).join('\n');
    } else if (view === 'ledger') {
      csv = 'Compte,Date,Reference,Libelle,Debit,Credit\n';
      csv += ledgerByCompte.flatMap(c => c.lignes.map(l => `${c.code},"${c.nom}",${l.date},${l.reference},"${l.libelle}",${l.debit},${l.credit}`)).join('\n');
    } else {
      csv = 'Reference,Date,Journal,Libelle,Debit,Credit\n';
      csv += filteredEcritures.map(e => [e.reference, e.date, e.journalCode, `"${e.libelle}"`, e.lignes?.reduce((a, l) => a + l.debit, 0), e.lignes?.reduce((a, l) => a + l.credit, 0)].join(',')).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${view}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Comptabilité</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Plan comptable, journaux, écritures, balance et grand-livre</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> Exporter CSV
          </button>
          <button
            onClick={handleAdd}
            className="btn-primary flex items-center gap-2"
            style={{ fontSize: '12px' }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Comptes actifs', val: comptes.length, color: '#6366f1', icon: BookOpen, desc: 'Plan comptable' },
          { label: 'Journaux', val: journaux.length, color: '#8b5cf6', icon: FileText, desc: 'Journaux configurés' },
          { label: 'Total Débit', val: fmt(totalDebitCredit.debit), color: '#10b981', icon: Printer, desc: 'Cumul écritures filtrées' },
          { label: 'Total Crédit', val: fmt(totalDebitCredit.credit), color: '#ef4444', icon: Download, desc: 'Cumul écritures filtrées' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-[18px] font-black" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex rounded-xl p-1" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
            {allViews.map(v => (
              <button
                key={v.id}
                onClick={() => { setView(v.id); setSearchEcriture(''); setSelectedCompte(''); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-black transition-all"
                style={{
                  background: view === v.id ? 'var(--bg-surface)' : 'transparent',
                  color: view === v.id ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {(view === 'ecritures' || view === 'balance' || view === 'ledger') && (
            <select value={selectedCompte} onChange={e => setSelectedCompte(e.target.value)} className="input text-xs w-48">
              <option value="">Tous les comptes</option>
              {comptes.map(c => <option key={c.id} value={c.id}>{c.code} — {c.nom}</option>)}
            </select>
          )}

          {(view === 'ecritures' || view === 'balance' || view === 'ledger') && (
            <>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-xs w-36" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-xs w-36" />
            </>
          )}

          {view === 'ecritures' && (
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                value={searchEcriture}
                onChange={e => setSearchEcriture(e.target.value)}
                placeholder="Rechercher une écriture..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold outline-none"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          <button
            onClick={() => { setSearchEcriture(''); setSelectedCompte(''); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-2 rounded-xl border text-[11px] font-black hover:bg-slate-500/5 flex items-center gap-1.5 transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Filter className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {view === 'plan' && (
        <div className="section-card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Type</th>
                <th>Solde (debit - credit)</th>
                <th>Parent</th>
                <th>Actif</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comptes.map(c => {
                const solde = soldes.get(c.id) || 0;
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-[11px] font-bold text-indigo-600">{c.code}</td>
                    <td className="font-bold text-[12px]">{c.nom}</td>
                    <td className="text-[11px]">{c.type}</td>
                    <td className={`font-black text-[14px] ${solde >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmt(solde)}</td>
                    <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{comptes.find(p => p.id === c.parentId)?.code || '—'}</td>
                    <td>{c.actif ? <span className="text-emerald-600 text-[11px] font-bold">Oui</span> : <span className="text-slate-400 text-[11px]">Non</span>}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(c)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600">Modifier</button>
                        <button onClick={() => handleDelete('compte', c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {comptes.length === 0 && !loading && (
                <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun compte.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'journaux' && (
        <div className="section-card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr><th>Code</th><th>Nom</th><th>Type</th><th>Actif</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {journaux.map(j => (
                <tr key={j.id}>
                  <td className="font-mono text-[11px] font-bold text-indigo-600">{j.code}</td>
                  <td className="font-bold text-[12px]">{j.nom}</td>
                  <td className="text-[11px]">{j.type}</td>
                  <td>{j.actif ? <span className="text-emerald-600 text-[11px] font-bold">Oui</span> : <span className="text-slate-400 text-[11px]">Non</span>}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(j)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600">Modifier</button>
                      <button onClick={() => handleDelete('journal', j.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'ecritures' && (
        <div className="space-y-3">
          {filteredEcritures.map(e => (
            <div
              key={e.id}
              onClick={() => setPreviewEcriture(e)}
              className="section-card p-4 cursor-pointer hover:border-indigo-500/30 transition-all"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-indigo-600">{e.reference}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-500">{e.journalCode}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{e.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={ev => { ev.stopPropagation(); setPreviewEcriture(e); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-50 text-indigo-500"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={ev => { ev.stopPropagation(); handleDelete('ecriture', e.id); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                </div>
              </div>
              <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{e.libelle}</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    <th className="text-left py-1">Compte</th>
                    <th className="text-left py-1">Libellé</th>
                    <th className="text-right py-1">Débit</th>
                    <th className="text-right py-1">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {e.lignes?.map((l, i) => (
                    <tr key={l.id || i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-1 font-mono font-bold">{comptes.find(c => c.id === l.compteId)?.code || l.compteId}</td>
                      <td className="py-1">{comptes.find(c => c.id === l.compteId)?.nom || l.compteNom}</td>
                      <td className="py-1 text-right font-bold text-slate-700">{l.debit ? fmt(l.debit) : '—'}</td>
                      <td className="py-1 text-right font-bold text-slate-700">{l.credit ? fmt(l.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filteredEcritures.length === 0 && !loading && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune écriture correspondante.</div>
          )}
        </div>
      )}

      {view === 'balance' && (
        <div className="section-card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Code</th>
                <th>Compte</th>
                <th>Type</th>
                <th className="text-right">Débit</th>
                <th className="text-right">Crédit</th>
                <th className="text-right">Solde</th>
              </tr>
            </thead>
            <tbody>
              {(selectedCompte ? balance.filter(b => b.id === selectedCompte) : balance).map(b => (
                <tr key={b.id}>
                  <td className="font-mono text-[11px] font-bold text-indigo-600">{b.code}</td>
                  <td className="font-bold text-[12px]">{b.nom}</td>
                  <td className="text-[10px] font-black uppercase text-slate-400">{b.type}</td>
                  <td className="text-right font-bold text-emerald-600">{fmt(b.debit)}</td>
                  <td className="text-right font-bold text-rose-600">{fmt(b.credit)}</td>
                  <td className={`text-right font-black ${b.solde >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmt(b.solde)}</td>
                </tr>
              ))}
              {balance.length === 0 && !loading && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune écriture enregistrée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'ledger' && (
        <div className="space-y-5">
          {(selectedCompte ? ledgerByCompte.filter(c => c.id === selectedCompte) : ledgerByCompte).map(c => (
            <div key={c.id} className="section-card overflow-x-auto">
              <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{c.code} — {c.nom}</h3>
                  <span className="text-[10px] font-black uppercase text-slate-400">{c.type}</span>
                </div>
              </div>
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Référence</th>
                    <th>Libellé</th>
                    <th className="text-right">Débit</th>
                    <th className="text-right">Crédit</th>
                    <th className="text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let running = 0;
                    return c.lignes.map((l, i) => {
                      running += (l.debit || 0) - (l.credit || 0);
                      return (
                        <tr key={l.id || i}>
                          <td className="text-[11px]">{l.date}</td>
                          <td className="font-mono text-[11px] font-bold text-indigo-600">{l.reference}</td>
                          <td className="text-[11px]">{l.libelle}</td>
                          <td className="text-right font-bold text-emerald-600">{l.debit ? fmt(l.debit) : '—'}</td>
                          <td className="text-right font-bold text-rose-600">{l.credit ? fmt(l.credit) : '—'}</td>
                          <td className={`text-right font-black ${running >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmt(running)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          ))}
          {ledgerByCompte.length === 0 && !loading && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun compte mouvementé.</div>
          )}
        </div>
      )}

      {editing && 'code' in editing && 'type' in editing && !('lignes' in editing) && (
        <CompteJournalModal
          type={view === 'plan' ? 'compte' : 'journal'}
          item={editing as any}
          comptes={comptes}
          onClose={() => setEditing(null)}
          onSave={(item: any) => view === 'plan' ? saveCompte(item) : saveJournal(item)}
        />
      )}

      {editing && 'lignes' in editing && (
        <EcritureModal
          ecriture={editing as EcritureComptable}
          comptes={comptes}
          journaux={journaux}
          onClose={() => setEditing(null)}
          onSave={saveEcriture}
        />
      )}

      {previewEcriture && (
        <EcriturePreviewModal
          ecriture={previewEcriture}
          comptes={comptes}
          journaux={journaux}
          onClose={() => setPreviewEcriture(null)}
          fmt={fmt}
        />
      )}
    </div>
  );
};

const EcriturePreviewModal: React.FC<{
  ecriture: EcritureComptable;
  comptes: CompteComptable[];
  journaux: JournalComptable[];
  onClose: () => void;
  fmt: (n: number, source?: string) => string;
}> = ({ ecriture, comptes, journaux, onClose, fmt }) => {
  const journal = journaux.find(j => j.id === ecriture.journalId);
  const totalDebit = ecriture.lignes.reduce((a, l) => a + (l.debit || 0), 0);
  const totalCredit = ecriture.lignes.reduce((a, l) => a + (l.credit || 0), 0);

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-2xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black">Aperçu de l'écriture</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{ecriture.reference} · {ecriture.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePrint} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-500 hover:text-indigo-500 transition-all"><Printer className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-500 hover:text-rose-500 transition-all"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-black uppercase text-slate-400">Journal</p>
            <p className="text-sm font-bold">{journal ? `${journal.code} — ${journal.nom}` : ecriture.journalCode || '—'}</p>
          </div>
          <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-black uppercase text-slate-400">Pièce / Référence</p>
            <p className="text-sm font-bold font-mono">{ecriture.reference}</p>
          </div>
        </div>

        <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{ecriture.libelle}</p>

        <table className="w-full text-[12px] mb-4">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="text-left py-2">Compte</th>
              <th className="text-left py-2">Libellé</th>
              <th className="text-right py-2">Débit</th>
              <th className="text-right py-2">Crédit</th>
            </tr>
          </thead>
          <tbody>
            {ecriture.lignes.map((l, i) => (
              <tr key={l.id || i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 font-mono font-bold">{comptes.find(c => c.id === l.compteId)?.code || l.compteId}</td>
                <td className="py-2">{comptes.find(c => c.id === l.compteId)?.nom || l.compteNom}</td>
                <td className="py-2 text-right font-bold text-emerald-600">{l.debit ? fmt(l.debit) : '—'}</td>
                <td className="py-2 text-right font-bold text-rose-600">{l.credit ? fmt(l.credit) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2 font-black" colSpan={2}>Total</td>
              <td className="py-2 text-right font-black text-emerald-600">{fmt(totalDebit)}</td>
              <td className="py-2 text-right font-black text-rose-600">{fmt(totalCredit)}</td>
            </tr>
          </tfoot>
        </table>

        <div className={`p-3 rounded-xl border text-center text-sm font-black ${Math.abs(totalDebit - totalCredit) < 0.001 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
          {Math.abs(totalDebit - totalCredit) < 0.001 ? 'Écriture équilibrée' : 'Écriture déséquilibrée'}
        </div>
      </div>
    </div>
  );
};

const CompteJournalModal: React.FC<{
  type: 'compte' | 'journal';
  item: CompteComptable | JournalComptable;
  comptes: CompteComptable[];
  onClose: () => void;
  onSave: (item: any) => void;
}> = ({ type, item, comptes, onClose, onSave }) => {
  const [form, setForm] = useState<any>({ ...item });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{type === 'compte' ? 'Compte' : 'Journal'} comptable</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Nom</label>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input w-full text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input w-full text-sm">
              {(type === 'compte' ? TYPES_COMPTE : TYPES_JOURNAL).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {type === 'compte' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Compte parent</label>
              <select value={form.parentId || ''} onChange={e => setForm({ ...form, parentId: e.target.value || undefined })} className="input w-full text-sm">
                <option value="">Aucun</option>
                {comptes.filter(c => c.id !== form.id).map(c => <option key={c.id} value={c.id}>{c.code} — {c.nom}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="actif" checked={form.actif} onChange={e => setForm({ ...form, actif: e.target.checked })} className="w-4 h-4 rounded border" />
            <label htmlFor="actif" className="text-sm font-semibold">Actif</label>
          </div>
          <button onClick={() => onSave(form)} className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ background: '#6366f1', color: 'white' }}>
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

const EcritureModal: React.FC<{
  ecriture: EcritureComptable;
  comptes: CompteComptable[];
  journaux: JournalComptable[];
  onClose: () => void;
  onSave: (e: EcritureComptable) => void;
}> = ({ ecriture, comptes, journaux, onClose, onSave }) => {
  const [form, setForm] = useState<EcritureComptable>({
    ...ecriture,
    id: ecriture.id || uuid(),
    lignes: ecriture.lignes?.length ? ecriture.lignes : [{ id: uuid(), compteId: '', debit: 0, credit: 0 }],
  });

  const totalDebit = form.lignes.reduce((a, l) => a + (l.debit || 0), 0);
  const totalCredit = form.lignes.reduce((a, l) => a + (l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001;

  const updateLigne = (i: number, field: keyof LigneEcriture, value: any) => {
    const lignes = [...form.lignes];
    (lignes[i] as any)[field] = value;
    setForm({ ...form, lignes });
  };

  const addLigne = () => setForm({ ...form, lignes: [...form.lignes, { id: uuid(), compteId: '', debit: 0, credit: 0 }] });
  const removeLigne = (i: number) => setForm({ ...form, lignes: form.lignes.filter((_, idx) => idx !== i) });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-2xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Nouvelle ecriture comptable</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Journal</label>
              <select value={form.journalId} onChange={e => setForm({ ...form, journalId: e.target.value })} className="input w-full text-sm">
                <option value="">Choisir</option>
                {journaux.map(j => <option key={j.id} value={j.id}>{j.code} — {j.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Reference</label>
              <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Libelle</label>
              <input value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input w-full text-sm" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Lignes</label>
              <span className={`text-[10px] font-black ${balanced ? 'text-emerald-600' : 'text-rose-600'}`}>Debit: {totalDebit} / Credit: {totalCredit}</span>
            </div>
            <div className="space-y-2">
              {form.lignes.map((l, i) => (
                <div key={l.id || i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                  <div className="col-span-5">
                    <select value={l.compteId} onChange={e => updateLigne(i, 'compteId', e.target.value)} className="input w-full text-xs">
                      <option value="">Compte</option>
                      {comptes.map(c => <option key={c.id} value={c.id}>{c.code} — {c.nom}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={l.debit} onChange={e => updateLigne(i, 'debit', Number(e.target.value))} placeholder="Debit" className="input w-full text-xs" />
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={l.credit} onChange={e => updateLigne(i, 'credit', Number(e.target.value))} placeholder="Credit" className="input w-full text-xs" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeLigne(i)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addLigne} className="mt-2 text-[11px] font-bold text-indigo-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Ajouter une ligne</button>
          </div>
          <button
            onClick={() => onSave(form)}
            disabled={!balanced}
            className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: '#6366f1', color: 'white', opacity: balanced ? 1 : 0.6 }}
          >
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
