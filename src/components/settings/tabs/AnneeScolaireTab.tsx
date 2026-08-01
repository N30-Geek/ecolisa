import React, { useState } from 'react';
import { Calendar, Plus, CheckCircle2, Archive, Trash2, Clock, Check } from 'lucide-react';
import type { AnneeScolaire } from '../../../types';
import { CustomDatePicker } from '../../common/CustomDatePicker';

const STORAGE_KEY = 'ecolisa_annees_scolaires';

const defaultYears: AnneeScolaire[] = [
  {
    id: 'annee-2025-2026',
    libelle: '2025–2026',
    dateDebut: '2025-09-01',
    dateFin: '2026-07-02',
    debutTrimestre1: '2025-09-01',
    finTrimestre1: '2025-12-19',
    debutTrimestre2: '2026-01-05',
    finTrimestre2: '2026-04-03',
    debutTrimestre3: '2026-04-20',
    finTrimestre3: '2026-07-02',
    estActive: true,
    estArchivee: false,
  },
];

export const AnneeScolaireTab: React.FC = () => {
  const [annees, setAnnees] = useState<AnneeScolaire[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultYears;
    } catch {
      return defaultYears;
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<AnneeScolaire>>({
    libelle: '2026–2027',
    dateDebut: '2026-09-01',
    dateFin: '2027-07-02',
    debutTrimestre1: '2026-09-01',
    finTrimestre1: '2026-12-18',
    debutTrimestre2: '2027-01-04',
    finTrimestre2: '2027-04-02',
    debutTrimestre3: '2027-04-19',
    finTrimestre3: '2027-07-02',
    estActive: false,
    estArchivee: false,
  });

  const saveToStorage = (updated: AnneeScolaire[]) => {
    setAnnees(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSetActive = (id: string) => {
    const updated = annees.map(a => ({
      ...a,
      estActive: a.id === id,
    }));
    saveToStorage(updated);
  };

  const handleToggleArchive = (id: string) => {
    const updated = annees.map(a => (a.id === id ? { ...a, estArchivee: !a.estArchivee } : a));
    saveToStorage(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette année scolaire ?')) {
      const updated = annees.filter(a => a.id !== id);
      saveToStorage(updated);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.libelle) return;

    const newYear: AnneeScolaire = {
      id: `annee-${Date.now()}`,
      libelle: formData.libelle || '',
      dateDebut: formData.dateDebut || '2026-09-01',
      dateFin: formData.dateFin || '2027-07-02',
      debutTrimestre1: formData.debutTrimestre1 || '2026-09-01',
      finTrimestre1: formData.finTrimestre1 || '2026-12-18',
      debutTrimestre2: formData.debutTrimestre2 || '2027-01-04',
      finTrimestre2: formData.finTrimestre2 || '2027-04-02',
      debutTrimestre3: formData.debutTrimestre3 || '2027-04-19',
      finTrimestre3: formData.finTrimestre3 || '2027-07-02',
      estActive: annees.length === 0,
      estArchivee: false,
    };

    saveToStorage([...annees, newYear]);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Gestion des Années Scolaires & Périodes
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Définition des trimestres, ouverture des sessions académiques et archivage.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Fermer le Formulaire' : 'Créer une Année Scolaire'}
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-5 rounded-2xl border shadow-md space-y-4 transition-colors animate-fade-in"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold pb-2 border-b flex items-center gap-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            <Plus className="w-4 h-4 text-indigo-500" />
            Nouvelle Année Scolaire
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Libellé de l'Année Scolaire *
              </label>
              <input
                type="text"
                required
                value={formData.libelle}
                onChange={e => setFormData(prev => ({ ...prev, libelle: e.target.value }))}
                placeholder="Ex: 2026–2027"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Date d'Ouverture (Début)
              </label>
              <CustomDatePicker
                value={formData.dateDebut}
                onChange={val => setFormData(prev => ({ ...prev, dateDebut: val }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Date de Clôture (Fin)
              </label>
              <CustomDatePicker
                value={formData.dateFin}
                onChange={val => setFormData(prev => ({ ...prev, dateFin: val }))}
                className="w-full"
              />
            </div>
          </div>

          <h4 className="text-xs font-bold pt-2 text-indigo-600 dark:text-indigo-400">
            Découpage des 3 Trimestres Scolaires (EPST RDC)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* T1 */}
            <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-bold text-slate-500">1er Trimestre</span>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Début T1</label>
                <CustomDatePicker
                  value={formData.debutTrimestre1}
                  onChange={val => setFormData(prev => ({ ...prev, debutTrimestre1: val }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Fin T1</label>
                <CustomDatePicker
                  value={formData.finTrimestre1}
                  onChange={val => setFormData(prev => ({ ...prev, finTrimestre1: val }))}
                />
              </div>
            </div>

            {/* T2 */}
            <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-bold text-slate-500">2ème Trimestre</span>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Début T2</label>
                <CustomDatePicker
                  value={formData.debutTrimestre2}
                  onChange={val => setFormData(prev => ({ ...prev, debutTrimestre2: val }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Fin T2</label>
                <CustomDatePicker
                  value={formData.finTrimestre2}
                  onChange={val => setFormData(prev => ({ ...prev, finTrimestre2: val }))}
                />
              </div>
            </div>

            {/* T3 */}
            <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-bold text-slate-500">3ème Trimestre</span>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Début T3</label>
                <CustomDatePicker
                  value={formData.debutTrimestre3}
                  onChange={val => setFormData(prev => ({ ...prev, debutTrimestre3: val }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Fin T3</label>
                <CustomDatePicker
                  value={formData.finTrimestre3}
                  onChange={val => setFormData(prev => ({ ...prev, finTrimestre3: val }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Valider & Enregistrer l'Année
            </button>
          </div>
        </form>
      )}

      {/* Liste des Années Scolaires */}
      <div className="space-y-3">
        {annees.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border flex flex-col items-center gap-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <Clock className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aucune année scolaire configurée</p>
            <p className="text-xs text-slate-400">Cliquez sur le bouton ci-dessus pour créer la première année académique.</p>
          </div>
        ) : (
          annees.map(annee => (
            <div
              key={annee.id}
              className={`p-5 rounded-2xl border transition-all ${
                annee.estActive
                  ? 'border-indigo-500/80 ring-2 ring-indigo-500/20'
                  : 'hover:border-indigo-500/30'
              }`}
              style={{ background: 'var(--bg-surface)', borderColor: annee.estActive ? '#6366f1' : 'var(--border)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                    Année Scolaire {annee.libelle}
                  </span>
                  {annee.estActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> En Cours (Active)
                    </span>
                  )}
                  {annee.estArchivee && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Archivée
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!annee.estActive && !annee.estArchivee && (
                    <button
                      onClick={() => handleSetActive(annee.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Définir comme Année Active
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleArchive(annee.id)}
                    className="p-2 rounded-lg border text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    style={{ borderColor: 'var(--border)' }}
                    title={annee.estArchivee ? 'Désarchiver' : 'Archiver'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(annee.id)}
                    className="p-2 rounded-lg border text-xs font-medium hover:bg-red-500/10 text-red-500 border-red-500/20 cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Détails des Trimestres */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="p-2.5 rounded-xl text-xs space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                  <span className="font-bold text-slate-500 block text-[11px]">1er Trimestre (T1)</span>
                  <p className="font-medium text-[11px]" style={{ color: 'var(--text-primary)' }}>
                    Du <strong className="text-indigo-600 dark:text-indigo-400">{annee.debutTrimestre1}</strong> au <strong className="text-indigo-600 dark:text-indigo-400">{annee.finTrimestre1}</strong>
                  </p>
                </div>

                <div className="p-2.5 rounded-xl text-xs space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                  <span className="font-bold text-slate-500 block text-[11px]">2ème Trimestre (T2)</span>
                  <p className="font-medium text-[11px]" style={{ color: 'var(--text-primary)' }}>
                    Du <strong className="text-indigo-600 dark:text-indigo-400">{annee.debutTrimestre2}</strong> au <strong className="text-indigo-600 dark:text-indigo-400">{annee.finTrimestre2}</strong>
                  </p>
                </div>

                <div className="p-2.5 rounded-xl text-xs space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                  <span className="font-bold text-slate-500 block text-[11px]">3ème Trimestre (T3)</span>
                  <p className="font-medium text-[11px]" style={{ color: 'var(--text-primary)' }}>
                    Du <strong className="text-indigo-600 dark:text-indigo-400">{annee.debutTrimestre3}</strong> au <strong className="text-indigo-600 dark:text-indigo-400">{annee.finTrimestre3}</strong>
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
