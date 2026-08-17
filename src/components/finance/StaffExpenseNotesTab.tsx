import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt,
  Plus,
  X,
  Trash2,
  Check,
  XCircle,
  Banknote,
  Download,
  Search,
  Filter,
  Loader2,
  Calendar,
  FileText,
  AlertTriangle,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { DatePicker } from '../common/DatePicker';
import type { NoteFraisProfessionnel, MembrePersonnel, AnneeScolaireConfig } from '../../types';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

interface StaffExpenseNotesTabProps {
  activeSchoolYear?: string;
}

const STATUS_LABELS: Record<string, string> = {
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
  REMBOURSE: 'Remboursé',
};

const EXPENSE_CATEGORIES = ['TRANSPORT', 'REPAS', 'HEBERGEMENT', 'FOURNITURES', 'COMMUNICATION', 'FORMATION', 'MISSION', 'AUTRE'];

export const StaffExpenseNotesTab: React.FC<StaffExpenseNotesTabProps> = ({ activeSchoolYear }) => {
  const { currency, format, convert, currencies } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);

  const [notes, setNotes] = useState<NoteFraisProfessionnel[]>([]);
  const [staff, setStaff] = useState<MembrePersonnel[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NoteFraisProfessionnel | null>(null);
  const [validationNote, setValidationNote] = useState<NoteFraisProfessionnel | null>(null);
  const [reimbursementNote, setReimbursementNote] = useState<NoteFraisProfessionnel | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');

  const activeYearId = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear)?.id, [years, activeSchoolYear]);

  useEffect(() => {
    setYearFilter(activeYearId || '');
    const user = LocalDatabaseService.getCurrentUser();
    setCurrentUserName(user?.nom || user?.email || '');
  }, [activeYearId]);

  const load = async () => {
    setLoading(true);
    const [n, s, y] = await Promise.all([
      LocalDatabaseService.getStaffExpenseNotes({ schoolYearId: yearFilter || undefined, statut: statusFilter || undefined }),
      LocalDatabaseService.getStaff(),
      LocalDatabaseService.getSchoolYears(),
    ]);
    setNotes(n);
    setStaff(s);
    setYears(y);
    setLoading(false);
  };

  useEffect(() => { load(); }, [yearFilter, statusFilter]);

  const filtered = useMemo(() => {
    return notes.filter(n => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (n.staffName?.toLowerCase().includes(q) || n.categorie.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q));
    }).sort((a, b) => new Date(b.dateNote || 0).getTime() - new Date(a.dateNote || 0).getTime());
  }, [notes, search]);

  const totals = useMemo(() => {
    const soumis = filtered.filter(n => n.statut === 'SOUMIS');
    const valide = filtered.filter(n => n.statut === 'VALIDE');
    const rejete = filtered.filter(n => n.statut === 'REJETE');
    const rembourse = filtered.filter(n => n.statut === 'REMBOURSE');
    return {
      soumis: soumis.reduce((a, n) => a + convert(n.montant, n.devise), 0),
      valide: valide.reduce((a, n) => a + convert(n.montant, n.devise), 0),
      rembourse: rembourse.reduce((a, n) => a + convert(n.montantRembourse ?? n.montant, n.devise), 0),
    };
  }, [filtered, convert, currency]);

  const staffOptions = useMemo(() => staff.map(s => ({ value: s.id, label: `${s.prenom || ''} ${s.nom}`.trim() || s.email || s.id })), [staff]);

  const handleSave = async (n: NoteFraisProfessionnel) => {
    const data = { ...n };
    if (!data.id) {
      data.creePar = currentUserName;
      data.dateCreation = new Date().toISOString();
      await LocalDatabaseService.addStaffExpenseNote(data);
    } else {
      await LocalDatabaseService.updateStaffExpenseNote(data.id, data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleValidate = async (id: string, statut: 'VALIDE' | 'REJETE', commentaire: string) => {
    await LocalDatabaseService.updateStaffExpenseNote(id, {
      statut,
      validePar: currentUserName,
      dateValidation: new Date().toISOString(),
      commentaireValidation: commentaire,
    });
    setValidationNote(null);
    load();
  };

  const handleReimburse = async (data: { montantRembourse: number; dateRemboursement: string; modeRemboursement: string; referenceRemboursement: string }) => {
    if (!reimbursementNote) return;
    await LocalDatabaseService.reimburseStaffExpenseNote(reimbursementNote.id, { ...data, validePar: currentUserName, devise: reimbursementNote.devise });
    setReimbursementNote(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette note de frais ?')) return;
    await LocalDatabaseService.deleteStaffExpenseNote(id);
    load();
  };

  const exportCSV = () => {
    const header = 'Date,Agent,Categorie,Description,Montant,Devise,Statut,Valide par,Date validation,Rembourse,Date remboursement,Mode,Reference\n';
    const body = filtered.map(n => `${n.dateNote || ''},"${n.staffName || ''}",${n.categorie},"${(n.description || '').replace(/"/g, '""')}",${n.montant},${n.devise},${n.statut},"${n.validePar || ''}",${n.dateValidation || ''},${n.montantRembourse ?? ''},${n.dateRemboursement || ''},${n.modeRemboursement || ''},${n.referenceRemboursement || ''}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-frais-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openForm = (note?: NoteFraisProfessionnel) => {
    if (note) {
      setEditing({ ...note });
    } else {
      setEditing({
        id: '',
        staffId: '',
        staffName: '',
        schoolYearId: yearFilter,
        dateNote: new Date().toISOString().split('T')[0],
        categorie: 'TRANSPORT',
        description: '',
        montant: 0,
        devise: currency,
        statut: 'SOUMIS',
      });
    }
    setShowForm(true);
  };

  return (
    <div className="space-y-5 animate-fade-in w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Notes de frais professionnels</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Soumission, validation et remboursement des frais du personnel</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> Exporter CSV
          </button>
          <button onClick={() => openForm()} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Plus className="w-3.5 h-3.5" /> Nouvelle note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Notes soumises', val: fmt(totals.soumis, currency), color: '#6366f1', icon: Receipt },
          { label: 'Notes validées', val: fmt(totals.valide, currency), color: '#10b981', icon: Check },
          { label: 'Remboursé', val: fmt(totals.rembourse, currency), color: '#0ea5e9', icon: Banknote },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <CustomSelect
            options={[{ value: '', label: 'Toutes les années' }, ...years.map(y => ({ value: y.id, label: y.nom }))]}
            value={yearFilter}
            onChange={setYearFilter}
          />
          <CustomSelect
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: 'SOUMIS', label: 'Soumis' },
              { value: 'VALIDE', label: 'Validé' },
              { value: 'REJETE', label: 'Rejeté' },
              { value: 'REMBOURSE', label: 'Remboursé' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold outline-none"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={() => { setYearFilter(activeYearId || ''); setStatusFilter(''); setSearch(''); }}
            className="px-3 py-2 rounded-xl border text-[11px] font-black hover:bg-slate-500/5 flex items-center justify-center gap-1.5 transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Filter className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      <div className="section-card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Agent</th>
              <th>Catégorie</th>
              <th className="text-right">Montant</th>
              <th>Statut</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(n => (
              <tr key={n.id}>
                <td className="text-[12px]">{n.dateNote}</td>
                <td className="text-[12px] font-bold">{n.staffName || '—'}</td>
                <td className="text-[12px]">{n.categorie.replace(/_/g, ' ')}</td>
                <td className="text-right font-bold">{fmt(n.montant, n.devise)}</td>
                <td>{statusBadge(n.statut)}</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {n.statut !== 'REMBOURSE' && (
                      <button onClick={() => setValidationNote(n)} title="Valider / rejeter" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-50 text-emerald-500"><Check className="w-3.5 h-3.5" /></button>
                    )}
                    {(n.statut === 'VALIDE' || n.statut === 'SOUMIS') && (
                      <button onClick={() => setReimbursementNote(n)} title="Rembourser" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-sky-50 text-sky-500"><Banknote className="w-3.5 h-3.5" /></button>
                    )}
                    {n.statut !== 'REMBOURSE' && (
                      <button onClick={() => openForm(n)} title="Modifier" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-50 text-indigo-500"><Pencil className="w-3.5 h-3.5" /></button>
                    )}
                    <button onClick={() => handleDelete(n.id)} title="Supprimer" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune note de frais enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && editing && (
        <StaffExpenseNoteFormModal
          note={editing}
          years={years}
          yearFilter={yearFilter}
          staffOptions={staffOptions}
          categories={EXPENSE_CATEGORIES}
          currencies={currencies}
          currency={currency}
          currentUserName={currentUserName}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {validationNote && (
        <ValidationModal
          note={validationNote}
          currentUserName={currentUserName}
          onClose={() => setValidationNote(null)}
          onValidate={handleValidate}
        />
      )}

      {reimbursementNote && (
        <ReimbursementModal
          note={reimbursementNote}
          currentUserName={currentUserName}
          currencies={currencies}
          onClose={() => setReimbursementNote(null)}
          onReimburse={handleReimburse}
        />
      )}
    </div>
  );
};

const statusBadge = (statut: string) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    SOUMIS: { bg: '#6366f115', text: '#6366f1', label: STATUS_LABELS.SOUMIS },
    VALIDE: { bg: '#10b98115', text: '#10b981', label: STATUS_LABELS.VALIDE },
    REJETE: { bg: '#ef444415', text: '#ef4444', label: STATUS_LABELS.REJETE },
    REMBOURSE: { bg: '#0ea5e915', text: '#0ea5e9', label: STATUS_LABELS.REMBOURSE },
  };
  const c = config[statut] || config.SOUMIS;
  return (
    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
};

const StaffExpenseNoteFormModal: React.FC<{
  note: NoteFraisProfessionnel;
  years: AnneeScolaireConfig[];
  yearFilter: string;
  staffOptions: { value: string; label: string }[];
  categories: string[];
  currencies: any[];
  currency: string;
  currentUserName: string;
  onClose: () => void;
  onSave: (n: NoteFraisProfessionnel) => void;
}> = ({ note, years, yearFilter, staffOptions, categories, currencies, currency, currentUserName, onClose, onSave }) => {
  const [form, setForm] = useState<NoteFraisProfessionnel>({ ...note });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const selectedStaff = staffOptions.find(s => s.value === form.staffId);

  const handleSave = () => {
    const staffName = selectedStaff?.label || form.staffName || '';
    onSave({ ...form, staffName, schoolYearId: form.schoolYearId || yearFilter, creePar: form.creePar || currentUserName });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black">{form.id ? 'Modifier la note' : 'Nouvelle note de frais'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Agent</label>
              <CustomSelect
                options={[{ value: '', label: 'Choisir un agent' }, ...staffOptions]}
                value={form.staffId || ''}
                onChange={v => setForm({ ...form, staffId: v, staffName: staffOptions.find(s => s.value === v)?.label || form.staffName })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date de la note</label>
              <DatePicker value={form.dateNote} onChange={v => setForm({ ...form, dateNote: v })} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
              <CustomSelect
                options={categories.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))}
                value={form.categorie}
                onChange={v => setForm({ ...form, categorie: v })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
              <CustomSelect
                options={years.map(y => ({ value: y.id, label: y.nom }))}
                value={form.schoolYearId || yearFilter}
                onChange={v => setForm({ ...form, schoolYearId: v })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Description / motif</label>
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input w-full text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant</label>
              <NumberInput value={form.montant} onChange={v => setForm({ ...form, montant: v })} min={0} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <CustomSelect
                options={currencies.map(c => ({ value: c.code, label: `${c.code} (${c.name || c.code})` }))}
                value={form.devise || currency}
                onChange={v => setForm({ ...form, devise: v })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Pièce justificative (URL/fichier)</label>
            <input value={form.justificatif || ''} onChange={e => setForm({ ...form, justificatif: e.target.value })} className="input w-full text-sm" placeholder="ex: chemin/vers/justificatif.pdf" />
          </div>
          <button
            onClick={handleSave}
            disabled={!form.staffId || !form.dateNote || !form.categorie || form.montant <= 0}
            className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: '#6366f1', color: 'white', opacity: (!form.staffId || !form.dateNote || !form.categorie || form.montant <= 0) ? 0.6 : 1 }}
          >
            <Receipt className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ValidationModal: React.FC<{
  note: NoteFraisProfessionnel;
  currentUserName: string;
  onClose: () => void;
  onValidate: (id: string, statut: 'VALIDE' | 'REJETE', commentaire: string) => void;
}> = ({ note, currentUserName, onClose, onValidate }) => {
  const { format } = useSchoolConfig();
  const [comment, setComment] = useState(note.commentaireValidation || '');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black">Validation de la note</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="p-3 rounded-xl border text-sm" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <p><span className="font-bold">Agent :</span> {note.staffName}</p>
            <p><span className="font-bold">Montant :</span> {format(note.montant, note.devise)}</p>
            <p><span className="font-bold">Catégorie :</span> {note.categorie}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Commentaire de validation / rejet</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="input w-full text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onValidate(note.id, 'VALIDE', comment)} className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
              <Check className="w-4 h-4" /> Valider
            </button>
            <button onClick={() => onValidate(note.id, 'REJETE', comment)} className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 bg-rose-500 text-white hover:bg-rose-600">
              <XCircle className="w-4 h-4" /> Rejeter
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ReimbursementModal: React.FC<{
  note: NoteFraisProfessionnel;
  currentUserName: string;
  currencies: any[];
  onClose: () => void;
  onReimburse: (data: { montantRembourse: number; dateRemboursement: string; modeRemboursement: string; referenceRemboursement: string }) => void;
}> = ({ note, currencies, onClose, onReimburse }) => {
  const { format } = useSchoolConfig();
  const [montant, setMontant] = useState(note.montant);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState('CASH');
  const [reference, setReference] = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black">Rembourser la note</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="p-3 rounded-xl border text-sm" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <p><span className="font-bold">Agent :</span> {note.staffName}</p>
            <p><span className="font-bold">Montant demandé :</span> {format(note.montant, note.devise)}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant remboursé</label>
            <NumberInput value={montant} onChange={setMontant} min={0} className="input w-full text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date de remboursement</label>
            <DatePicker value={date} onChange={setDate} className="w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Mode de remboursement</label>
            <CustomSelect
              options={[
                { value: 'CASH', label: 'Espèces' },
                { value: 'BANK', label: 'Virement bancaire' },
                { value: 'MOBILE_MONEY', label: 'Mobile money' },
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Référence de paiement</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className="input w-full text-sm" />
          </div>
          <button
            onClick={() => onReimburse({ montantRembourse: montant, dateRemboursement: date, modeRemboursement: mode, referenceRemboursement: reference })}
            disabled={montant <= 0 || !date}
            className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 bg-sky-500 text-white hover:bg-sky-600"
            style={{ opacity: (montant <= 0 || !date) ? 0.6 : 1 }}
          >
            <Banknote className="w-4 h-4" /> Confirmer le remboursement
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
