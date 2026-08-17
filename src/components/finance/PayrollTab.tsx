import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet,
  Check,
  AlertTriangle,
  Plus,
  Search,
  Printer,
  FileText,
  FileDown,
  Trash2,
  Edit3,
  CheckCircle2,
  DollarSign,
  Users,
  Calendar,
  MoreVertical,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { PaginationBar } from '../common/PaginationBar';
import { ActionMenu } from '../common/ActionMenu';
import { PayslipModal } from './PayslipModal';
import type { DepenseCaisse, FichePaie, LigneFichePaie, MembrePersonnel } from '../../types';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

interface PayrollTabProps {
  activeSchoolYear?: string;
}

const MODE_OPTIONS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANQUE', label: 'Virement' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
];

export const PayrollTab: React.FC<PayrollTabProps> = ({ activeSchoolYear }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  });
  const [staff, setStaff] = useState<MembrePersonnel[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [caissier, setCaissier] = useState('Caissier');
  const [fiches, setFiches] = useState<FichePaie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [genStep, setGenStep] = useState<'select' | 'edit' | 'preview'>('select');
  const [draftFiche, setDraftFiche] = useState<FichePaie | null>(null);
  const [previewFiche, setPreviewFiche] = useState<FichePaie | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    (window as any).electronAPI?.getCurrentSession?.().then((s: any) => {
      if (s?.nom) setCaissier(`${s.prenom || ''} ${s.nom}`.trim());
    }).catch(() => {});
    Promise.all([
      LocalDatabaseService.getStaff().then(res => setStaff(res || [])).catch(() => setStaff([])),
      LocalDatabaseService.getSchoolYears().then(setYears).catch(() => {}),
      LocalDatabaseService.getFichesPaie().then(res => setFiches(res || [])).catch(() => setFiches([])),
    ]).finally(() => setLoading(false));
  }, []);

  const activeYear = useMemo(() => years.find(y => y.id === activeSchoolYear || y.statut === 'EN_COURS') || years[0], [years, activeSchoolYear]);

  const filteredFiches = useMemo(() => {
    return fiches.filter(f => {
      const matchesSearch = !search || [f.staffName, f.staffMatricule, f.numeroFiche].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchesPeriod = f.periode === selectedMonth;
      return matchesSearch && matchesPeriod;
    }).sort((a, b) => new Date(b.datePaiement || 0).getTime() - new Date(a.datePaiement || 0).getTime());
  }, [fiches, search, selectedMonth]);

  const paginatedFiches = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFiches.slice(start, start + pageSize);
  }, [filteredFiches, page, pageSize]);

  const stats = useMemo(() => {
    const periodFiches = fiches.filter(f => f.periode === selectedMonth);
    const totalNet = periodFiches.reduce((a, f) => a + convertCurrency(f.salaireNet, f.devise, currency, exchangeRate), 0);
    const totalPaid = periodFiches.filter(f => f.statut === 'PAYE').reduce((a, f) => a + convertCurrency(f.salaireNet, f.devise, currency, exchangeRate), 0);
    const staffActif = staff.filter(s => s.statut === 'ACTIF').length;
    const fichesPayees = periodFiches.filter(f => f.statut === 'PAYE').length;
    return { totalNet, totalPaid, staffActif, fichesPayees, count: periodFiches.length };
  }, [fiches, staff, selectedMonth, currency, exchangeRate]);

  // ── GÉNÉRATION DE FICHE DE PAIE ──────────────────────────────────────────
  const startGeneration = () => { setShowGenerator(true); setGenStep('select'); setSelectedStaffId(''); setDraftFiche(null); };

  const selectedStaff = useMemo(() => staff.find(s => s.id === selectedStaffId), [staff, selectedStaffId]);

  const buildDraftFiche = (s: MembrePersonnel): FichePaie => {
    const lignes: LigneFichePaie[] = [];
    return {
      id: uuid(),
      staffId: s.id,
      staffName: `${s.prenom || ''} ${s.nom}`.trim(),
      staffMatricule: s.matricule || s.numeroMatriculeEPST,
      staffRole: s.role,
      staffFunction: s.titreOfficiel,
      staffBankAccount: s.numeroCompteBancaire,
      staffMobileMoney: s.mobileMoneyNumero,
      staffPaymentMode: s.modeVersementSalaire,
      periode: selectedMonth,
      schoolYearId: activeYear?.id,
      anneeScolaire: activeYear?.nom,
      salaireBase: s.salaireBase || 0,
      devise: s.devise || 'USD',
      heuresPrestees: s.heuresPresteesMois,
      lignes,
      salaireBrut: s.salaireBase || 0,
      totalPrimes: 0,
      totalDeductions: 0,
      totalAvances: 0,
      salaireNet: s.salaireBase || 0,
      modePaiement: (s.modeVersementSalaire as any) || 'CASH',
      caissier,
      statut: 'BROUILLON',
      numeroFiche: `FP-${Date.now()}`,
      notes: '',
    };
  };

  const handleSelectStaff = () => {
    if (!selectedStaff) return;
    const draft = buildDraftFiche(selectedStaff);
    setDraftFiche(draft);
    setGenStep('edit');
  };

  const handleFicheChange = (updated: FichePaie) => {
    setDraftFiche(updated);
  };

  const saveFiche = async (fiche: FichePaie) => {
    const existing = fiches.find(f => f.id === fiche.id);
    if (existing) {
      await LocalDatabaseService.updateFichePaie(fiche.id, fiche);
      setFiches(prev => prev.map(f => f.id === fiche.id ? fiche : f));
    } else {
      await LocalDatabaseService.addFichePaie(fiche);
      setFiches(prev => [...prev, fiche]);
    }
  };

  const handlePreviewFiche = async () => {
    if (!draftFiche) return;
    await saveFiche(draftFiche);
    setPreviewFiche(draftFiche);
    setShowGenerator(false);
  };

  const handlePayFiche = async (fiche: FichePaie) => {
    if (fiche.statut === 'PAYE') return;
    setPayingId(fiche.id);
    const expense: DepenseCaisse = {
      id: uuid(),
      date: new Date().toISOString(),
      libelle: `Salaire ${fiche.periode} — ${fiche.staffName}`.trim(),
      montant: fiche.salaireNet,
      devise: fiche.devise,
      type: 'SORTIE',
      categorie: 'SALAIRES',
      modePaiement: fiche.modePaiement,
      caissier,
      beneficiaire: fiche.staffName,
      pieceJustificative: fiche.numeroFiche,
      schoolYearId: fiche.schoolYearId,
      origine: 'PAYROLL',
      origineId: fiche.staffId,
    };
    await LocalDatabaseService.addExpense(expense);
    const updated = { ...fiche, statut: 'PAYE' as const, datePaiement: new Date().toISOString(), origineExpenseId: expense.id };
    await LocalDatabaseService.updateFichePaie(fiche.id, updated);
    setFiches(prev => prev.map(f => f.id === fiche.id ? updated : f));
    setPayingId(null);
  };

  const handleDeleteFiche = async (id: string) => {
    if (!window.confirm('Supprimer cette fiche de paie ?')) return;
    await LocalDatabaseService.deleteFichePaie(id);
    setFiches(prev => prev.filter(f => f.id !== id));
  };

  const handleEditFiche = (fiche: FichePaie) => { setDraftFiche(fiche); setShowGenerator(true); setGenStep('edit'); };

  const periodeLabel = (p: string) => {
    const [m, y] = p.split('-');
    const monthNames = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return `${monthNames[parseInt(m, 10)] || m} ${y}`;
  };

  const statusBadge = (statut: FichePaie['statut']) => {
    if (statut === 'PAYE') return <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">PAYÉ</span>;
    if (statut === 'VALIDE') return <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">VALIDÉ</span>;
    return <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">BROUILLON</span>;
  };

  const monthOptions = useMemo(() => {
    const list = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const v = `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      list.push({ value: v, label: periodeLabel(v) });
    }
    return list;
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Paie & Primes</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Générez les fiches de paie et effectuez les versements — {periodeLabel(selectedMonth)}</p>
        </div>
        <div className="flex items-center gap-2">
          <CustomSelect options={monthOptions} value={selectedMonth} onChange={setSelectedMonth} className="w-44" />
          <button onClick={startGeneration} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Plus className="w-3.5 h-3.5" /> État de paie
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Masse salariale nette', val: fmt(stats.totalNet), color: '#6366f1', icon: Wallet },
          { label: 'Déjà payé', val: fmt(stats.totalPaid), color: '#10b981', icon: Check },
          { label: 'Personnel actif', val: String(stats.staffActif), color: '#3b82f6', icon: Users },
          { label: 'Fiches payées', val: `${stats.fichesPayees} / ${stats.count}`, color: '#f59e0b', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}12` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[18px] font-black" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Liste des fiches de paie */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Fiches de paie — {periodeLabel(selectedMonth)}</h3>
            <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{filteredFiches.length}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un employé..."
              className="pl-9 pr-3 py-2 rounded-xl border text-xs outline-none w-56"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
        ) : filteredFiches.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aucune fiche de paie</h4>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Cliquez sur "État de paie" pour générer la première fiche.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b uppercase tracking-wider text-[10px] text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <th className="p-3 text-left">Employé</th>
                    <th className="p-3 text-left">Fonction</th>
                    <th className="p-3 text-right">Salaire base</th>
                    <th className="p-3 text-right">Primes</th>
                    <th className="p-3 text-right">Retenues</th>
                    <th className="p-3 text-right">Net à payer</th>
                    <th className="p-3 text-center">Mode</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {paginatedFiches.map(f => (
                    <tr key={f.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-3">
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{f.staffName}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{f.staffMatricule || f.numeroFiche}</p>
                      </td>
                      <td className="p-3" style={{ color: 'var(--text-muted)' }}>{f.staffRole}</td>
                      <td className="p-3 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(f.salaireBase, f.devise)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">{fmt(f.totalPrimes, f.devise)}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{fmt(f.totalDeductions + f.totalAvances, f.devise)}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700">{fmt(f.salaireNet, f.devise)}</td>
                      <td className="p-3 text-center" style={{ color: 'var(--text-muted)' }}>{f.modePaiement.replace('_', ' ')}</td>
                      <td className="p-3 text-center">{statusBadge(f.statut)}</td>
                      <td className="p-3 text-center">
                        <ActionMenu
                          items={[
                            { label: 'Voir fiche', icon: FileText, onClick: () => setPreviewFiche(f) },
                            { label: 'Imprimer', icon: Printer, onClick: () => setPreviewFiche(f) },
                            ...(f.statut !== 'PAYE' ? [
                              { label: 'Modifier', icon: Edit3, onClick: () => handleEditFiche(f) },
                              { label: 'Payer', icon: DollarSign, onClick: () => handlePayFiche(f), separatorBefore: true },
                            ] : []),
                            { label: 'Supprimer', icon: Trash2, onClick: () => handleDeleteFiche(f.id), danger: true, separatorBefore: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              totalItems={filteredFiches.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Générateur de fiche de paie */}
      {showGenerator && (
        <PayrollGenerator
          step={genStep}
          staff={staff}
          selectedStaffId={selectedStaffId}
          onSelectStaff={setSelectedStaffId}
          onNext={handleSelectStaff}
          draft={draftFiche}
          onDraftChange={handleFicheChange}
          onSave={handlePreviewFiche}
          onClose={() => { setShowGenerator(false); setDraftFiche(null); }}
        />
      )}

      {/* Aperçu fiche de paie */}
      {previewFiche && (
        <PayslipModal
          isOpen
          onClose={() => setPreviewFiche(null)}
          staff={staff.find(s => s.id === previewFiche.staffId) || ({} as MembrePersonnel)}
          fiche={previewFiche}
          onChange={async (updated) => {
            await saveFiche(updated);
            setPreviewFiche(updated);
          }}
          onPay={() => handlePayFiche(previewFiche)}
          onPrint={() => {}}
          onExportPDF={() => {}}
        />
      )}
    </div>
  );
};

// ── WIZARD GÉNÉRATEUR DE FICHE DE PAIE ─────────────────────────────────────
const PayrollGenerator: React.FC<{
  step: 'select' | 'edit' | 'preview';
  staff: MembrePersonnel[];
  selectedStaffId: string;
  onSelectStaff: (id: string) => void;
  onNext: () => void;
  draft: FichePaie | null;
  onDraftChange: (f: FichePaie) => void;
  onSave: () => void;
  onClose: () => void;
}> = ({ step, staff, selectedStaffId, onSelectStaff, onNext, draft, onDraftChange, onSave, onClose }) => {
  const { currency, exchangeRate } = useSchoolConfig();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const staffOptions = [
    { value: '', label: 'Sélectionner un employé' },
    ...staff.filter(s => s.statut === 'ACTIF').map(s => ({
      value: s.id,
      label: `${s.prenom} ${s.nom} · ${s.role}`,
    })),
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Nouvelle fiche de paie</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Étape {step === 'select' ? '1' : '2'} sur 2</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {step === 'select' ? (
            <div className="max-w-md mx-auto space-y-6 py-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Sélectionner l'employé</h4>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Choisissez le membre du personnel à payer ce mois-ci.</p>
              </div>
              <CustomSelect options={staffOptions} value={selectedStaffId} onChange={onSelectStaff} searchable />
              <button
                onClick={onNext}
                disabled={!selectedStaffId}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : draft ? (
            <PayslipModal
              isOpen
              onClose={onClose}
              staff={staff.find(s => s.id === draft.staffId) || ({} as MembrePersonnel)}
              fiche={draft}
              onChange={onDraftChange}
              onPay={onSave}
            />
          ) : null}
        </div>

        {step === 'edit' && draft && (
          <div className="p-4 border-t shrink-0 flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
            <button onClick={onClose} className="px-4 py-2 rounded-xl border text-[11px] font-black" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Annuler
            </button>
            <button onClick={onSave} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black hover:bg-emerald-700 transition-all flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Enregistrer la fiche
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
