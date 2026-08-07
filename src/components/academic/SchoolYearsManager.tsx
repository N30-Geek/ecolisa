import React, { useState, useEffect } from 'react';
import { Calendar, Plus, CheckCircle2, Clock, Lock, Trash2, Edit3, School, Users, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { AnneeScolaireConfig, StatutAnnéeScolaire } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';

interface SchoolYearsManagerProps {
  onYearChanged?: () => void;
}

const statusOptions: SelectOption[] = [
  { value: 'EN_COURS', label: 'Année Scolaire Active (En Cours)', badge: 'EN COURS' },
  { value: 'PLANIFIEE', label: 'Année Planifiée (Prochaine Rentrée)' },
  { value: 'CLOTUREE', label: 'Année Clôturée & Archivée' },
];

export const SchoolYearsManager: React.FC<SchoolYearsManagerProps> = ({ onYearChanged }) => {
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingYear, setEditingYear] = useState<AnneeScolaireConfig | null>(null);

  const [formData, setFormData] = useState<Partial<AnneeScolaireConfig>>({
    nom: '2026–2027',
    statut: 'EN_COURS',
    debut: '2026-09-01',
    fin: '2027-07-02',
  });

  const loadYears = async () => {
    setLoading(true);
    try {
      const data = await LocalDatabaseService.getSchoolYears();
      setYears(data);
    } catch (err) {
      console.warn('[SchoolYearsManager] Erreur chargement :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const handleOpenModal = (year?: AnneeScolaireConfig) => {
    if (year) {
      setEditingYear(year);
      setFormData({ ...year });
    } else {
      setEditingYear(null);
      setFormData({
        nom: '2027–2028',
        statut: years.length === 0 ? 'EN_COURS' : 'PLANIFIEE',
        debut: '2027-09-01',
        fin: '2028-07-02',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom) return;

    try {
      if (editingYear) {
        await LocalDatabaseService.updateSchoolYear(editingYear.id, formData);
      } else {
        const newYear: AnneeScolaireConfig = {
          id: `sy_${Date.now()}`,
          nom: formData.nom || '2026–2027',
          statut: (formData.statut as StatutAnnéeScolaire) || 'EN_COURS',
          debut: formData.debut || '2026-09-01',
          fin: formData.fin || '2027-07-02',
        } as AnneeScolaireConfig;
        await LocalDatabaseService.addSchoolYear(newYear);
      }

      await loadYears();
      setIsModalOpen(false);
      if (onYearChanged) onYearChanged();
    } catch (err) {
      console.error('[SchoolYearsManager] Erreur sauvegarde :', err);
    }
  };

  const handleActivateYear = async (id: string) => {
    try {
      for (const y of years) {
        const targetStatus: StatutAnnéeScolaire = y.id === id ? 'EN_COURS' : y.statut === 'EN_COURS' ? 'CLOTUREE' : y.statut;
        await LocalDatabaseService.updateSchoolYear(y.id, { statut: targetStatus });
      }
      await loadYears();
      if (onYearChanged) onYearChanged();
    } catch (err) {
      console.error('[SchoolYearsManager] Erreur activation :', err);
    }
  };

  const handleDeleteYear = async (year: AnneeScolaireConfig) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'année scolaire "${year.nom}" ? Cette action effectuera une suppression relationnelle des classes et inscriptions associées.`)) {
      try {
        await LocalDatabaseService.deleteSchoolYear(year.id);
        await loadYears();
        if (onYearChanged) onYearChanged();
      } catch (err) {
        console.error('[SchoolYearsManager] Erreur suppression :', err);
      }
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* En-tête de section */}
      <div
        className="p-5 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Gestion & Configuration des Années Scolaires RDC
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilotage des sessions scolaires, clôture des exercices et basculement de l’année active
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-500/40 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Nouvelle Année Scolaire</span>
        </button>
      </div>

      {/* Grille des Cartes d'Années Scolaires */}
      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Chargement des années scolaires...</div>
      ) : years.length === 0 ? (
        <div
          className="p-8 rounded-2xl border text-center space-y-2 transition-colors"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Aucune année scolaire configurée
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Créez la première année scolaire pour déverrouiller la gestion des classes et des inscriptions.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Créer l'Année Scolaire 2026–2027
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {years.map((y) => {
            const isActive = y.statut === 'EN_COURS';
            const isClosed = y.statut === 'CLOTUREE';

            return (
              <div
                key={y.id}
                className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between space-y-4 transition-all relative ${
                  isActive ? 'ring-2 ring-indigo-500/50' : ''
                }`}
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black border flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : isClosed
                          ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                          : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Session Active En Cours</span>
                        </>
                      ) : isClosed ? (
                        <>
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Archivée & Clôturée</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-indigo-500" />
                          <span>Session Prochaine Planifiée</span>
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(y)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-500/10 transition-colors cursor-pointer"
                        title="Modifier les dates et paramètres"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteYear(y)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Supprimer cette année"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Année Scolaire {y.nom}
                  </h3>

                  <div className="mt-3 p-3 rounded-xl border space-y-1.5 text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
                      <span>Rentrée Officielle :</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{y.debut}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
                      <span>Clôture & Proclamation :</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{y.fin}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions & Basculement Active */}
                <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
                  {isActive ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Année de travail en cours</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleActivateYear(y.id)}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Définir Comme Année Active</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale d'Édition / Création */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {editingYear ? 'Modifier l’Année Scolaire' : 'Créer une Année Scolaire'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Intitulé Officiel (ex: 2026–2027) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom || ''}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Statut de l'Année Scolaire *
                </label>
                <CustomSelect
                  options={statusOptions}
                  value={formData.statut || 'EN_COURS'}
                  onChange={(v) => setFormData({ ...formData, statut: v as StatutAnnéeScolaire })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Date de Rentrée *
                  </label>
                  <CustomDatePicker
                    value={formData.debut || '2026-09-01'}
                    onChange={(d) => setFormData({ ...formData, debut: d })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Date de Clôture *
                  </label>
                  <CustomDatePicker
                    value={formData.fin || '2027-07-02'}
                    onChange={(d) => setFormData({ ...formData, fin: d })}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
