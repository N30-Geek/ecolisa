import React, { useState } from 'react';
import { BookOpen, Search, Check, Plus, Edit2, ShieldAlert, Sparkles, Filter, Award } from 'lucide-react';
import type { MatièreEPST } from '../../../types';
import {
  MATIERES_GENERALES,
  MATIERES_SPECIFIQUES,
  MATIERES_PRIMAIRE,
  MATIERES_CTEB,
  OPTIONS_EPST,
  CYCLES_EPST,
  getNomOption,
} from '../../../data/referentielEPST';
import { CustomSelect } from '../../common/CustomSelect';

const STORAGE_KEY = 'ecolisa_matieres_actives';

// Combine all standard subjects as default pool
const initialSubjectsPool: MatièreEPST[] = [
  ...MATIERES_GENERALES,
  ...MATIERES_SPECIFIQUES,
  ...MATIERES_PRIMAIRE,
  ...MATIERES_CTEB,
];

export const MatieresCurriculumTab: React.FC = () => {
  const [matieres, setMatieres] = useState<MatièreEPST[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialSubjectsPool;
    } catch {
      return initialSubjectsPool;
    }
  });

  const [filterOption, setFilterOption] = useState<string>('MATH_PHY');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form New Custom Subject
  const [newNom, setNewNom] = useState<string>('');
  const [newCode, setNewCode] = useState<string>('');
  const [newCoef, setNewCoef] = useState<number>(3);
  const [newMax, setNewMax] = useState<number>(100);
  const [newCat, setNewCat] = useState<'GENERALE' | 'SPECIFIQUE' | 'PRATIQUE' | 'RELIGIEUSE'>('GENERALE');

  const saveMatieres = (updated: MatièreEPST[]) => {
    setMatieres(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleToggleSubject = (id: string) => {
    const updated = matieres.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m);
    saveMatieres(updated);
  };

  const handleCoefChange = (id: string, coef: number) => {
    const updated = matieres.map(m => m.id === id ? { ...m, coefficientDefaut: coef } : m);
    saveMatieres(updated);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom || !newCode) return;

    const newSubject: MatièreEPST = {
      id: `mat-${Date.now()}`,
      code: newCode.toUpperCase(),
      nom: newNom,
      categorie: newCat,
      optionsApplicables: [filterOption],
      coefficientDefaut: newCoef,
      maxScoreDefaut: newMax,
      isActive: true,
    };

    saveMatieres([...matieres, newSubject]);
    setShowAddModal(false);
    setNewNom('');
    setNewCode('');
  };

  // Filter logic
  const filteredMatieres = matieres.filter(m => {
    const matchesOption =
      m.optionsApplicables.includes('ALL') ||
      m.optionsApplicables.includes(filterOption) ||
      filterOption === 'ALL';

    const matchesSearch =
      m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesOption && matchesSearch;
  });

  const optionSelectOptions = [
    { value: 'ALL', label: 'Toutes les matières du Référentiel EPST' },
    { value: 'PRIMAIRE', label: 'Cycle Primaire' },
    { value: 'CTEB', label: 'Tronc Commun (7ème & 8ème CTEB)' },
    ...OPTIONS_EPST.map(o => ({
      value: o.id,
      label: `Humanités — ${o.nom}`,
      description: o.filiere,
    })),
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Référentiel des Matières & Coefficients (EPST RDC)
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Catalogue complet pré-chargé selon les programmes officiels du Ministère.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Ajouter une Matière Personnalisée
        </button>
      </div>

      {/* Barre de Recherche & Filtre par Option */}
      <div className="p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-4 transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="w-full sm:w-1/2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
            Sélectionner la Filière / Option Scolaire
          </label>
          <CustomSelect
            options={optionSelectOptions}
            value={filterOption}
            onChange={val => setFilterOption(val)}
            searchable
            className="w-full"
          />
        </div>

        <div className="w-full sm:w-1/2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
            Rechercher un Cours / Code EPST
          </label>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Ex: Français, MATH, Algèbre..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border font-medium focus:outline-none focus:border-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Modal Ajout Matière Personnalisée */}
      {showAddModal && (
        <form onSubmit={handleCreateSubject} className="p-5 rounded-2xl border shadow-lg space-y-4 animate-fade-in"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold pb-2 border-b flex items-center gap-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            <Plus className="w-4 h-4 text-indigo-500" />
            Créer un Cours Personnalisé
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Code du Cours *
              </label>
              <input
                type="text"
                required
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="Ex: INFOR, ANG2"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Intitulé du Cours *
              </label>
              <input
                type="text"
                required
                value={newNom}
                onChange={e => setNewNom(e.target.value)}
                placeholder="Ex: Informatique Avancée"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Coefficient *
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={newCoef}
                onChange={e => setNewCoef(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Catégorie *
              </label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="GENERALE">Générale</option>
                <option value="SPECIFIQUE">Spécifique (Option)</option>
                <option value="PRATIQUE">Pratique / Stage</option>
                <option value="RELIGIEUSE">Religion / Morale</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Enregistrer le Cours
            </button>
          </div>
        </form>
      )}

      {/* Grille des Matières Pré-chargées EPST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMatieres.length === 0 ? (
          <div className="md:col-span-2 p-8 text-center rounded-2xl border flex flex-col items-center gap-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <BookOpen className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun cours trouvé pour cette sélection</p>
          </div>
        ) : (
          filteredMatieres.map(matiere => (
            <div
              key={matiere.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                matiere.isActive
                  ? 'border-indigo-500/30 shadow-xs'
                  : 'opacity-50 grayscale hover:grayscale-0'
              }`}
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                  {matiere.code}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {matiere.nom}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      matiere.categorie === 'SPECIFIQUE'
                        ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                        : matiere.categorie === 'PRATIQUE'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {matiere.categorie}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Max: {matiere.maxScoreDefaut} pts
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Modificateur de Coefficient */}
                <div className="flex items-center gap-1 bg-slate-500/10 px-2 py-1 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-400">Coef:</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={matiere.coefficientDefaut}
                    onChange={e => handleCoefChange(matiere.id, Number(e.target.value))}
                    className="w-8 text-center text-xs font-bold bg-transparent border-b border-indigo-500 focus:outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>

                {/* Toggle Actif / Inactif */}
                <button
                  onClick={() => handleToggleSubject(matiere.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                    matiere.isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300'
                  }`}
                  title={matiere.isActive ? 'Désactiver le cours' : 'Activer le cours'}
                >
                  {matiere.isActive && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
