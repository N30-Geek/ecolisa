import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarOff, Plus, CheckCircle2, XCircle, Clock, FileText, Search,
  AlertCircle, Trash2, Users2,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { Eleve, ClasseScolaire, Presence } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { DocumentScanTool } from '../common/DocumentScanTool';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

const uuid = () => (window as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const statutOptions: SelectOption[] = [
  { value: 'ABSENT', label: 'Absence Non Justifiée' },
  { value: 'RETARD', label: 'Retard' },
  { value: 'JUSTIFIE', label: 'Absence Justifiée (avec motif)' },
];

const statusFilterOptions: SelectOption[] = [
  { value: 'ALL', label: 'Tous les Statuts' },
  { value: 'ABSENT', label: 'Absences Non Justifiées' },
  { value: 'RETARD', label: 'Retards' },
  { value: 'JUSTIFIE', label: 'Absences Justifiées' },
];

interface StudentAbsencesManagerProps {
  activeSchoolYear?: string;
}

export const StudentAbsencesManager: React.FC<StudentAbsencesManagerProps> = ({ activeSchoolYear }) => {
  const [presences, setPresences] = useState<Presence[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);

  const [newAbsence, setNewAbsence] = useState<Partial<Presence>>({
    eleveId: '',
    statut: 'ABSENT',
    dateJour: new Date().toISOString().split('T')[0],
    motif: '',
  });
  const [justificatifNom, setJustificatifNom] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [st, cls, pres] = await Promise.all([
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getPresences(),
      ]);
      setStudents(st || []);
      setClasses(cls || []);
      // On ne garde que les absences/retards (pas les présences "normales")
      setPresences((pres || []).filter(p => p.statut !== 'PRESENT'));
    } catch (e) {
      console.warn('[StudentAbsencesManager] Erreur de chargement :', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolYear]);

  useEffect(() => {
    if (!isNewModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isNewModalOpen]);

  const studentById = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
  const classById = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  const studentSelectOptions: SelectOption[] = useMemo(() => {
    return students.map(s => ({
      value: s.id,
      label: `${s.prenom} ${s.nom} — ${s.registrationNumber}${s.nomClasse ? ` (${s.nomClasse})` : ''}`,
    }));
  }, [students]);

  const classFilterOptions: SelectOption[] = useMemo(() => [
    { value: 'ALL', label: 'Toutes les Classes' },
    ...classes.map(c => ({ value: c.id, label: c.nom })),
  ], [classes]);

  const handleCreateAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAbsence.eleveId) return;
    const student = studentById.get(newAbsence.eleveId);

    const created: Presence = {
      id: uuid(),
      eleveId: newAbsence.eleveId,
      classeId: student?.classId,
      anneeScolaireId: student?.schoolYearId,
      dateJour: newAbsence.dateJour || new Date().toISOString().split('T')[0],
      statut: (newAbsence.statut as Presence['statut']) || 'ABSENT',
      motif: newAbsence.motif || '',
    } as Presence & { justificatifNom?: string };
    (created as any).justificatifNom = justificatifNom || undefined;

    await LocalDatabaseService.addPresence(created);
    await loadData();
    setIsNewModalOpen(false);
    setNewAbsence({ eleveId: '', statut: 'ABSENT', dateJour: new Date().toISOString().split('T')[0], motif: '' });
    setJustificatifNom('');
  };

  const handleMarkJustified = async (presence: Presence) => {
    await LocalDatabaseService.updatePresence(presence.id, { statut: 'JUSTIFIE' });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet enregistrement d\'absence ?')) return;
    await LocalDatabaseService.deletePresence(id);
    await loadData();
  };

  const filteredPresences = useMemo(() => {
    return presences
      .filter(p => {
        const student = studentById.get(p.eleveId);
        const matchSearch =
          !searchTerm ||
          (student && `${student.prenom} ${student.nom} ${student.registrationNumber}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.motif || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = selectedStatusFilter === 'ALL' || p.statut === selectedStatusFilter;
        const matchClass = selectedClassFilter === 'ALL' || p.classeId === selectedClassFilter;
        return matchSearch && matchStatus && matchClass;
      })
      .sort((a, b) => (b.dateJour || '').localeCompare(a.dateJour || ''));
  }, [presences, searchTerm, selectedStatusFilter, selectedClassFilter, studentById]);

  const { paginated: paginatedPresences, ...presencesPagination } = usePagination(filteredPresences, { defaultPageSize: 12 });

  const stats = useMemo(() => {
    const total = presences.length;
    const nonJustifiees = presences.filter(p => p.statut === 'ABSENT').length;
    const retards = presences.filter(p => p.statut === 'RETARD').length;
    const justifiees = presences.filter(p => p.statut === 'JUSTIFIE').length;
    return { total, nonJustifiees, retards, justifiees };
  }, [presences]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* En-tête de section */}
      <div
        className="p-5 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Registre des Absences & Retards des Élèves
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Suivi des absences, retards et justificatifs par élève et par classe
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-rose-500/40 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Signaler une Absence</span>
        </button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Total Enregistré</p>
          <p className="text-lg font-black font-mono" style={{ color: 'var(--text-primary)' }}>{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] text-rose-500 font-bold uppercase">Non Justifiées</p>
          <p className="text-lg font-black font-mono text-rose-600">{stats.nonJustifiees}</p>
        </div>
        <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] text-amber-500 font-bold uppercase">Retards</p>
          <p className="text-lg font-black font-mono text-amber-600">{stats.retards}</p>
        </div>
        <div className="p-3.5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] text-emerald-500 font-bold uppercase">Justifiées</p>
          <p className="text-lg font-black font-mono text-emerald-600">{stats.justifiees}</p>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div
        className="p-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3 transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un élève ou un motif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="w-full sm:w-56">
          <CustomSelect options={classFilterOptions} value={selectedClassFilter} onChange={setSelectedClassFilter} placeholder="Filtrer par classe" />
        </div>

        <div className="w-full sm:w-64">
          <CustomSelect options={statusFilterOptions} value={selectedStatusFilter} onChange={setSelectedStatusFilter} placeholder="Filtrer par statut" />
        </div>
      </div>

      {/* Liste des absences */}
      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Chargement du registre des absences...</div>
      ) : !filteredPresences.length ? (
        <div
          className="p-8 rounded-2xl border text-center space-y-2 transition-colors"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Aucune absence enregistrée
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Le registre des absences et retards pour cette sélection est vierge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPresences.map((presence) => {
            const student = studentById.get(presence.eleveId);
            const cls = presence.classeId ? classById.get(presence.classeId) : undefined;
            const isJustified = presence.statut === 'JUSTIFIE';
            const isRetard = presence.statut === 'RETARD';

            return (
              <div
                key={presence.id}
                className="p-4 rounded-2xl border shadow-xs flex flex-col justify-between space-y-3 transition-colors"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                        isJustified
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : isRetard
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {isJustified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Justifiée</span>
                        </>
                      ) : isRetard ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Retard</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-500" />
                          <span>Non Justifiée</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{presence.dateJour}</span>
                  </div>

                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {student ? `${student.prenom} ${student.nom}` : 'Élève inconnu'}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-2">
                    {cls?.nom || student?.nomClasse || 'Classe non renseignée'} · {student?.registrationNumber}
                  </p>

                  {presence.motif && (
                    <div className="p-2.5 rounded-xl border text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">"{presence.motif}"</p>
                    </div>
                  )}
                  {(presence as any).justificatifNom && (
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{(presence as any).justificatifNom}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                  {!isJustified && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[10.5px] font-black text-amber-700 dark:text-amber-400">
                        En attente de justification des parents
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {!isJustified && (
                      <button
                        onClick={() => handleMarkJustified(presence)}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marquer Justifiée</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(presence.id)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-all cursor-pointer shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <Pagination
            currentPage={presencesPagination.page}
            totalPages={presencesPagination.totalPages}
            total={presencesPagination.total}
            pageSize={presencesPagination.pageSize}
            start={presencesPagination.start}
            end={presencesPagination.end}
            onPageChange={presencesPagination.setPage}
            onPageSizeChange={presencesPagination.setPageSize}
          />
        </div>
      )}

      {/* Modale de Signalement d'une Absence */}
      {isNewModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsNewModalOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors"
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Signaler une Absence / un Retard
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAbsence} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Élève Concerné *
                </label>
                <CustomSelect
                  options={studentSelectOptions}
                  value={newAbsence.eleveId || ''}
                  onChange={(v) => setNewAbsence({ ...newAbsence, eleveId: v })}
                  placeholder="Rechercher un élève..."
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Statut *
                </label>
                <CustomSelect
                  options={statutOptions}
                  value={newAbsence.statut || 'ABSENT'}
                  onChange={(v) => setNewAbsence({ ...newAbsence, statut: v as any })}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Date *
                </label>
                <CustomDatePicker
                  value={newAbsence.dateJour || new Date().toISOString().split('T')[0]}
                  onChange={(d) => setNewAbsence({ ...newAbsence, dateJour: d })}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Motif (si justifiée ou connu)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Maladie, raison familiale, rendez-vous médical..."
                  value={newAbsence.motif || ''}
                  onChange={(e) => setNewAbsence({ ...newAbsence, motif: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              {newAbsence.eleveId && (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <label className="text-xs font-bold block mb-2" style={{ color: 'var(--text-primary)' }}>
                    Joindre / Numériser le Mot des Parents (facultatif)
                  </label>
                  <DocumentScanTool
                    entityId={newAbsence.eleveId}
                    entityType="STUDENT"
                    category="ABSENCE_JUSTIFICATIF"
                    onDocumentAdded={(doc) => setJustificatifNom(doc.originalName || doc.fileName || '')}
                  />
                </div>
              )}

              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
