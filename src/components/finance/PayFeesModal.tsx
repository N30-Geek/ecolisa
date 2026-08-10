import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, Check, Loader2, User, GraduationCap, School, DoorOpen, ReceiptText, Printer } from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { ReceiptModal } from './ReceiptModal';
import type { FactureEleve, TransactionPaiement, Eleve, ClasseScolaire, TypeFraisScolaire, AnneeScolaireConfig, LigneFacture } from '../../types';

interface PayFeesModalProps {
  activeSchoolYear?: string;
  onClose: () => void;
  onSaved?: () => void;
}

const METHOD_OPTIONS = [
  { value: 'CASH', label: 'Espèces (Cash)' },
  { value: 'BANK', label: 'Virement Bancaire' },
  { value: 'FLEXPAY_MPESA', label: 'M-Pesa (FlexPay)' },
  { value: 'FLEXPAY_ORANGE', label: 'Orange Money' },
  { value: 'FLEXPAY_AIRTEL', label: 'Airtel Money' },
  { value: 'FLUTTERWAVE_CARTE', label: 'Carte Bancaire' },
];

const CYCLES = ['MATERNELLE', 'PRIMAIRE', 'SECONDAIRE_CTEB', 'HUMANITES'];

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const PayFeesModal: React.FC<PayFeesModalProps> = ({ activeSchoolYear, onClose, onSaved }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, src?: string) => formatCurrency(n, currency, src || currency, exchangeRate);

  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [cycle, setCycle] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');

  const [selectedFees, setSelectedFees] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<string>('CASH');
  const [reference, setReference] = useState('');
  const [caissier, setCaissier] = useState('Caissier');
  const [error, setError] = useState<string | null>(null);

  const [createdPayment, setCreatedPayment] = useState<TransactionPaiement | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<FactureEleve | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    (window as any).electronAPI?.getCurrentSession?.().then((s: any) => {
      if (s?.nom) setCaissier(`${s.prenom || ''} ${s.nom}`.trim());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [st, cl, ft, y, inv, pmt] = await Promise.all([
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getFeeTypes(),
        LocalDatabaseService.getSchoolYears(),
        LocalDatabaseService.getInvoices(),
        LocalDatabaseService.getPayments(),
      ]);
      setStudents(st);
      setClasses(cl);
      setFeeTypes(ft);
      setYears(y);
      setInvoices(inv);
      setPayments(pmt);
      setLoading(false);
    };
    load();
  }, [activeSchoolYear]);

  const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];
  const yearId = activeSchoolYear || activeYear?.id || '';

  const cycleOptions = useMemo(() => [
    { value: '', label: 'Sélectionner un cycle' },
    ...CYCLES.map(c => ({ value: c, label: c })),
  ], []);

  const classOptions = useMemo(() => {
    const list = Array.from(new Set(classes.filter(c => !cycle || c.cycleId === cycle).map(c => c.nom)));
    return [{ value: '', label: 'Sélectionner une classe' }, ...list.map(n => ({ value: n, label: n }))];
  }, [classes, cycle]);

  const roomOptions = useMemo(() => {
    const list = Array.from(new Set(classes.filter(c => c.nom === className).map(c => c.salle || '—')));
    return [{ value: '', label: 'Sélectionner une salle' }, ...list.map(r => ({ value: r, label: r }))];
  }, [classes, className]);

  const selectedClass = useMemo(() => classes.find(c => c.nom === className && c.salle === room), [classes, className, room]);

  const studentOptions = useMemo(() => {
    const list = students.filter(s => {
      if (!selectedClass) return false;
      return s.classId === selectedClass.id && (!yearId || s.schoolYearId === yearId);
    });
    return [{ value: '', label: 'Sélectionner un élève' }, ...list.map(s => ({ value: s.id, label: `${s.prenom} ${s.nom} · ${s.registrationNumber}` }))];
  }, [students, selectedClass, yearId]);

  const selectedStudent = useMemo(() => students.find(s => s.id === studentId), [students, studentId]);

  const feeApplies = (ft: TypeFraisScolaire, cls?: ClasseScolaire) => {
    if (ft.actif === false) return false;
    if (ft.schoolYearId && ft.schoolYearId !== yearId && ft.anneeScolaireId !== yearId) return false;
    if (cls?.cycleId && ft.cycleId && ft.cycleId !== 'TOUS' && ft.cycleId !== cls.cycleId) return false;
    if (cls?.optionCode && ft.optionCode && ft.optionCode !== 'TOUS' && ft.optionCode !== cls.optionCode) return false;
    return true;
  };

  const feeBalance = (ft: TypeFraisScolaire) => {
    const expected = convertCurrency(ft.montant, ft.devise, currency, exchangeRate);
    let paid = 0;
    const studentInvoices = invoices.filter(inv => inv.eleveId === studentId);
    for (const inv of studentInvoices) {
      for (const l of inv.lignes || []) {
        if (l.feeTypeId !== ft.id) continue;
        const lineShare = inv.montantTotal > 0 ? (inv.montantPaye * l.montant) / inv.montantTotal : 0;
        paid += convertCurrency(lineShare, inv.devise, currency, exchangeRate);
      }
    }
    return { expected, paid, remaining: Math.max(0, expected - paid) };
  };

  const applicableFees = useMemo(() => {
    if (!selectedClass || !selectedStudent) return [];
    return feeTypes.filter(ft => feeApplies(ft, selectedClass));
  }, [feeTypes, selectedClass, selectedStudent, yearId]);

  const unpaidFees = useMemo(() => {
    return applicableFees
      .map(ft => ({ ...ft, balance: feeBalance(ft) }))
      .filter(f => f.balance.remaining > 0.001)
      .sort((a, b) => (b.montant || 0) - (a.montant || 0));
  }, [applicableFees, invoices, payments, currency, exchangeRate, studentId]);

  useEffect(() => {
    if (unpaidFees.length > 0) {
      const init: Record<string, number> = {};
      unpaidFees.forEach(f => { init[f.id] = Math.round(f.balance.remaining * 100) / 100; });
      setSelectedFees(init);
    }
  }, [unpaidFees]);

  const totalToPay = useMemo(() => Object.entries(selectedFees).reduce((a, [id, val]) => {
    const f = unpaidFees.find(u => u.id === id);
    return a + Math.min(val || 0, f?.balance.remaining || 0);
  }, 0), [selectedFees, unpaidFees]);

  const toggleFee = (id: string) => {
    setSelectedFees(prev => {
      if (id in prev) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      const f = unpaidFees.find(u => u.id === id);
      return { ...prev, [id]: f ? Math.round(f.balance.remaining * 100) / 100 : 0 };
    });
  };

  const setFeeAmount = (id: string, val: number) => {
    const f = unpaidFees.find(u => u.id === id);
    const max = f?.balance.remaining || 0;
    setSelectedFees(prev => ({ ...prev, [id]: Math.max(0, Math.min(val, max)) }));
  };

  const handleSubmit = async () => {
    const chosen = unpaidFees.filter(f => selectedFees[f.id] > 0.001);
    if (!selectedStudent || !selectedClass || chosen.length === 0) {
      setError('Veuillez sélectionner un élève et au moins un frais à régler.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const lines: LigneFacture[] = chosen.map(f => ({
      id: uuid(),
      invoiceId: '',
      feeTypeId: f.id,
      nom: f.nom,
      categorie: f.categorie,
      montant: selectedFees[f.id],
      montantPaye: selectedFees[f.id],
      devise: currency,
    }));

    const totalFacture = lines.reduce((a, l) => a + (l.montant || 0), 0);
    const invoice: FactureEleve = {
      id: uuid(),
      anneeScolaireId: yearId,
      anneeScolaire: activeYear?.nom,
      numeroFacture: `F-${Date.now()}`,
      eleveId: selectedStudent.id,
      studentId: selectedStudent.registrationNumber,
      nomEleve: `${selectedStudent.prenom || ''} ${selectedStudent.nom}`.trim(),
      nomClasse: selectedClass.nom,
      montantTotal: totalFacture,
      montantPaye: totalFacture,
      devise: currency,
      statut: 'PAYE',
      dateEcheance: new Date().toISOString().split('T')[0],
      lignes: lines,
    };

    const savedInvoice = await LocalDatabaseService.addInvoice(invoice);
    const invId = savedInvoice?.id || invoice.id;

    const allocations = chosen.map(f => ({
      feeTypeId: f.id,
      montant: convertCurrency(selectedFees[f.id], currency, currency, exchangeRate),
    }));

    const payment: TransactionPaiement = {
      id: uuid(),
      anneeScolaireId: yearId,
      invoiceId: invId,
      nomEleve: invoice.nomEleve,
      registrationNumber: selectedStudent.registrationNumber,
      montantPaye: totalFacture,
      devise: currency,
      moyenPaiement: method as any,
      reference,
      numeroRecu: `R-${Date.now()}`,
      dateCreation: new Date().toISOString(),
      nomCaissier: caissier,
      jetonQrCode: `qr-${selectedStudent.registrationNumber}-${Date.now()}`,
      allocations,
    };

    await LocalDatabaseService.addPayment(payment);
    setSubmitting(false);
    setCreatedInvoice({ ...invoice, id: invId });
    setCreatedPayment(payment);
    onSaved?.();
  };

  if (createdPayment && createdInvoice) {
    return (
      <ReceiptModal
        isOpen
        onClose={() => { setCreatedPayment(null); setCreatedInvoice(null); onClose(); }}
        payment={createdPayment}
        invoice={createdInvoice}
        feeTypes={feeTypes}
      />
    );
  }

  const setAllMax = () => {
    const init: Record<string, number> = {};
    unpaidFees.forEach(f => { init[f.id] = Math.round(f.balance.remaining * 100) / 100; });
    setSelectedFees(init);
  };

  const resetAll = () => setSelectedFees({});

  const StepIcon = ({ icon: Icon, active, done }: { icon: any; active: boolean; done?: boolean }) => (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-3 shrink-0 transition-all ${active ? 'bg-indigo-500 text-white shadow-md' : done ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700/40 text-slate-400'}`}>
      <Icon className="w-4 h-4" />
    </div>
  );

  const steps = [
    { key: 'cycle', icon: GraduationCap, label: 'Cycle', done: !!cycle },
    { key: 'class', icon: School, label: 'Classe', done: !!className },
    { key: 'room', icon: DoorOpen, label: 'Salle', done: !!room },
    { key: 'student', icon: User, label: 'Élève', done: !!studentId },
  ];
  const currentStep = studentId ? 3 : room ? 2 : className ? 1 : cycle ? 0 : -1;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-2xl)' }}>
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Encaissement des frais scolaires</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Localisez l'élève, cochez les frais à régler, puis validez.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
          ) : (
            <>
              {/* Stepper */}
              <div className="flex items-stretch gap-1 p-1 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                {steps.map((s, idx) => (
                  <div key={s.key} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${idx <= currentStep ? 'bg-indigo-500/10' : ''}`}>
                    <StepIcon icon={s.icon} active={idx <= currentStep} done={s.done} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Étape {idx + 1}</p>
                      <p className={`text-xs font-bold ${idx <= currentStep ? 'text-indigo-400' : 'text-slate-400'}`}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Étapes de localisation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cycle</label>
                  <CustomSelect options={cycleOptions} value={cycle} onChange={val => { setCycle(val); setClassName(''); setRoom(''); setStudentId(''); }} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Classe</label>
                  <CustomSelect options={classOptions} value={className} onChange={val => { setClassName(val); setRoom(''); setStudentId(''); }} disabled={!cycle} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Salle</label>
                  <CustomSelect options={roomOptions} value={room} onChange={val => { setRoom(val); setStudentId(''); }} disabled={!className} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Élève</label>
                  <CustomSelect options={studentOptions} value={studentId} onChange={setStudentId} disabled={!room} searchable />
                </div>
              </div>

              {/* Frais non payés */}
              {selectedStudent && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-500" />
                      <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Frais à régler — {selectedStudent.prenom} {selectedStudent.nom}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400">{unpaidFees.length} frais</span>
                      {unpaidFees.length > 0 && (
                        <>
                          <button onClick={setAllMax} className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 transition-all">Tout cocher / Max</button>
                          <button onClick={resetAll} className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 transition-all">Réinitialiser</button>
                        </>
                      )}
                    </div>
                  </div>
                  {unpaidFees.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                        <Check className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aucun frais non payé</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cet élève est à jour pour les frais configurés.</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {unpaidFees.map(f => {
                        const checked = f.id in selectedFees;
                        const val = selectedFees[f.id] || 0;
                        return (
                          <div key={f.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${checked ? 'bg-indigo-500/[0.03]' : 'hover:bg-slate-500/5'}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFee(f.id)}
                                className="w-5 h-5 rounded-lg border accent-indigo-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{f.nom}</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.categorie.replace(/_/g, ' ')} · Reste <span className="font-black text-emerald-600">{fmt(f.balance.remaining, f.devise)}</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <NumberInput
                                value={val}
                                onChange={v => setFeeAmount(f.id, v)}
                                min={0}
                                max={f.balance.remaining}
                                integer
                                disabled={!checked}
                                placeholder="0"
                                className="w-32 px-3 py-2 text-right text-sm font-mono font-black border rounded-xl disabled:opacity-40"
                                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                              />
                              <button onClick={() => setFeeAmount(f.id, f.balance.remaining)} disabled={!checked} className="px-2 py-1.5 rounded-lg text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 disabled:opacity-40 transition-all">Max</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Mode + Référence + Caissier */}
              {selectedStudent && unpaidFees.length > 0 && (
                <div className="p-4 rounded-2xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Mode de règlement
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Mode</label>
                      <CustomSelect options={METHOD_OPTIONS} value={method} onChange={setMethod} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Référence / Bordereau</label>
                      <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="N° transaction" className="input w-full text-sm py-2" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Caissier</label>
                      <input type="text" value={caissier} onChange={e => setCaissier(e.target.value)} className="input w-full text-sm py-2" />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-500/25 text-xs font-bold">
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">!</span> {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t shrink-0 flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-black transition-all hover:bg-slate-500/10" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <X className="w-3.5 h-3.5" /> Annuler
          </button>
          <div className="flex items-center gap-4">
            {selectedStudent && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-black">Total à encaisser</p>
                <p className="text-xl font-black text-emerald-600">{fmt(totalToPay)}</p>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedStudent || Object.keys(selectedFees).length === 0}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {submitting ? 'Enregistrement...' : 'Valider & Imprimer reçu'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
