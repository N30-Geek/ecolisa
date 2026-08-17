import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, X, Trash2, Loader2, Save, FileText, Search, Eye, Filter, Calendar, Printer, Download, Building2, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { DatePicker } from '../common/DatePicker';
import { NumberInput } from '../common/NumberInput';
import { CustomSelect } from '../common/CustomSelect';
import type { CompteComptable, JournalComptable, EcritureComptable, LigneEcriture } from '../../types';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const TYPES_COMPTE = ['ACTIF', 'PASSIF', 'CAPITAUX', 'CHARGE', 'PRODUIT'];
const TYPES_JOURNAL = ['ACHATS', 'VENTES', 'CAISSE', 'BANQUE', 'OD', 'PAYE'];

interface AccountingTabProps {
  activeSchoolYear?: string;
}

export const AccountingTab: React.FC<AccountingTabProps> = ({ activeSchoolYear }) => {
  const { currency, referenceCurrency, format, convert, currencies } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);

  const [comptes, setComptes] = useState<CompteComptable[]>([]);
  const [journaux, setJournaux] = useState<JournalComptable[]>([]);
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'plan' | 'journaux' | 'ecritures' | 'balance' | 'ledger' | 'bilan' | 'resultat'>('plan');
  const [editing, setEditing] = useState<CompteComptable | JournalComptable | EcritureComptable | null>(null);
  const [previewEcriture, setPreviewEcriture] = useState<EcritureComptable | null>(null);
  const [searchEcriture, setSearchEcriture] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bilanDate, setBilanDate] = useState(new Date().toISOString().split('T')[0]);
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

  const filteredEcritures = useMemo(() => {
    return ecritures.filter(e => {
      const day = e.date.split('T')[0];
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (selectedCompte && !e.lignes?.some(l => l.compteId === selectedCompte)) return false;
      if (searchEcriture) {
        const q = searchEcriture.toLowerCase();
        const hay = [e.reference, e.libelle, e.journalCode, e.lignes?.map(l => l.compteNom).join(' ')].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ecritures, dateFrom, dateTo, selectedCompte, searchEcriture]);

  const convertLine = (l: LigneEcriture, amount: number) => {
    const from = l.devise || referenceCurrency;
    return convert(amount, from);
  };

  const soldes = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of ecritures) {
      for (const l of e.lignes || []) {
        const cur = map.get(l.compteId) || 0;
        map.set(l.compteId, cur + convertLine(l, l.debit || 0) - convertLine(l, l.credit || 0));
      }
    }
    return map;
  }, [ecritures, convert, referenceCurrency]);

  const totalDebitCredit = useMemo(() => {
    return filteredEcritures.reduce((acc, e) => {
      for (const l of e.lignes || []) {
        acc.debit += convertLine(l, l.debit || 0);
        acc.credit += convertLine(l, l.credit || 0);
      }
      return acc;
    }, { debit: 0, credit: 0 });
  }, [filteredEcritures, convert, referenceCurrency]);

  const balance = useMemo(() => {
    const map = new Map<string, { code: string; nom: string; type: string; debit: number; credit: number }>();
    for (const e of ecritures) {
      for (const l of e.lignes || []) {
        const c = comptes.find(cc => cc.id === l.compteId);
        const cur = map.get(l.compteId) || { code: c?.code || '', nom: c?.nom || l.compteNom || l.compteId, type: c?.type || '—', debit: 0, credit: 0 };
        cur.debit += convertLine(l, l.debit || 0);
        cur.credit += convertLine(l, l.credit || 0);
        map.set(l.compteId, cur);
      }
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data, solde: data.debit - data.credit }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [ecritures, comptes, convert, referenceCurrency]);

  const ledgerByCompte = useMemo(() => {
    const map = new Map<string, { code: string; nom: string; type: string; lignes: (LigneEcriture & { ecritureId: string; date: string; reference: string; libelle: string; journalCode?: string; convertedDebit: number; convertedCredit: number })[] }>();
    for (const e of ecritures) {
      for (const l of e.lignes || []) {
        const c = comptes.find(cc => cc.id === l.compteId);
        const cur = map.get(l.compteId) || { code: c?.code || '', nom: c?.nom || l.compteNom || l.compteId, type: c?.type || '—', lignes: [] };
        const convertedDebit = convertLine(l, l.debit || 0);
        const convertedCredit = convertLine(l, l.credit || 0);
        cur.lignes.push({ ...l, ecritureId: e.id, date: e.date, reference: e.reference, libelle: e.libelle, journalCode: e.journalCode, convertedDebit, convertedCredit });
        map.set(l.compteId, cur);
      }
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [ecritures, comptes, convert, referenceCurrency]);

  const displayBalance = useMemo(() => (selectedCompte ? balance.filter(b => b.id === selectedCompte) : balance), [balance, selectedCompte]);
  const displayLedger = useMemo(() => (selectedCompte ? ledgerByCompte.filter(c => c.id === selectedCompte) : ledgerByCompte), [ledgerByCompte, selectedCompte]);

  // ─── Données du Bilan (situation patrimoniale à une date donnée) ────────────
  const bilanData = useMemo(() => {
    const actifMap = new Map<string, { code: string; nom: string; solde: number }>();
    const passifMap = new Map<string, { code: string; nom: string; solde: number }>();
    const capitauxMap = new Map<string, { code: string; nom: string; solde: number }>();
    for (const e of ecritures) {
      if (e.date.split('T')[0] > bilanDate) continue;
      for (const l of e.lignes || []) {
        const c = comptes.find(cc => cc.id === l.compteId);
        if (!c) continue;
        const debit = convertLine(l, l.debit || 0);
        const credit = convertLine(l, l.credit || 0);
        const target = c.type === 'ACTIF' ? actifMap : c.type === 'PASSIF' ? passifMap : c.type === 'CAPITAUX' ? capitauxMap : null;
        if (!target) continue;
        const cur = target.get(c.id) || { code: c.code, nom: c.nom, solde: 0 };
        // Sens du solde selon le type de compte (comptes d'actif en D+, passif/capitaux en C+)
        if (c.type === 'ACTIF') {
          cur.solde += debit - credit;
        } else {
          cur.solde += credit - debit;
        }
        target.set(c.id, cur);
      }
    }
    const rows = (map: Map<string, any>) => Array.from(map.values()).filter(r => Math.abs(r.solde) > 0.001).sort((a, b) => a.code.localeCompare(b.code));
    const actif = rows(actifMap);
    const passif = rows(passifMap);
    const capitaux = rows(capitauxMap);
    const totalActif = actif.reduce((a, r) => a + r.solde, 0);
    const totalPassif = passif.reduce((a, r) => a + r.solde, 0);
    const totalCapitaux = capitaux.reduce((a, r) => a + r.solde, 0);
    return { actif, passif, capitaux, totalActif, totalPassif, totalCapitaux, totalPassifCapitaux: totalPassif + totalCapitaux };
  }, [ecritures, comptes, bilanDate, convert, referenceCurrency]);

  // ─── Données du Compte de Résultat (produits - charges sur une période) ─────
  const resultatData = useMemo(() => {
    const charges = new Map<string, { code: string; nom: string; montant: number }>();
    const produits = new Map<string, { code: string; nom: string; montant: number }>();
    for (const e of ecritures) {
      const day = e.date.split('T')[0];
      if (dateFrom && day < dateFrom) continue;
      if (dateTo && day > dateTo) continue;
      for (const l of e.lignes || []) {
        const c = comptes.find(cc => cc.id === l.compteId);
        if (!c || (c.type !== 'CHARGE' && c.type !== 'PRODUIT')) continue;
        const debit = convertLine(l, l.debit || 0);
        const credit = convertLine(l, l.credit || 0);
        const target = c.type === 'CHARGE' ? charges : produits;
        const cur = target.get(c.id) || { code: c.code, nom: c.nom, montant: 0 };
        if (c.type === 'CHARGE') {
          cur.montant += debit - credit;
        } else {
          cur.montant += credit - debit;
        }
        target.set(c.id, cur);
      }
    }
    const rows = (map: Map<string, any>) => Array.from(map.values()).filter(r => Math.abs(r.montant) > 0.001).sort((a, b) => a.code.localeCompare(b.code));
    const chargesList = rows(charges);
    const produitsList = rows(produits);
    const totalCharges = chargesList.reduce((a, r) => a + r.montant, 0);
    const totalProduits = produitsList.reduce((a, r) => a + r.montant, 0);
    const resultatNet = totalProduits - totalCharges;
    return { charges: chargesList, produits: produitsList, totalCharges, totalProduits, resultatNet };
  }, [ecritures, comptes, dateFrom, dateTo, convert, referenceCurrency]);

  const comptesPagination = usePagination(comptes, { defaultPageSize: 15 });
  const journauxPagination = usePagination(journaux, { defaultPageSize: 15 });
  const ecrituresPagination = usePagination(filteredEcritures, { defaultPageSize: 10 });
  const balancePagination = usePagination(displayBalance, { defaultPageSize: 15 });
  const ledgerPagination = usePagination(displayLedger, { defaultPageSize: 5 });

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
    const ecriture = { ...e, devise: e.devise || currency };
    ecriture.lignes = ecriture.lignes.map(l => ({ ...l, devise: l.devise || ecriture.devise }));
    await LocalDatabaseService.addEcriture(ecriture);
    setEditing(null);
    load();
  };

  const allViews: { id: typeof view; label: string }[] = [
    { id: 'plan', label: 'Plan comptable' },
    { id: 'journaux', label: 'Journaux' },
    { id: 'ecritures', label: 'Écritures' },
    { id: 'balance', label: 'Balance' },
    { id: 'ledger', label: 'Grand-Livre' },
    { id: 'bilan', label: 'Bilan' },
    { id: 'resultat', label: 'Compte de Résultat' },
  ];

  const handleAdd = () => {
    if (view === 'plan') setEditing({ id: '', code: '', nom: '', type: 'CHARGE', actif: true });
    if (view === 'journaux') setEditing({ id: '', code: '', nom: '', type: 'OD', actif: true });
    if (view === 'ecritures' || view === 'balance' || view === 'ledger') setEditing({ id: '', journalId: '', journalCode: '', date: new Date().toISOString().split('T')[0], reference: '', libelle: '', devise: currency, lignes: [] });
  };

  const exportCSV = () => {
    let csv = '';
    if (view === 'balance') {
      csv = 'Code,Compte,Type,Debit,Credit,Solde\n';
      csv += balance.map(b => `${b.code},"${b.nom}",${b.type},${b.debit},${b.credit},${b.solde}`).join('\n');
    } else if (view === 'ledger') {
      csv = 'Compte,Date,Reference,Libelle,Debit,Credit\n';
      csv += ledgerByCompte.flatMap(c => c.lignes.map(l => `${c.code},"${c.nom}",${l.date},${l.reference},"${l.libelle}",${l.convertedDebit},${l.convertedCredit}`)).join('\n');
    } else if (view === 'bilan') {
      csv = 'Type,Code,Compte,Solde\n';
      csv += bilanData.actif.map(r => `ACTIF,${r.code},"${r.nom}",${r.solde}`).join('\n') + '\n';
      csv += bilanData.passif.map(r => `PASSIF,${r.code},"${r.nom}",${r.solde}`).join('\n') + '\n';
      csv += bilanData.capitaux.map(r => `CAPITAUX,${r.code},"${r.nom}",${r.solde}`).join('\n') + '\n';
      csv += `TOTAL,Total Actif,,${bilanData.totalActif}\n`;
      csv += `TOTAL,Total Passif + Capitaux,,${bilanData.totalPassifCapitaux}\n`;
    } else if (view === 'resultat') {
      csv = 'Type,Code,Compte,Montant\n';
      csv += resultatData.produits.map(r => `PRODUIT,${r.code},"${r.nom}",${r.montant}`).join('\n') + '\n';
      csv += resultatData.charges.map(r => `CHARGE,${r.code},"${r.nom}",${r.montant}`).join('\n') + '\n';
      csv += `TOTAL,Total Produits,,${resultatData.totalProduits}\n`;
      csv += `TOTAL,Total Charges,,${resultatData.totalCharges}\n`;
      csv += `TOTAL,Résultat net,,${resultatData.resultatNet}\n`;
    } else {
      csv = 'Reference,Date,Journal,Libelle,Debit,Credit\n';
      csv += filteredEcritures.map(e => [e.reference, e.date, e.journalCode, `"${e.libelle}"`, e.lignes?.reduce((a, l) => a + convertLine(l, l.debit || 0), 0), e.lignes?.reduce((a, l) => a + convertLine(l, l.credit || 0), 0)].join(',')).join('\n');
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
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Plan comptable, journaux, écritures, balance, grand-livre, bilan et compte de résultat</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> Exporter CSV
          </button>
          <button
            onClick={handleAdd}
            disabled={view === 'bilan' || view === 'resultat'}
            className="btn-primary flex items-center gap-2"
            style={{ fontSize: '12px', opacity: view === 'bilan' || view === 'resultat' ? 0.5 : 1 }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Comptes actifs', val: comptes.length, color: '#6366f1', icon: BookOpen, desc: 'Plan comptable' },
          { label: 'Journaux', val: journaux.length, color: '#8b5cf6', icon: FileText, desc: 'Journaux configurés' },
          { label: 'Total Débit', val: fmt(totalDebitCredit.debit, currency), color: '#10b981', icon: Printer, desc: 'Cumul écritures filtrées' },
          { label: 'Total Crédit', val: fmt(totalDebitCredit.credit, currency), color: '#ef4444', icon: Download, desc: 'Cumul écritures filtrées' },
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
            <CustomSelect
              options={[{ value: '', label: 'Tous les comptes' }, ...comptes.map(c => ({ value: c.id, label: `${c.code} — ${c.nom}` }))]}
              value={selectedCompte}
              onChange={setSelectedCompte}
              placeholder="Tous les comptes"
              className="w-56"
            />
          )}

          {(view === 'ecritures' || view === 'balance' || view === 'ledger' || view === 'resultat') && (
            <>
              <DatePicker value={dateFrom} onChange={setDateFrom} className="w-36" />
              <DatePicker value={dateTo} onChange={setDateTo} className="w-36" />
            </>
          )}

          {view === 'bilan' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase" style={{ color: 'var(--text-muted)' }}>Situation au</span>
              <DatePicker value={bilanDate} onChange={setBilanDate} className="w-36" />
            </div>
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
            onClick={() => { setSearchEcriture(''); setSelectedCompte(''); setDateFrom(''); setDateTo(''); setBilanDate(new Date().toISOString().split('T')[0]); }}
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
              {comptesPagination.paginated.map(c => {
                const solde = soldes.get(c.id) || 0;
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-[11px] font-bold text-indigo-600">{c.code}</td>
                    <td className="font-bold text-[12px]">{c.nom}</td>
                    <td className="text-[11px]">{c.type}</td>
                    <td className={`font-black text-[14px] ${solde >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmt(solde, currency)}</td>
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
          <Pagination
            currentPage={comptesPagination.page}
            totalPages={comptesPagination.totalPages}
            total={comptesPagination.total}
            pageSize={comptesPagination.pageSize}
            start={comptesPagination.start}
            end={comptesPagination.end}
            onPageChange={comptesPagination.setPage}
            onPageSizeChange={comptesPagination.setPageSize}
          />
        </div>
      )}

      {view === 'journaux' && (
        <div className="section-card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr><th>Code</th><th>Nom</th><th>Type</th><th>Actif</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {journauxPagination.paginated.map(j => (
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
              {journaux.length === 0 && !loading && (
                <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun journal.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={journauxPagination.page}
            totalPages={journauxPagination.totalPages}
            total={journauxPagination.total}
            pageSize={journauxPagination.pageSize}
            start={journauxPagination.start}
            end={journauxPagination.end}
            onPageChange={journauxPagination.setPage}
            onPageSizeChange={journauxPagination.setPageSize}
          />
        </div>
      )}

      {view === 'ecritures' && (
        <div className="space-y-3">
          {ecrituresPagination.paginated.map(e => (
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
                      <td className="py-1 text-right font-bold text-slate-700">{l.debit ? fmt(l.debit, l.devise) : '—'}</td>
                      <td className="py-1 text-right font-bold text-slate-700">{l.credit ? fmt(l.credit, l.devise) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filteredEcritures.length === 0 && !loading && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune écriture correspondante.</div>
          )}
          <Pagination
            currentPage={ecrituresPagination.page}
            totalPages={ecrituresPagination.totalPages}
            total={ecrituresPagination.total}
            pageSize={ecrituresPagination.pageSize}
            start={ecrituresPagination.start}
            end={ecrituresPagination.end}
            onPageChange={ecrituresPagination.setPage}
            onPageSizeChange={ecrituresPagination.setPageSize}
          />
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
              {balancePagination.paginated.map(b => (
                <tr key={b.id}>
                  <td className="font-mono text-[11px] font-bold text-indigo-600">{b.code}</td>
                  <td className="font-bold text-[12px]">{b.nom}</td>
                  <td className="text-[10px] font-black uppercase text-slate-400">{b.type}</td>
                  <td className="text-right font-bold text-emerald-600">{fmt(b.debit, currency)}</td>
                  <td className="text-right font-bold text-rose-600">{fmt(b.credit, currency)}</td>
                  <td className={`text-right font-black ${b.solde >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmt(b.solde, currency)}</td>
                </tr>
              ))}
              {balance.length === 0 && !loading && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune écriture enregistrée.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={balancePagination.page}
            totalPages={balancePagination.totalPages}
            total={balancePagination.total}
            pageSize={balancePagination.pageSize}
            start={balancePagination.start}
            end={balancePagination.end}
            onPageChange={balancePagination.setPage}
            onPageSizeChange={balancePagination.setPageSize}
          />
        </div>
      )}

      {view === 'ledger' && (
        <div className="space-y-5">
          {ledgerPagination.paginated.map(c => (
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
                      running += l.convertedDebit - l.convertedCredit;
                      return (
                        <tr key={l.id || i}>
                          <td className="text-[11px]">{l.date}</td>
                          <td className="font-mono text-[11px] font-bold text-indigo-600">{l.reference}</td>
                          <td className="text-[11px]">{l.libelle}</td>
                          <td className="text-right font-bold text-emerald-600">{l.convertedDebit ? fmt(l.convertedDebit, currency) : '—'}</td>
                          <td className="text-right font-bold text-rose-600">{l.convertedCredit ? fmt(l.convertedCredit, currency) : '—'}</td>
                          <td className={`text-right font-black ${running >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmt(running, currency)}</td>
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
          <Pagination
            currentPage={ledgerPagination.page}
            totalPages={ledgerPagination.totalPages}
            total={ledgerPagination.total}
            pageSize={ledgerPagination.pageSize}
            start={ledgerPagination.start}
            end={ledgerPagination.end}
            onPageChange={ledgerPagination.setPage}
            onPageSizeChange={ledgerPagination.setPageSize}
          />
        </div>
      )}

      {view === 'bilan' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="section-card p-4" style={{ background: 'rgba(99,102,241,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Total Actif</h3>
              </div>
              <p className="text-2xl font-black text-indigo-600">{fmt(bilanData.totalActif, currency)}</p>
            </div>
            <div className="section-card p-4" style={{ background: 'rgba(16,185,129,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-emerald-500" />
                <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Total Passif + Capitaux</h3>
              </div>
              <p className="text-2xl font-black text-emerald-600">{fmt(bilanData.totalPassifCapitaux, currency)}</p>
            </div>
          </div>

          <div className="section-card overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left">Compte</th>
                  <th className="text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-2 font-black text-indigo-600" colSpan={2}>ACTIF</td></tr>
                {bilanData.actif.map(r => (
                  <tr key={`actif-${r.code}`}>
                    <td className="text-[12px]"><span className="font-mono font-bold text-slate-500">{r.code}</span> — {r.nom}</td>
                    <td className="text-right font-black">{fmt(r.solde, currency)}</td>
                  </tr>
                ))}
                {bilanData.actif.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun compte d'actif.</td></tr>}
                <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}><td className="py-2 font-black">Total Actif</td><td className="text-right font-black text-indigo-600">{fmt(bilanData.totalActif, currency)}</td></tr>

                <tr><td className="py-2 font-black text-emerald-600 pt-6" colSpan={2}>PASSIF</td></tr>
                {bilanData.passif.map(r => (
                  <tr key={`passif-${r.code}`}>
                    <td className="text-[12px]"><span className="font-mono font-bold text-slate-500">{r.code}</span> — {r.nom}</td>
                    <td className="text-right font-black">{fmt(r.solde, currency)}</td>
                  </tr>
                ))}
                {bilanData.passif.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun compte de passif.</td></tr>}
                <tr className="border-t" style={{ borderColor: 'var(--border)' }}><td className="py-2 font-black">Total Passif</td><td className="text-right font-black text-emerald-600">{fmt(bilanData.totalPassif, currency)}</td></tr>

                <tr><td className="py-2 font-black text-violet-600 pt-6" colSpan={2}>CAPITAUX PROPRES</td></tr>
                {bilanData.capitaux.map(r => (
                  <tr key={`capitaux-${r.code}`}>
                    <td className="text-[12px]"><span className="font-mono font-bold text-slate-500">{r.code}</span> — {r.nom}</td>
                    <td className="text-right font-black">{fmt(r.solde, currency)}</td>
                  </tr>
                ))}
                {bilanData.capitaux.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun compte de capitaux.</td></tr>}
                <tr className="border-t" style={{ borderColor: 'var(--border)' }}><td className="py-2 font-black">Total Capitaux Propres</td><td className="text-right font-black text-violet-600">{fmt(bilanData.totalCapitaux, currency)}</td></tr>

                <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 font-black text-lg">Total Passif + Capitaux</td>
                  <td className="text-right font-black text-lg text-emerald-600">{fmt(bilanData.totalPassifCapitaux, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {Math.abs(bilanData.totalActif - bilanData.totalPassifCapitaux) > 0.01 && (
            <div className="p-3 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-600 text-sm font-bold">
              Écart détecté : le total actif ({fmt(bilanData.totalActif, currency)}) ne correspond pas au total passif + capitaux ({fmt(bilanData.totalPassifCapitaux, currency)}). Vérifiez les écritures non équilibrées.
            </div>
          )}
        </div>
      )}

      {view === 'resultat' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="section-card p-4" style={{ background: 'rgba(16,185,129,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Produits</h3>
              </div>
              <p className="text-xl font-black text-emerald-600">{fmt(resultatData.totalProduits, currency)}</p>
            </div>
            <div className="section-card p-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Charges</h3>
              </div>
              <p className="text-xl font-black text-rose-600">{fmt(resultatData.totalCharges, currency)}</p>
            </div>
            <div className={`section-card p-4 ${resultatData.resultatNet >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Scale className={`w-4 h-4 ${resultatData.resultatNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Résultat net</h3>
              </div>
              <p className={`text-xl font-black ${resultatData.resultatNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(resultatData.resultatNet, currency)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="section-card overflow-x-auto">
              <h3 className="font-black text-sm mb-3 p-4 border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Produits</h3>
              <table className="data-table w-full">
                <thead>
                  <tr><th className="text-left">Compte</th><th className="text-right">Montant</th></tr>
                </thead>
                <tbody>
                  {resultatData.produits.map(r => (
                    <tr key={`prod-${r.code}`}>
                      <td className="text-[12px]"><span className="font-mono font-bold text-slate-500">{r.code}</span> — {r.nom}</td>
                      <td className="text-right font-black">{fmt(r.montant, currency)}</td>
                    </tr>
                  ))}
                  {resultatData.produits.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun produit enregistré.</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}><td className="py-2 font-black">Total Produits</td><td className="text-right font-black text-emerald-600">{fmt(resultatData.totalProduits, currency)}</td></tr>
                </tfoot>
              </table>
            </div>
            <div className="section-card overflow-x-auto">
              <h3 className="font-black text-sm mb-3 p-4 border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Charges</h3>
              <table className="data-table w-full">
                <thead>
                  <tr><th className="text-left">Compte</th><th className="text-right">Montant</th></tr>
                </thead>
                <tbody>
                  {resultatData.charges.map(r => (
                    <tr key={`charge-${r.code}`}>
                      <td className="text-[12px]"><span className="font-mono font-bold text-slate-500">{r.code}</span> — {r.nom}</td>
                      <td className="text-right font-black">{fmt(r.montant, currency)}</td>
                    </tr>
                  ))}
                  {resultatData.charges.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune charge enregistrée.</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}><td className="py-2 font-black">Total Charges</td><td className="text-right font-black text-rose-600">{fmt(resultatData.totalCharges, currency)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="section-card p-4">
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="py-2 font-bold">Total Produits</td><td className="text-right font-black text-emerald-600">{fmt(resultatData.totalProduits, currency)}</td></tr>
                <tr><td className="py-2 font-bold">Total Charges</td><td className="text-right font-black text-rose-600">{fmt(resultatData.totalCharges, currency)}</td></tr>
                <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 font-black text-lg">Résultat net</td>
                  <td className={`text-right font-black text-lg ${resultatData.resultatNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(resultatData.resultatNet, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
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
                <td className="py-2 text-right font-bold text-emerald-600">{l.debit ? fmt(l.debit, l.devise) : '—'}</td>
                <td className="py-2 text-right font-bold text-rose-600">{l.credit ? fmt(l.credit, l.devise) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2 font-black" colSpan={2}>Total</td>
              <td className="py-2 text-right font-black text-emerald-600">{fmt(totalDebit, ecriture.devise)}</td>
              <td className="py-2 text-right font-black text-rose-600">{fmt(totalCredit, ecriture.devise)}</td>
            </tr>
          </tfoot>
        </table>

        <div className={`p-3 rounded-xl border text-center text-sm font-black ${Math.abs(totalDebit - totalCredit) < 0.001 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
          {Math.abs(totalDebit - totalCredit) < 0.001 ? 'Écriture équilibrée' : 'Écriture déséquilibrée'}
        </div>
      </div>
    </div>,
    document.body
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
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
            <CustomSelect
              options={(type === 'compte' ? TYPES_COMPTE : TYPES_JOURNAL).map(t => ({ value: t, label: t }))}
              value={form.type}
              onChange={v => setForm({ ...form, type: v })}
            />
          </div>
          {type === 'compte' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Compte parent</label>
              <CustomSelect
                options={[{ value: '', label: 'Aucun' }, ...comptes.filter(c => c.id !== form.id).map(c => ({ value: c.id, label: `${c.code} — ${c.nom}` }))]}
                value={form.parentId || ''}
                onChange={v => setForm({ ...form, parentId: v || undefined })}
              />
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
    </div>,
    document.body
  );
};

const EcritureModal: React.FC<{
  ecriture: EcritureComptable;
  comptes: CompteComptable[];
  journaux: JournalComptable[];
  onClose: () => void;
  onSave: (e: EcritureComptable) => void;
}> = ({ ecriture, comptes, journaux, onClose, onSave }) => {
  const { currency, currencies } = useSchoolConfig();
  const [form, setForm] = useState<EcritureComptable>({
    ...ecriture,
    id: ecriture.id || uuid(),
    devise: ecriture.devise || currency,
    lignes: ecriture.lignes?.length
      ? ecriture.lignes.map(l => ({ ...l, devise: l.devise || ecriture.devise || currency }))
      : [{ id: uuid(), compteId: '', debit: 0, credit: 0, devise: ecriture.devise || currency }],
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const totalDebit = form.lignes.reduce((a, l) => a + (l.debit || 0), 0);
  const totalCredit = form.lignes.reduce((a, l) => a + (l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001;

  const updateLigne = (i: number, field: keyof LigneEcriture, value: any) => {
    const lignes = [...form.lignes];
    (lignes[i] as any)[field] = value;
    setForm({ ...form, lignes });
  };

  const addLigne = () => setForm({ ...form, lignes: [...form.lignes, { id: uuid(), compteId: '', debit: 0, credit: 0, devise: form.devise }] });
  const removeLigne = (i: number) => setForm({ ...form, lignes: form.lignes.filter((_, idx) => idx !== i) });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Nouvelle ecriture comptable</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date</label>
              <DatePicker value={form.date} onChange={val => setForm({ ...form, date: val })} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <CustomSelect
                options={currencies.map(c => ({ value: c.code, label: `${c.code} (${c.name || c.code})` }))}
                value={form.devise || currency}
                onChange={v => setForm({ ...form, devise: v, lignes: form.lignes.map(l => ({ ...l, devise: v })) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Journal</label>
              <CustomSelect
                options={[{ value: '', label: 'Choisir un journal' }, ...journaux.map(j => ({ value: j.id, label: `${j.code} — ${j.nom}` }))]}
                value={form.journalId}
                onChange={v => setForm({ ...form, journalId: v })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Pièce / Référence</label>
              <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input w-full text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Libelle</label>
            <input value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input w-full text-sm" />
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
                    <CustomSelect
                      options={[{ value: '', label: 'Compte' }, ...comptes.map(c => ({ value: c.id, label: `${c.code} — ${c.nom}` }))]}
                      value={l.compteId}
                      onChange={v => updateLigne(i, 'compteId', v)}
                    />
                  </div>
                  <div className="col-span-3">
                    <NumberInput value={l.debit} onChange={v => updateLigne(i, 'debit', v)} min={0} placeholder="Débit" className="input w-full text-xs" />
                  </div>
                  <div className="col-span-3">
                    <NumberInput value={l.credit} onChange={v => updateLigne(i, 'credit', v)} min={0} placeholder="Crédit" className="input w-full text-xs" />
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
    </div>,
    document.body
  );
};
