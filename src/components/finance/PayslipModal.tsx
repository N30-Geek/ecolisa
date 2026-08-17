import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  FileDown,
  Edit3,
  Save,
  Plus,
  Trash2,
  Check,
  CreditCard,
  Building2,
  Calendar,
  User,
  Briefcase,
  Wallet,
  DollarSign,
  Hash,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import type { FichePaie, LigneFichePaie, MembrePersonnel } from '../../types';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: MembrePersonnel;
  fiche: FichePaie;
  onChange: (fiche: FichePaie) => void;
  onPay?: () => void;
  onPrint?: () => void;
  onExportPDF?: () => void;
}

const MODE_OPTIONS = [
  { value: 'CASH', label: 'Espèces (Cash)' },
  { value: 'BANQUE', label: 'Virement Bancaire' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
];

const LIGNE_TYPES: LigneFichePaie['type'][] = ['PRIME', 'DEDUCTION', 'AVANCE'];

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  staff,
  fiche,
  onChange,
  onPay,
  onPrint,
  onExportPDF,
}) => {
  const { currency, exchangeRate, format } = useSchoolConfig();
  const printRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FichePaie>(fiche);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => { setDraft(fiche); }, [fiche]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const totals = useMemo(() => {
    const totalPrimes = draft.lignes.filter(l => l.type === 'PRIME').reduce((a, l) => a + convertCurrency(l.montant, l.devise, currency, exchangeRate), 0);
    const totalDeductions = draft.lignes.filter(l => l.type === 'DEDUCTION').reduce((a, l) => a + convertCurrency(l.montant, l.devise, currency, exchangeRate), 0);
    const totalAvances = draft.lignes.filter(l => l.type === 'AVANCE').reduce((a, l) => a + convertCurrency(l.montant, l.devise, currency, exchangeRate), 0);
    const salaireBase = convertCurrency(draft.salaireBase, draft.devise, currency, exchangeRate);
    const salaireBrut = salaireBase + totalPrimes;
    const salaireNet = salaireBrut - totalDeductions - totalAvances;
    return { totalPrimes, totalDeductions, totalAvances, salaireBrut, salaireNet };
  }, [draft.lignes, draft.salaireBase, draft.devise, currency, exchangeRate]);

  const updateDraft = (updates: Partial<FichePaie>) => setDraft(prev => ({ ...prev, ...updates }));

  const addLigne = (type: LigneFichePaie['type']) => {
    const libelle = type === 'PRIME' ? 'Prime' : type === 'DEDUCTION' ? 'Déduction' : 'Avance';
    setDraft(prev => ({
      ...prev,
      lignes: [...prev.lignes, { id: uuid(), libelle, montant: 0, devise: currency, type }],
    }));
  };

  const updateLigne = (id: string, updates: Partial<LigneFichePaie>) => {
    setDraft(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => l.id === id ? { ...l, ...updates } : l),
    }));
  };

  const removeLigne = (id: string) => {
    setDraft(prev => ({ ...prev, lignes: prev.lignes.filter(l => l.id !== id) }));
  };

  const handleSave = () => {
    onChange({
      ...draft,
      ...totals,
    });
    setEditing(false);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    const electron = (window as any).electronAPI;
    if (electron?.printReceipt) {
      try {
        await electron.printReceipt({
          printerName: '',
          silent: false,
          html: printRef.current?.innerHTML,
        });
        setIsPrinting(false);
        return;
      } catch (err) { console.warn('[Payslip] printReceipt failed:', err); }
    }
    const originalTitle = document.title;
    document.title = `Fiche_Paie_${draft.numeroFiche || draft.staffName}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
      setIsPrinting(false);
    }, 250);
  };

  const periodeLabel = (p: string) => {
    const [m, y] = p.split('-');
    const monthNames = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return `${monthNames[parseInt(m, 10)] || m} ${y}`;
  };

  const schoolName = 'ECOLISA ENTERPRISE';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl border shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Fiche de paie</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{draft.staffName} · {periodeLabel(draft.periode)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all">
                <Save className="w-3.5 h-3.5" /> Enregistrer
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border hover:bg-slate-500/10 transition-all" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <Edit3 className="w-3.5 h-3.5" /> Modifier
              </button>
            )}
            <button onClick={handlePrint} disabled={isPrinting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border hover:bg-indigo-500/10 text-indigo-600 transition-all" style={{ borderColor: 'var(--border)' }}>
              <Printer className="w-3.5 h-3.5" /> {isPrinting ? '...' : 'Imprimer'}
            </button>
            <button onClick={onExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border hover:bg-rose-500/10 text-rose-600 transition-all" style={{ borderColor: 'var(--border)' }}>
              <FileDown className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Editor panel */}
          {editing && (
            <div className="p-4 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Période</label>
                  <input type="text" value={draft.periode} onChange={e => updateDraft({ periode: e.target.value })} className="input w-full text-xs py-2" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mode de paiement</label>
                  <CustomSelect options={MODE_OPTIONS} value={draft.modePaiement} onChange={v => updateDraft({ modePaiement: v as any })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Référence</label>
                  <input type="text" value={draft.reference || ''} onChange={e => updateDraft({ reference: e.target.value })} className="input w-full text-xs py-2" placeholder="N° virement / opération" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Primes, déductions et avances</label>
                  <div className="flex items-center gap-1.5">
                    {LIGNE_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => addLigne(t)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all hover:bg-indigo-500/10"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      >
                        <Plus className="w-3 h-3" /> {t === 'PRIME' ? 'Prime' : t === 'DEDUCTION' ? 'Déduction' : 'Avance'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {draft.lignes.map((l, idx) => (
                    <div key={l.id} className="flex items-center gap-2 p-2 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                      <span className="w-6 text-[10px] font-black text-slate-400">{idx + 1}</span>
                      <input
                        type="text"
                        value={l.libelle}
                        onChange={e => updateLigne(l.id, { libelle: e.target.value })}
                        className="input flex-1 text-xs py-1.5"
                        placeholder="Libellé"
                      />
                      <NumberInput
                        value={l.montant}
                        onChange={v => updateLigne(l.id, { montant: v })}
                        min={0}
                        className="input w-28 text-right text-xs py-1.5"
                      />
                      <select
                        value={l.devise}
                        onChange={e => updateLigne(l.id, { devise: e.target.value })}
                        className="input text-xs py-1.5 w-20"
                      >
                        <option value="USD">USD</option>
                        <option value="CDF">CDF</option>
                      </select>
                      <button onClick={() => removeLigne(l.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-black uppercase text-slate-500">Salaire brut</p>
                  <p className="text-lg font-black text-indigo-600">{fmt(totals.salaireBrut)}</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-black uppercase text-slate-500">Total primes</p>
                  <p className="text-lg font-black text-emerald-600">{fmt(totals.totalPrimes)}</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-black uppercase text-slate-500">Total retenus</p>
                  <p className="text-lg font-black text-rose-600">{fmt(totals.totalDeductions + totals.totalAvances)}</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-black uppercase text-slate-500">Net à payer</p>
                  <p className="text-lg font-black text-emerald-700">{fmt(totals.salaireNet)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payslip preview */}
          <div ref={printRef} className="bg-white text-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 max-w-[210mm] mx-auto" id="payslip-print-section">
            {/* En-tête entreprise */}
            <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">
                  E
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{schoolName}</h2>
                  <p className="text-[11px] text-slate-500">Gestion Scolaire EPST — R.D. Congo</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Fiche de paie</p>
                <p className="text-2xl font-black text-indigo-600">{periodeLabel(draft.periode)}</p>
                <p className="text-[11px] font-mono text-slate-400">N° {draft.numeroFiche || draft.id?.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            {/* Info employé */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Employé</p>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-900 flex items-center gap-2"><User className="w-3.5 h-3.5 text-indigo-500" /> {draft.staffName}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-slate-400" /> {draft.staffRole || staff.role}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-slate-400" /> Matricule : {draft.staffMatricule || staff.matricule || staff.numeroMatriculeEPST || '—'}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Paiement</p>
                <div className="space-y-1">
                  <p className="text-xs text-slate-600 flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 text-indigo-500" /> {draft.modePaiement.replace('_', ' ')}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-slate-400" /> {draft.staffBankAccount || staff.banqueNom || '—'}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-2"><PhoneIcon /> {draft.staffMobileMoney || staff.mobileMoneyNumero || '—'}</p>
                </div>
              </div>
            </div>

            {/* Tableau de paie */}
            <table className="w-full text-xs mb-6 border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white text-left">
                  <th className="p-3 rounded-l-lg">Libellé</th>
                  <th className="p-3 text-right">Base / Unité</th>
                  <th className="p-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-3 font-bold text-slate-900">Salaire de base</td>
                  <td className="p-3 text-right text-slate-600">{draft.heuresPrestees ? `${draft.heuresPrestees} h` : 'Mensuel'}</td>
                  <td className="p-3 text-right font-black text-slate-900">{format(draft.salaireBase, draft.devise)}</td>
                </tr>
                {draft.lignes.filter(l => l.type === 'PRIME').map(l => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="p-3 text-emerald-700 font-medium">+ {l.libelle}</td>
                    <td className="p-3 text-right text-slate-500">Prime</td>
                    <td className="p-3 text-right font-black text-emerald-700">{format(l.montant, l.devise)}</td>
                  </tr>
                ))}
                {draft.lignes.filter(l => l.type === 'DEDUCTION').map(l => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="p-3 text-rose-700 font-medium">- {l.libelle}</td>
                    <td className="p-3 text-right text-slate-500">Retenue</td>
                    <td className="p-3 text-right font-black text-rose-700">-{format(l.montant, l.devise)}</td>
                  </tr>
                ))}
                {draft.lignes.filter(l => l.type === 'AVANCE').map(l => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="p-3 text-amber-700 font-medium">- {l.libelle}</td>
                    <td className="p-3 text-right text-slate-500">Avance</td>
                    <td className="p-3 text-right font-black text-amber-700">-{format(l.montant, l.devise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totaux */}
            <div className="flex justify-end mb-6">
              <div className="w-full sm:w-2/3 space-y-2">
                <div className="flex justify-between text-xs text-slate-600 border-b border-slate-100 pb-1">
                  <span>Salaire brut</span>
                  <span className="font-black">{fmt(totals.salaireBrut)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 border-b border-slate-100 pb-1">
                  <span>Total primes</span>
                  <span className="font-black">+ {fmt(totals.totalPrimes)}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-700 border-b border-slate-100 pb-1">
                  <span>Total retenues</span>
                  <span className="font-black">- {fmt(totals.totalDeductions)}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-700 border-b border-slate-100 pb-1">
                  <span>Total avances</span>
                  <span className="font-black">- {fmt(totals.totalAvances)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600" /> NET À PAYER</span>
                  <span className="text-emerald-700 text-base">{fmt(totals.salaireNet)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-8">Signature employé</p>
                <div className="h-12 border-b border-slate-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-8">Signature employeur</p>
                <div className="h-12 border-b border-slate-300" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Document établi le {new Date().toLocaleDateString('fr-FR')} · {draft.caissier || 'Caissier'} · {draft.reference || 'Réf. interne'}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${draft.statut === 'PAYE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
              {draft.statut === 'PAYE' ? 'PAYÉ' : 'BROUILLON'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border text-[11px] font-black transition-all hover:bg-slate-500/10" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Fermer
            </button>
            {draft.statut !== 'PAYE' && onPay && (
              <button onClick={onPay} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black hover:bg-emerald-700 transition-all flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Valider & Payer
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body * { visibility: hidden !important; }
          #payslip-print-section, #payslip-print-section * { visibility: visible !important; }
          #payslip-print-section { position: absolute; left: 0; top: 0; width: 210mm; margin: 10mm; box-shadow: none; border: none; }
        }
      `}</style>
    </div>,
    document.body
  );
};

const PhoneIcon = () => (
  <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
