import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Edit3, Trash2, CheckCircle2, Calendar, Award, Layers, Sparkles, BarChart3, GraduationCap, ClipboardList, Home, FlaskConical } from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';

export interface EpreuveItem {
  id: string;
  code: string;
  intitule: string;
  type: 'INTERROGATION' | 'DEVOIR' | 'TP' | 'EXAMEN' | 'PERIODE';
  periode: 'P1' | 'P2' | 'EX1' | 'P3' | 'P4' | 'EX2';
  maxPoints: number;
  date?: string;
  disciplineId?: string;
  classeId?: string;
}

interface EpreuvesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  epreuves: EpreuveItem[];
  onSaveEpreuves: (epreuves: EpreuveItem[]) => void;
  selectedDisciplineName?: string;
  selectedClassName?: string;
}

export const EpreuvesManagerModal: React.FC<EpreuvesManagerModalProps> = ({
  isOpen,
  onClose,
  epreuves: initialEpreuves,
  onSaveEpreuves,
  selectedDisciplineName = 'Matière sélectionnée',
  selectedClassName = 'Classe sélectionnée'
}) => {
  const [list, setList] = useState<EpreuveItem[]>(initialEpreuves);
  const [editingItem, setEditingItem] = useState<EpreuveItem | null>(null);

  // Form State pour nouvel épreuve / édition
  const [intitule, setIntitule] = useState('');
  const [type, setType] = useState<'INTERROGATION' | 'DEVOIR' | 'TP' | 'EXAMEN' | 'PERIODE'>('PERIODE');
  const [periode, setPeriode] = useState<'P1' | 'P2' | 'EX1' | 'P3' | 'P4' | 'EX2'>('P1');
  const [maxPoints, setMaxPoints] = useState(20);
  const [dateEpreuve, setDateEpreuve] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingItem(null);
    setIntitule('');
    setType('PERIODE');
    setPeriode('P1');
    setMaxPoints(20);
    setDateEpreuve(new Date().toISOString().split('T')[0]);
  };

  const handleEdit = (ep: EpreuveItem) => {
    setEditingItem(ep);
    setIntitule(ep.intitule);
    setType(ep.type);
    setPeriode(ep.periode);
    setMaxPoints(ep.maxPoints);
    setDateEpreuve(ep.date || new Date().toISOString().split('T')[0]);
  };

  const handleDelete = (id: string) => {
    const updated = list.filter(e => e.id !== id);
    setList(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = intitule.trim() || `${type} ${periode}`;

    if (editingItem) {
      const updated = list.map(item => item.id === editingItem.id ? {
        ...item,
        intitule: title,
        type,
        periode,
        maxPoints,
        date: dateEpreuve
      } : item);
      setList(updated);
    } else {
      const newItem: EpreuveItem = {
        id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        code: `${type}_${periode}_${Date.now().toString().slice(-4)}`,
        intitule: title,
        type,
        periode,
        maxPoints,
        date: dateEpreuve
      };
      setList([...list, newItem]);
    }
    resetForm();
  };

  const handleSaveAndClose = () => {
    onSaveEpreuves(list);
    onClose();
  };

  const typeOptions = [
    { value: 'PERIODE', label: 'Évaluation de Période (1ère, 2ème, 3ème, 4ème Période)', icon: BarChart3 },
    { value: 'EXAMEN', label: 'Examen Semestriel (Compo)', icon: GraduationCap },
    { value: 'INTERROGATION', label: 'Interrogation Écrite / Orale', icon: ClipboardList },
    { value: 'DEVOIR', label: 'Devoir à Domicile', icon: Home },
    { value: 'TP', label: 'Travail Pratique (TP / Labo)', icon: FlaskConical },
  ];

  const periodeOptions = [
    { value: 'P1', label: '1ère Période (1er Semestre)' },
    { value: 'P2', label: '2ème Période (1er Semestre)' },
    { value: 'EX1', label: 'Examen 1er Semestre (Compo)' },
    { value: 'P3', label: '3ème Période (2ème Semestre)' },
    { value: 'P4', label: '4ème Période (2ème Semestre)' },
    { value: 'EX2', label: 'Examen 2ème Semestre (Compo)' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" style={{ borderColor: 'var(--border)' }}>
        
        {/* HEADER MODALE */}
        <div className="px-6 py-4 border-b bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                Gestion des Épreuves & Évaluations Scolaires
              </h3>
              <p className="text-[11px] text-slate-300">
                {selectedClassName} • Matière: <strong className="text-white">{selectedDisciplineName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* FORMULAIRE AJOUT / EDIT */}
          <form onSubmit={handleSubmit} className="p-4 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                {editingItem ? <Edit3 className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-emerald-500" />}
                <span>{editingItem ? "Modifier l'épreuve" : "Ajouter une nouvelle épreuve ou interrogation"}</span>
              </h4>
              {editingItem && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Annuler la modification
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Intitulé / Nom de l'épreuve</label>
                <input
                  type="text"
                  value={intitule}
                  onChange={e => setIntitule(e.target.value)}
                  placeholder="Ex: Interro n°1 Botanique, Compo S1..."
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Type d'évaluation</label>
                <CustomSelect
                  options={typeOptions}
                  value={type}
                  onChange={val => setType(val as any)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Période de rattachement</label>
                <CustomSelect
                  options={periodeOptions}
                  value={periode}
                  onChange={val => setPeriode(val as any)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Pondération (Note Maximale)</label>
                <NumberInput
                  min={1}
                  max={300}
                  value={maxPoints}
                  onChange={setMaxPoints}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {editingItem ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingItem ? "Mettre à jour" : "Ajouter à la liste des épreuves"}</span>
              </button>
            </div>
          </form>

          {/* LISTE DES ÉPREUVES CONFIGURÉES */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400">
              Liste des Épreuves & Évaluations ({list.length})
            </h4>

            {list.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed text-slate-400 space-y-2">
                <Layers className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs font-bold">Aucune épreuve configurée pour le moment.</p>
                <p className="text-[11px]">Utilisez le formulaire ci-dessus pour ajouter des interrogations ou examens.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-xs hover:border-indigo-500/50 transition-all"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase">
                          {ep.periode}
                        </span>
                        <h5 className="font-extrabold text-xs" style={{ color: 'var(--text-primary)' }}>
                          {ep.intitule}
                        </h5>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
                        <span>Max: <strong className="text-amber-600 dark:text-amber-400">{ep.maxPoints} pts</strong></span>
                        <span>• Type: {ep.type}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(ep)}
                        className="p-1.5 rounded-lg border hover:bg-slate-500/10 text-indigo-500 transition-all cursor-pointer"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ep.id)}
                        className="p-1.5 rounded-lg border hover:bg-rose-500/10 text-rose-500 transition-all cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* FOOTER MODALE */}
        <div className="px-6 py-3 border-t bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-semibold">
            {list.length} épreuve(s) prête(s) pour la grille de cotation
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Valider les épreuves</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
