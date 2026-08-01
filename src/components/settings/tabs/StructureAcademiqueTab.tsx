import React, { useState } from 'react';
import { Layers, Plus, Trash2, DoorClosed, GraduationCap, Sparkles, Check, ChevronRight, Settings2 } from 'lucide-react';
import type { ClasseConfig, Salle } from '../../../types';
import { CYCLES_EPST, OPTIONS_EPST, CLASSES_PAR_CYCLE, NIVEAUX_HUMANITES, getNomOption } from '../../../data/referentielEPST';
import { CustomSelect } from '../../common/CustomSelect';

const STORAGE_KEY = 'ecolisa_structure_academique';

interface StructureState {
  cyclesActifs: string[]; // List of active cycle IDs
  classes: ClasseConfig[];
}

const defaultState: StructureState = {
  cyclesActifs: ['PRIMAIRE', 'CTEB', 'HUMANITES', 'TECHNIQUES'],
  classes: [],
};

export const StructureAcademiqueTab: React.FC = () => {
  const [data, setData] = useState<StructureState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultState;
    } catch {
      return defaultState;
    }
  });

  const [activeCycleFilter, setActiveCycleFilter] = useState<string>('TOUS');
  const [showClassModal, setShowClassModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState<string | null>(null); // classId

  // Form State for Class Creation
  const [newClassCycle, setNewClassCycle] = useState<string>('HUMANITES');
  const [newClassOption, setNewClassOption] = useState<string>('MATH_PHY');
  const [newClassLevel, setNewClassLevel] = useState<string>('3ème');
  const [newClassCustomNom, setNewClassCustomNom] = useState<string>('');
  const [newClassCapacity, setNewClassCapacity] = useState<number>(45);
  const [initialRoomsCount, setInitialRoomsCount] = useState<number>(1); // e.g. Salle 1, Salle 2...

  // Form State for Room Creation
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(45);
  const [newRoomBuilding, setNewRoomBuilding] = useState<string>('');

  const saveData = (updated: StructureState) => {
    setData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleToggleCycle = (cycleId: string) => {
    const isActif = data.cyclesActifs.includes(cycleId);
    const updatedCycles = isActif
      ? data.cyclesActifs.filter(id => id !== cycleId)
      : [...data.cyclesActifs, cycleId];

    saveData({ ...data, cyclesActifs: updatedCycles });
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();

    const isHumanities = newClassCycle === 'HUMANITES' || newClassCycle === 'TECHNIQUES' || newClassCycle === 'PROFESSIONNELLES';
    
    let generatedNom = newClassCustomNom;
    if (!generatedNom) {
      if (isHumanities) {
        const optionNom = getNomOption(newClassOption);
        generatedNom = `${newClassLevel} ${optionNom}`;
      } else {
        generatedNom = newClassLevel;
      }
    }

    // Auto generate initial rooms (Salle 1, Salle 2, etc.)
    const rooms: Salle[] = [];
    for (let i = 1; i <= initialRoomsCount; i++) {
      rooms.push({
        id: `salle-${Date.now()}-${i}`,
        classId: `class-${Date.now()}`,
        nomSalle: initialRoomsCount === 1 ? 'Salle Unique' : `Salle ${i}`,
        capacite: newClassCapacity,
      });
    }

    const newClass: ClasseConfig = {
      id: `class-${Date.now()}`,
      cycleId: newClassCycle,
      optionId: isHumanities ? newClassOption : undefined,
      nom: generatedNom,
      effectifMax: newClassCapacity * initialRoomsCount,
      salles: rooms,
    };

    saveData({ ...data, classes: [...data.classes, newClass] });
    setShowClassModal(false);
    setNewClassCustomNom('');
  };

  const handleDeleteClass = (classId: string) => {
    if (confirm('Voulez-vous supprimer cette classe et ses salles ?')) {
      const updatedClasses = data.classes.filter(c => c.id !== classId);
      saveData({ ...data, classes: updatedClasses });
    }
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRoomModal || !newRoomName) return;

    const newRoom: Salle = {
      id: `salle-${Date.now()}`,
      classId: showRoomModal,
      nomSalle: newRoomName,
      capacite: newRoomCapacity,
      batiment: newRoomBuilding || undefined,
    };

    const updatedClasses = data.classes.map(c => {
      if (c.id === showRoomModal) {
        return {
          ...c,
          salles: [...c.salles, newRoom],
        };
      }
      return c;
    });

    saveData({ ...data, classes: updatedClasses });
    setShowRoomModal(null);
    setNewRoomName('');
    setNewRoomBuilding('');
  };

  const handleDeleteRoom = (classId: string, roomId: string) => {
    const updatedClasses = data.classes.map(c => {
      if (c.id === classId) {
        return {
          ...c,
          salles: c.salles.filter(s => s.id !== roomId),
        };
      }
      return c;
    });
    saveData({ ...data, classes: updatedClasses });
  };

  const filteredClasses = activeCycleFilter === 'TOUS'
    ? data.classes
    : data.classes.filter(c => c.cycleId === activeCycleFilter);

  const cycleSelectOptions = CYCLES_EPST.map(c => ({
    value: c.id,
    label: c.nom,
    badge: c.codeCite,
  }));

  const optionSelectOptions = OPTIONS_EPST.map(o => ({
    value: o.id,
    label: o.nom,
    description: o.filiere,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Structure Académique : Cycles, Classes & Salles
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Configuration des cycles EPST, des classes d'études et des salles de cours.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowClassModal(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Ajouter une Classe
        </button>
      </div>

      {/* Section 1 : Activation des Cycles de l'École */}
      <div className="p-5 rounded-2xl border shadow-xs space-y-3 transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
          <GraduationCap className="w-4 h-4 text-indigo-500" />
          Cycles Enseignés dans cet Établissement (EPST RDC)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {CYCLES_EPST.map(cycle => {
            const isActif = data.cyclesActifs.includes(cycle.id);
            return (
              <button
                key={cycle.id}
                type="button"
                onClick={() => handleToggleCycle(cycle.id)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isActif
                    ? 'border-indigo-500/80 bg-indigo-500/10 shadow-xs'
                    : 'opacity-60 hover:opacity-100 hover:border-slate-300'
                }`}
                style={{ borderColor: isActif ? '#6366f1' : 'var(--border)' }}
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cycle.nom}</p>
                  <span className="text-[10px] text-slate-400 font-semibold">{cycle.codeCite}</span>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  isActif ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {isActif && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal Création de Classe */}
      {showClassModal && (
        <form onSubmit={handleCreateClass} className="p-5 rounded-2xl border shadow-lg space-y-4 animate-fade-in"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold pb-2 border-b flex items-center gap-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            <Plus className="w-4 h-4 text-indigo-500" />
            Créer une Nouvelle Classe
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Cycle Scolaire *
              </label>
              <CustomSelect
                options={cycleSelectOptions}
                value={newClassCycle}
                onChange={val => setNewClassCycle(val)}
                className="w-full"
              />
            </div>

            {(newClassCycle === 'HUMANITES' || newClassCycle === 'TECHNIQUES' || newClassCycle === 'PROFESSIONNELLES') && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Option Secondaire EPST *
                </label>
                <CustomSelect
                  options={optionSelectOptions}
                  value={newClassOption}
                  onChange={val => setNewClassOption(val)}
                  searchable
                  className="w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Niveau d'Étude *
              </label>
              <select
                value={newClassLevel}
                onChange={e => setNewClassLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {(newClassCycle === 'HUMANITES' || newClassCycle === 'TECHNIQUES' || newClassCycle === 'PROFESSIONNELLES') ? (
                  NIVEAUX_HUMANITES.map(n => <option key={n} value={n}>{n} Année Humanités</option>)
                ) : (
                  (CLASSES_PAR_CYCLE[newClassCycle] || ['1ère', '2ème', '3ème']).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nom Personnalisé (Optionnel)
              </label>
              <input
                type="text"
                value={newClassCustomNom}
                onChange={e => setNewClassCustomNom(e.target.value)}
                placeholder="Ex: 3ème Math-Physique A"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nombre de Salles pour cette Classe
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={initialRoomsCount}
                onChange={e => setInitialRoomsCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <span className="text-[10px] text-slate-400">Ex: 2 pour Salle 1 & Salle 2</span>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Capacité Max par Salle (Élèves)
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={newClassCapacity}
                onChange={e => setNewClassCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowClassModal(false)}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Créer la Classe & ses Salles
            </button>
          </div>
        </form>
      )}

      {/* Modal Ajout de Salle Physique */}
      {showRoomModal && (
        <form onSubmit={handleAddRoom} className="p-5 rounded-2xl border shadow-lg space-y-4 animate-fade-in"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold pb-2 border-b flex items-center gap-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            <DoorClosed className="w-4 h-4 text-indigo-500" />
            Ajouter une Salle Physique à la Classe
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nom / Numéro de la Salle *
              </label>
              <input
                type="text"
                required
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="Ex: Salle 3, Labo B, Local 12..."
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Bâtiment / Pavillon (Optionnel)
              </label>
              <input
                type="text"
                value={newRoomBuilding}
                onChange={e => setNewRoomBuilding(e.target.value)}
                placeholder="Ex: Bloc A, Bâtiment Administratif"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Capacité Maximale (Élèves)
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={newRoomCapacity}
                onChange={e => setNewRoomCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowRoomModal(null)}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Ajouter la Salle
            </button>
          </div>
        </form>
      )}

      {/* Barre de Filtre des Classes par Cycle */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sidebar-scroll">
        <button
          onClick={() => setActiveCycleFilter('TOUS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCycleFilter === 'TOUS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          style={{ borderColor: activeCycleFilter === 'TOUS' ? 'transparent' : 'var(--border)' }}
        >
          Toutes les Classes ({data.classes.length})
        </button>

        {data.cyclesActifs.map(cycleId => {
          const cycleObj = CYCLES_EPST.find(c => c.id === cycleId);
          const count = data.classes.filter(c => c.cycleId === cycleId).length;
          return (
            <button
              key={cycleId}
              onClick={() => setActiveCycleFilter(cycleId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCycleFilter === cycleId
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              style={{ borderColor: activeCycleFilter === cycleId ? 'transparent' : 'var(--border)' }}
            >
              <span>{cycleObj?.nom ?? cycleId}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-200">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Liste des Classes et leurs Salles */}
      <div className="space-y-4">
        {filteredClasses.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border flex flex-col items-center gap-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <DoorClosed className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aucune classe configurée</p>
            <p className="text-xs text-slate-400">Cliquez sur "+ Ajouter une Classe" pour structurer votre établissement.</p>
          </div>
        ) : (
          filteredClasses.map(classe => {
            const cycleObj = CYCLES_EPST.find(c => c.id === classe.cycleId);
            const optionNom = classe.optionId ? getNomOption(classe.optionId) : null;

            return (
              <div
                key={classe.id}
                className="p-5 rounded-2xl border shadow-xs transition-colors space-y-3"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                {/* En-tête Classe */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                        {classe.nom}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                        {cycleObj?.nom}
                      </span>
                      {optionNom && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                          {optionNom}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRoomModal(classe.id)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter une Salle
                    </button>
                    <button
                      onClick={() => handleDeleteClass(classe.id)}
                      className="p-1.5 rounded-lg border text-xs text-red-500 hover:bg-red-500/10 border-red-500/20 cursor-pointer"
                      title="Supprimer la classe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges des Salles de la classe */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 block">Salles de cours attribuées :</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {classe.salles.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Aucune salle physique configurée</span>
                    ) : (
                      classe.salles.map(salle => (
                        <div
                          key={salle.id}
                          className="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-colors"
                          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                        >
                          <DoorClosed className="w-3.5 h-3.5 text-indigo-500" />
                          <span style={{ color: 'var(--text-primary)' }}>{salle.nomSalle}</span>
                          {salle.batiment && (
                            <span className="text-[10px] text-slate-400 font-medium">({salle.batiment})</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {salle.capacite} places
                          </span>
                          <button
                            onClick={() => handleDeleteRoom(classe.id, salle.id)}
                            className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
                            title="Supprimer cette salle"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
