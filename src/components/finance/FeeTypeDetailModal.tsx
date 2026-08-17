import React, { useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Table,
  BarChart3,
  Download,
  FileText,
  Printer,
  Search,
  Receipt,
  X,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { CustomSelect } from '../common/CustomSelect';
import { DatePicker } from '../common/DatePicker';
import { PaginationBar } from '../common/PaginationBar';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { getInvoiceTotal, getInvoicePaid, getInvoiceStatus, getPaymentAmount } from '../../utils/financeCalculations';
import { MODE_PAIEMENT_LABELS } from '../../utils/feeTranches';
import { showToast } from '../common/ToastNotification';
import type { TypeFraisScolaire, FactureEleve, TransactionPaiement, ClasseScolaire } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface FeeTypeDetailModalProps {
  feeType: TypeFraisScolaire;
  invoices: FactureEleve[];
  payments: TransactionPaiement[];
  classes: ClasseScolaire[];
  onClose: () => void;
  onViewReceipt?: (payment: TransactionPaiement) => void;
}

const STATUS_COLORS = {
  PAYE: '#10b981',
  PARTIEL: '#f59e0b',
  NON_PAYE: '#ef4444',
};

const TABS = [
  { key: 'historique', label: 'Historique', icon: Table },
  { key: 'repartition', label: 'Répartition par classe', icon: BarChart3 },
  { key: 'analyse', label: 'Analyse', icon: PieChart },
  { key: 'export', label: 'Export', icon: Download },
];

export const FeeTypeDetailModal: React.FC<FeeTypeDetailModalProps> = ({
  feeType,
  invoices,
  payments,
  classes,
  onClose,
  onViewReceipt,
}) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [activeTab, setActiveTab] = useState<string>('historique');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('dateEcheance');
  const [receiptsInvoice, setReceiptsInvoice] = useState<FactureEleve | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const feeInvoices = useMemo(() => {
    return invoices.filter(inv => inv.lignes?.some(l => l.feeTypeId === feeType.id));
  }, [invoices, feeType.id]);

  const relevantPayments = useMemo(() => {
    const invoiceIds = new Set(feeInvoices.map(i => i.id));
    return payments.filter(p => invoiceIds.has(p.invoiceId || ''));
  }, [payments, feeInvoices]);

  const stats = useMemo(() => {
    let attendu = 0;
    let paye = 0;
    const byClass = new Map<string, { code: string; nom: string; attendu: number; paye: number; count: number; reste: number }>();

    for (const inv of feeInvoices) {
      const invoiceTotal = getInvoiceTotal(inv, currency);
      const invoicePaid = getInvoicePaid(inv, payments, currency);
      const reste = Math.max(0, invoiceTotal - invoicePaid);
      attendu += invoiceTotal;
      paye += invoicePaid;

      const cls = classes.find(c => c.nom === inv.nomClasse);
      const key = inv.nomClasse || '—';
      const cur = byClass.get(key) || { code: cls?.optionCode || cls?.cycleCode || '—', nom: inv.nomClasse || '—', attendu: 0, paye: 0, count: 0, reste: 0 };
      cur.attendu += invoiceTotal;
      cur.paye += invoicePaid;
      cur.reste += reste;
      cur.count += 1;
      byClass.set(key, cur);
    }

    return {
      attendu,
      paye,
      reste: Math.max(0, attendu - paye),
      taux: attendu > 0 ? Math.round((paye / attendu) * 100) : 0,
      byClass: Array.from(byClass.values()).sort((a, b) => b.reste - a.reste),
    };
  }, [feeInvoices, payments, currency, classes]);

  const filteredInvoices = useMemo(() => {
    const list = feeInvoices.filter(inv => {
      const matchesSearch = !search || [inv.nomEleve, inv.nomClasse, inv.numeroFacture].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchesClass = !classFilter || inv.nomClasse === classFilter;
      const invStatus = getInvoiceStatus(inv, payments, currency);
      const matchesStatus = !statusFilter || invStatus === statusFilter;
      const d = inv.dateEcheance?.split('T')[0] || '';
      const matchesDate = (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      return matchesSearch && matchesClass && matchesStatus && matchesDate;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'dateEcheance':
          return (b.dateEcheance || '').localeCompare(a.dateEcheance || '');
        case 'montantTotal':
          return (getInvoiceTotal(b, currency) || 0) - (getInvoiceTotal(a, currency) || 0);
        case 'resteDu': {
          const remA = getInvoiceTotal(a, currency) - getInvoicePaid(a, payments, currency);
          const remB = getInvoiceTotal(b, currency) - getInvoicePaid(b, payments, currency);
          return remB - remA;
        }
        case 'nomEleve':
          return (a.nomEleve || '').localeCompare(b.nomEleve || '');
        default:
          return 0;
      }
    });
  }, [feeInvoices, search, classFilter, statusFilter, dateFrom, dateTo, sortBy, currency, payments]);

  const { paginated: paginatedInvoices, ...invoicePagination } = usePagination(filteredInvoices, { defaultPageSize: 10 });

  const byClassData = useMemo(() => {
    return stats.byClass.map(c => ({
      name: c.nom,
      attendu: c.attendu,
      paye: c.paye,
      reste: c.reste,
    }));
  }, [stats.byClass]);

  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of feeInvoices) {
      const statut = getInvoiceStatus(inv, payments, currency);
      map.set(statut, (map.get(statut) || 0) + 1);
    }
    return Array.from(map.entries()).map(([statut, value]) => ({
      name: statut === 'PAYE' ? 'Soldé' : statut === 'PARTIEL' ? 'Partiel' : 'Impayé',
      value,
      color: STATUS_COLORS[statut as keyof typeof STATUS_COLORS] || '#94a3b8',
    }));
  }, [feeInvoices]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { mois: string; attendu: number; paye: number }>();
    for (const inv of feeInvoices) {
      const month = (inv.dateEcheance || '').slice(0, 7);
      if (!month) continue;
      const cur = map.get(month) || { mois: month, attendu: 0, paye: 0 };
      cur.attendu += getInvoiceTotal(inv, currency);
      map.set(month, cur);
    }
    for (const p of relevantPayments) {
      const month = (p.dateCreation || '').slice(0, 7);
      if (!month) continue;
      const cur = map.get(month) || { mois: month, attendu: 0, paye: 0 };
      cur.paye += getPaymentAmount(p, currency);
      map.set(month, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.mois.localeCompare(b.mois));
  }, [feeInvoices, relevantPayments, currency, exchangeRate]);

  const exportCSV = () => {
    const header = 'Élève;Classe;Numéro facture;Montant;Payé;Reste;Statut;Échéance\n';
    const rows = filteredInvoices.map(inv => {
      const total = getInvoiceTotal(inv, currency);
      const paid = getInvoicePaid(inv, payments, currency);
      const reste = Math.max(0, total - paid);
      const statut = getInvoiceStatus(inv, payments, currency);
      return `${inv.nomEleve || ''};${inv.nomClasse || ''};${inv.numeroFacture || ''};${total.toFixed(2)};${paid.toFixed(2)};${reste.toFixed(2)};${statut};${inv.dateEcheance?.split('T')[0] || ''}`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${feeType.nom.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPage = () => {
    window.print();
  };

  const downloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable').catch(() => null);
      if (!autoTableModule) {
        showToast('Erreur export PDF', 'jspdf-autotable non disponible.', 'error');
        return;
      }
      const autoTable = (autoTableModule as any).default;

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const margin = 12;
      const fileName = `${feeType.nom.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      // Haut de page
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('ECOLISA - Gestion scolaire', margin, 15);
      doc.text(`Généré le ${now}`, pageWidth - margin, 15, { align: 'right' });

      // Titre centré
      doc.setFontSize(22);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(feeType.nom, pageWidth / 2, 30, { align: 'center' });

      // Sous-titre
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.setFont('helvetica', 'normal');
      const subtitle = `${feeType.categorie.replace(/_/g, ' ')} · ${MODE_PAIEMENT_LABELS[feeType.modePaiement || 'UNIQUE']} · Montant : ${fmt(feeType.montant, feeType.devise)}`;
      doc.text(subtitle, pageWidth / 2, 38, { align: 'center' });

      // Ligne décorative sous le titre
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.4);
      doc.line(margin, 43, pageWidth - margin, 43);

      // Tableau récapitulatif
      autoTable(doc, {
        startY: 50,
        margin: { left: margin, right: margin },
        head: [['Indicateur', 'Valeur']],
        body: [
          ['Total attendu', fmt(stats.attendu)],
          ['Total payé', fmt(stats.paye)],
          ['Reste à recouvrir', fmt(stats.reste)],
          ['Taux de recouvrement', `${stats.taux}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { fontSize: 10, textColor: 40 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 247, 250], cellWidth: 70 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 'auto' },
        },
        styles: { cellPadding: 3, overflow: 'linebreak' },
        tableWidth: 'wrap',
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 90;

      // Titre de section
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text('Détail des factures', margin, finalY + 12);

      // Tableau des factures
      const tableRows = filteredInvoices.map(inv => {
        const total = getInvoiceTotal(inv, currency);
        const paid = getInvoicePaid(inv, payments, currency);
        const reste = Math.max(0, total - paid);
        const statut = getInvoiceStatus(inv, payments, currency);
        return [
          inv.nomEleve || '',
          inv.nomClasse || '',
          inv.numeroFacture || '',
          fmt(total),
          fmt(paid),
          fmt(reste),
          statut === 'PAYE' ? 'Soldé' : statut === 'PARTIEL' ? 'Partiel' : 'Impayé',
          inv.dateEcheance?.split('T')[0] || '—',
        ];
      });

      autoTable(doc, {
        startY: finalY + 18,
        margin: { left: margin, right: margin },
        head: [['Élève', 'Classe', 'N° Facture', 'Montant', 'Payé', 'Reste', 'Statut', 'Échéance']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8, textColor: 40, valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 252] },
        styles: { cellPadding: 1.8, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 35, font: 'courier' },
          3: { halign: 'right', cellWidth: 18 },
          4: { halign: 'right', cellWidth: 18 },
          5: { halign: 'right', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 20, font: 'courier' },
        },
        tableWidth: 'wrap',
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          const pageNumber = data.pageNumber;
          doc.setFontSize(8);
          doc.setTextColor(130, 130, 130);
          doc.text(`ECOLISA - Page ${pageNumber} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        },
      });

      doc.save(fileName);
      showToast('PDF téléchargé', `Le détail de ${feeType.nom} a été enregistré.`, 'success');
    } catch (err) {
      console.error('Erreur export PDF :', err);
      showToast('Erreur export PDF', 'Une erreur est survenue.', 'error');
    }
  };

  const handleViewReceipt = (p: TransactionPaiement) => {
    onViewReceipt?.(p);
  };

  const uniqueClasses = Array.from(new Set(feeInvoices.map(i => i.nomClasse).filter(Boolean))).sort();

  return (
    <div ref={printRef} className="w-full h-full animate-fade-in" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <div className="w-full p-5 sm:p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{feeType.nom}</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {feeType.categorie.replace(/_/g, ' ')} · {MODE_PAIEMENT_LABELS[feeType.modePaiement || 'UNIQUE']} · {fmt(feeType.montant, feeType.devise)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div
            onClick={() => { setSearch(''); setClassFilter(''); setStatusFilter(''); setActiveTab('historique'); }}
            className="p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total attendu</p>
            <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{fmt(stats.attendu)}</p>
          </div>
          <div
            onClick={() => { setStatusFilter('PAYE'); setActiveTab('historique'); }}
            className="p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total payé</p>
            <p className="text-lg font-black text-emerald-600">{fmt(stats.paye)}</p>
          </div>
          <div
            onClick={() => { setStatusFilter('NON_PAYE'); setActiveTab('historique'); }}
            className="p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reste à recouvrer</p>
            <p className="text-lg font-black text-rose-600">{fmt(stats.reste)}</p>
          </div>
          <div
            onClick={() => setActiveTab('analyse')}
            className="p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Taux de recouvrement</p>
            <p className="text-lg font-black text-amber-600">{stats.taux}%</p>
          </div>
        </div>

        <div className="flex gap-2 p-1.5 rounded-2xl mb-6" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'historique' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher élève, classe, facture..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold outline-none"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <CustomSelect
                options={[{ value: '', label: 'Toutes classes' }, ...uniqueClasses.map(c => ({ value: c, label: c }))]}
                value={classFilter}
                onChange={setClassFilter}
                className="w-40"
              />
              <CustomSelect
                options={[{ value: '', label: 'Tous statuts' }, { value: 'PAYE', label: 'Soldé' }, { value: 'PARTIEL', label: 'Partiel' }, { value: 'NON_PAYE', label: 'Impayé' }]}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-36"
              />
              <CustomSelect
                options={[
                  { value: 'dateEcheance', label: 'Tri : Échéance' },
                  { value: 'montantTotal', label: 'Tri : Montant' },
                  { value: 'resteDu', label: 'Tri : Reste dû' },
                  { value: 'nomEleve', label: 'Tri : Élève' },
                ]}
                value={sortBy}
                onChange={setSortBy}
                className="w-40"
              />
              <div className="flex items-center gap-2">
                <DatePicker value={dateFrom} onChange={setDateFrom} className="w-36" />
                <span className="text-xs text-slate-400">-</span>
                <DatePicker value={dateTo} onChange={setDateTo} className="w-36" />
              </div>
              {(search || classFilter || statusFilter || dateFrom || dateTo) && (
                <button
                  onClick={() => { setSearch(''); setClassFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setSortBy('dateEcheance'); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Réinitialiser
                </button>
              )}
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-xs">
                <thead style={{ background: 'var(--bg-sunken)' }}>
                  <tr className="text-left text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-3 py-2.5">Élève</th>
                    <th className="px-3 py-2.5">Classe</th>
                    <th className="px-3 py-2.5">N° Facture</th>
                    <th className="px-3 py-2.5 text-right">Montant</th>
                    <th className="px-3 py-2.5 text-right">Payé</th>
                    <th className="px-3 py-2.5 text-right">Reste</th>
                    <th className="px-3 py-2.5">Statut</th>
                    <th className="px-3 py-2.5">Échéance</th>
                    <th className="px-3 py-2.5 text-center">Reçu</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map(inv => {
                    const total = getInvoiceTotal(inv, currency);
                    const paid = getInvoicePaid(inv, payments, currency);
                    const reste = Math.max(0, total - paid);
                    const invStatus = getInvoiceStatus(inv, payments, currency);
                    const invPayments = payments.filter(p => p.invoiceId === inv.id);
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => {
                          const invPayments = payments.filter(p => p.invoiceId === inv.id);
                          if (invPayments.length > 0) setReceiptsInvoice(inv);
                          else { setSearch(inv.nomEleve || ''); setClassFilter(''); setActiveTab('historique'); }
                        }}
                        className="border-t cursor-pointer hover:bg-slate-500/5 transition-all"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{inv.nomEleve}</td>
                        <td className="px-3 py-2">{inv.nomClasse}</td>
                        <td className="px-3 py-2 font-mono">{inv.numeroFacture}</td>
                        <td className="px-3 py-2 text-right font-bold">{fmt(total)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmt(paid)}</td>
                        <td className="px-3 py-2 text-right font-black" style={{ color: reste > 0 ? '#ef4444' : '#10b981' }}>{fmt(reste)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${invStatus === 'PAYE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : invStatus === 'PARTIEL' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'}`}>
                            {invStatus === 'PAYE' ? 'Soldé' : invStatus === 'PARTIEL' ? 'Partiel' : 'Impayé'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-400 font-mono">{inv.dateEcheance?.split('T')[0] || '—'}</td>
                        <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {invPayments.length > 0 ? (
                            <button
                              onClick={() => setReceiptsInvoice(inv)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-all"
                              title="Voir les reçus"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              {invPayments.length > 1 ? `${invPayments.length} reçus` : 'Reçu'}
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {paginatedInvoices.length === 0 && (
                <div className="p-8 text-center text-sm font-bold text-slate-400">Aucune facture trouvée pour ce type de frais.</div>
              )}
            </div>
            <PaginationBar
              totalItems={invoicePagination.total}
              currentPage={invoicePagination.page}
              pageSize={invoicePagination.pageSize}
              onPageChange={invoicePagination.setPage}
              onPageSizeChange={invoicePagination.setPageSize}
            />
          </div>
        )}

        {activeTab === 'repartition' && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-xs">
                <thead style={{ background: 'var(--bg-sunken)' }}>
                  <tr className="text-left text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-3 py-2.5">Classe</th>
                    <th className="px-3 py-2.5 text-right">Nombre</th>
                    <th className="px-3 py-2.5 text-right">Attendu</th>
                    <th className="px-3 py-2.5 text-right">Payé</th>
                    <th className="px-3 py-2.5 text-right">Reste</th>
                    <th className="px-3 py-2.5 text-right">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byClass.map((c, i) => (
                    <tr
                      key={i}
                      onClick={() => { setClassFilter(c.nom); setActiveTab('historique'); }}
                      className="border-t cursor-pointer hover:bg-slate-500/5 transition-all"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{c.nom}</td>
                      <td className="px-3 py-2 text-right font-bold">{c.count}</td>
                      <td className="px-3 py-2 text-right font-bold">{fmt(c.attendu)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmt(c.paye)}</td>
                      <td className="px-3 py-2 text-right font-black text-rose-600">{fmt(c.reste)}</td>
                      <td className="px-3 py-2 text-right font-black text-amber-600">{c.attendu > 0 ? Math.round((c.paye / c.attendu) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="h-72 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byClassData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: 12, fontSize: 12 }}
                    formatter={(value: any, name: any) => [fmt(value), name]}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                  <Bar dataKey="attendu" fill="#6366f1" radius={[4, 4, 0, 0]} name="Attendu" />
                  <Bar dataKey="paye" fill="#10b981" radius={[4, 4, 0, 0]} name="Payé" />
                  <Bar dataKey="reste" fill="#ef4444" radius={[4, 4, 0, 0]} name="Reste" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'analyse' && (
          <div className="space-y-5 animate-fade-in">
            <div className="h-72 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Évolution mensuelle</p>
              {monthlyData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">Aucune donnée mensuelle disponible.</div>
              ) : (
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mois" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.slice(5)}/${v.slice(0,4)}`} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: 12, fontSize: 12 }}
                      formatter={(value: any, name: any) => [fmt(value), name]}
                      labelFormatter={(label: any) => `Mois : ${label.slice(5)}/${label.slice(0,4)}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                    <Bar dataKey="attendu" fill="#6366f1" radius={[4, 4, 0, 0]} name="Attendu" />
                    <Bar dataKey="paye" fill="#10b981" radius={[4, 4, 0, 0]} name="Payé" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="h-72 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Répartition par statut</p>
              {statusData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">Aucune facture pour ce type de frais.</div>
              ) : (
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="40%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={50}
                      paddingAngle={3}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: 12, fontSize: 12 }}
                      formatter={(value: any, name: any) => [value, name]}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button onClick={exportCSV} className="p-4 rounded-xl border hover:bg-slate-500/5 transition-all text-left" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                <FileText className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Exporter CSV</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Télécharger l'historique au format CSV</p>
              </button>
              <button onClick={downloadPDF} className="p-4 rounded-xl border hover:bg-slate-500/5 transition-all text-left" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                <Download className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Télécharger PDF</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Enregistrer la page au format PDF</p>
              </button>
              <button onClick={printPage} className="p-4 rounded-xl border hover:bg-slate-500/5 transition-all text-left" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                <Printer className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Imprimer</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ouvrir la fenêtre d'impression</p>
              </button>
            </div>
          </div>
        )}

        {receiptsInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={() => setReceiptsInvoice(null)}>
            <div
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border shadow-2xl p-5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Reçus — {receiptsInvoice.nomEleve}</h4>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{receiptsInvoice.numeroFacture} · {receiptsInvoice.nomClasse}</p>
                </div>
                <button onClick={() => setReceiptsInvoice(null)} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs">
                  <thead style={{ background: 'var(--bg-sunken)' }}>
                    <tr className="text-left text-slate-500 dark:text-slate-400 font-bold">
                      <th className="px-3 py-2.5">N° Reçu</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Mode</th>
                      <th className="px-3 py-2.5 text-right">Montant</th>
                      <th className="px-3 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments
                      .filter(p => p.invoiceId === receiptsInvoice.id)
                      .map((p, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-3 py-2 font-mono">{p.numeroRecu}</td>
                          <td className="px-3 py-2">{p.dateCreation?.split('T')[0] || '—'}</td>
                          <td className="px-3 py-2">{p.moyenPaiement}</td>
                          <td className="px-3 py-2 text-right font-black text-emerald-600">{fmt(getPaymentAmount(p, currency))}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => { setReceiptsInvoice(null); onViewReceipt?.(p); }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-all"
                            >
                              <Receipt className="w-3.5 h-3.5" /> Voir
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-start">
                <button
                  onClick={() => setReceiptsInvoice(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};