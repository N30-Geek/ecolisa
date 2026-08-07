import React, { useEffect, useState } from 'react';
import { Plus, X, Trash2, Loader2, Save, Tag } from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency } from '../../utils/currency';
import type { TypeFraisScolaire, AnneeScolaireConfig, CategorieFrais } from '../../types';

const CATEGORIES: CategorieFrais[] = [
  'FRAIS_INSCRIPTION', 'FRAIS_REINSCRIPTION', 'FRAIS_MINERVAL', 'FRAIS_CONNEXES', 'FRAIS_KITS_EQUIPEMENTS',
  'FRAIS_BUS', 'FRAIS_UNIFORME', 'FRAIS_EXAMEN', 'FRAIS_CARTE', 'FRAIS_ACTIVITE', 'AUTRE',
];

const CYCLES = ['TOUS', 'MATERNELLE', 'PRIMAIRE', 'SECONDAIRE_CTEB', 'HUMANITES'] as const;
const REGIMES = ['TOUS', 'EXTERNE', 'INTERNE', 'SEMI_INTERNE'] as const;

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const FeesTab: React.FC = () => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TypeFraisScolaire | null>(null);

  const load = async () => {
    setLoading(true);
    const [ft, y] = await Promise.all([
      LocalDatabaseService.getFeeTypes(),
      LocalDatabaseService.getSchoolYears(),
    ]);
    setFeeTypes(ft);
    setYears(y);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce type de frais ?')) return;
    await LocalDatabaseService.deleteFeeType(id);
    load();
  };

  const handleSave = async (ft: TypeFraisScolaire) => {
    if (ft.id) await LocalDatabaseService.updateFeeType(ft.id, ft);
    else await LocalDatabaseService.addFeeType(ft);
    setEditing(null);
    load();
  };

  const startNew = () => {
    setEditing({
      id: '',
      code: '',
      nom: '',
      categorie: 'FRAIS_MINERVAL',
      montant: 0,
      devise: currency,
      obligatoire: true,
      schoolYearId: activeYear?.id,
      anneeScolaireId: activeYear?.id,
      cycleId: 'TOUS',
      optionCode: 'TOUS',
      regime: 'TOUS',
      actif: true,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Types de frais</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Configuration et repartition des frais scolaires</p>
        </div>
        <button onClick={startNew} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
          <Plus className="w-3.5 h-3.5" /> Nouveau type
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {CATEGORIES.map(cat => {
          const total = feeTypes.filter(f => f.categorie === cat).reduce((a, f) => a + f.montant, 0);
          const count = feeTypes.filter(f => f.categorie === cat).length;
          return (
            <div key={cat} className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{cat.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-[18px] font-black" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{count} type{count > 1 ? 's' : ''}</p>
            </div>
          );
        })}
      </div>

      <div className="section-card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Categorie</th>
              <th>Montant</th>
              <th>Devise</th>
              <th>Obligatoire</th>
              <th>Cycle</th>
              <th>Option</th>
              <th>Régime</th>
              <th>Portee</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {feeTypes.map(ft => (
              <tr key={ft.id}>
                <td className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{ft.code}</td>
                <td className="font-bold text-[12px]">{ft.nom}</td>
                <td className="text-[11px]">{ft.categorie}</td>
                <td className="font-black text-[14px]">{fmt(ft.montant, ft.devise)}</td>
                <td className="text-[11px]">{ft.devise}</td>
                <td>{ft.obligatoire ? <span className="text-emerald-600 font-bold text-[11px]">Oui</span> : <span className="text-slate-400 text-[11px]">Non</span>}</td>
                <td className="text-[11px]">{ft.cycleId || 'TOUS'}</td>
                <td className="text-[11px]">{ft.optionCode || 'TOUS'}</td>
                <td className="text-[11px]">{ft.regime || 'TOUS'}</td>
                <td className="text-[11px]">{ft.portee || 'TOUS'}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(ft)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600">Modifier</button>
                    <button onClick={() => handleDelete(ft.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {feeTypes.length === 0 && !loading && (
              <tr><td colSpan={11} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun type de frais.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={11} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <FeeTypeModal
          fee={editing}
          years={years}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

const FeeTypeModal: React.FC<{
  fee: TypeFraisScolaire;
  years: AnneeScolaireConfig[];
  onClose: () => void;
  onSave: (ft: TypeFraisScolaire) => void;
}> = ({ fee, years, onClose, onSave }) => {
  const [form, setForm] = useState<TypeFraisScolaire>({ ...fee });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-3xl border shadow-2xl p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{form.id ? 'Modifier le type de frais' : 'Nouveau type de frais'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Nom</label>
            <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input w-full text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input w-full text-sm" placeholder="ex: MIN-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Categorie</label>
              <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value as any })} className="input w-full text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant</label>
              <input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: Number(e.target.value) })} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <select value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value as any })} className="input w-full text-sm">
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Annee scolaire</label>
              <select value={form.schoolYearId || ''} onChange={e => setForm({ ...form, schoolYearId: e.target.value, anneeScolaireId: e.target.value })} className="input w-full text-sm">
                {years.map(y => <option key={y.id} value={y.id}>{y.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Portee</label>
              <input value={form.portee || ''} onChange={e => setForm({ ...form, portee: e.target.value })} className="input w-full text-sm" placeholder="TOUS ou nom de classe" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Cycle cible</label>
              <select value={form.cycleId || 'TOUS'} onChange={e => setForm({ ...form, cycleId: e.target.value as any })} className="input w-full text-sm">
                {CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Option cible</label>
              <input value={form.optionCode || ''} onChange={e => setForm({ ...form, optionCode: e.target.value.toUpperCase() || 'TOUS' })} className="input w-full text-sm" placeholder="TOUS ou Math-Physique" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Régime cible</label>
              <select value={form.regime || 'TOUS'} onChange={e => setForm({ ...form, regime: e.target.value as any })} className="input w-full text-sm">
                {REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="obligatoire"
                checked={form.obligatoire}
                onChange={e => setForm({ ...form, obligatoire: e.target.checked })}
                className="w-4 h-4 rounded border"
              />
              <label htmlFor="obligatoire" className="text-sm font-semibold">Obligatoire</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="actif"
                checked={form.actif !== false}
                onChange={e => setForm({ ...form, actif: e.target.checked })}
                className="w-4 h-4 rounded border"
              />
              <label htmlFor="actif" className="text-sm font-semibold">Actif</label>
            </div>
          </div>
          <button onClick={() => onSave(form)} className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ background: '#6366f1', color: 'white' }}>
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
