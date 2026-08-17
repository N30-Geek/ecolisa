import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Plus, CheckCircle2, XCircle, Clock, FileText, Search, UserCheck, AlertCircle, Filter, Download } from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { MembrePersonnel } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { DocumentScanTool } from '../common/DocumentScanTool';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

export interface CongePersonnel {
  id: string;
  staffId: string;
  nomPersonnel: string;
  rolePersonnel: string;
  typeConge: 'ANNUEL' | 'MALADIE' | 'MATERNITE' | 'CIRCONSTANCE' | 'ABSENCE_JUSTIFIEE';
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  motif: string;
  statut: 'EN_ATTENTE' | 'APPROUVE' | 'REFUSE';
  approuvePar?: string;
  dateDemande: string;
  documentJustificatifUrl?: string;
  documentJustificatifNom?: string;
  /** true = retenue appliquée sur le salaire (uniquement pour statut REFUSE) */
  impactePaie?: boolean;
}

const typeCongeOptions: SelectOption[] = [
  { value: 'ANNUEL', label: 'Congé Annuel Réglementaire (30 jours max)' },
  { value: 'MALADIE', label: 'Congé de Maladie / Certificat Médical' },
  { value: 'MATERNITE', label: 'Congé de Maternité / Paternité' },
  { value: 'CIRCONSTANCE', label: 'Congé de Circonstance (Mariage/Deuil)' },
  { value: 'ABSENCE_JUSTIFIEE', label: 'Absence Autorisée / Mission Extérieure' },
];

const statusFilterOptions: SelectOption[] = [
  { value: 'ALL', label: 'Tous les Statuts' },
  { value: 'EN_ATTENTE', label: 'En Attente de Validation', badge: 'PENDING' },
  { value: 'APPROUVE', label: 'Approuvés & En Cours' },
  { value: 'REFUSE', label: 'Refusés / Annulés' },
];

export const LeavesManager: React.FC = () => {
  const [leaves, setLeaves] = useState<CongePersonnel[]>([]);
  const [staffList, setStaffList] = useState<MembrePersonnel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);

  // Formulaire de nouvelle demande
  const [newLeave, setNewLeave] = useState<Partial<CongePersonnel>>({
    staffId: '',
    typeConge: 'ANNUEL',
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: new Date().toISOString().split('T')[0],
    motif: '',
    documentJustificatifNom: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [staff, savedLeaves] = await Promise.all([
        LocalDatabaseService.getStaff(),
        LocalDatabaseService.getConfig('staff_leaves') || [],
      ]);
      setStaffList(staff);
      setLeaves(savedLeaves);
      if (staff.length > 0 && !newLeave.staffId) {
        setNewLeave((prev) => ({ ...prev, staffId: staff[0].id }));
      }
    } catch (e) {
      console.warn('[LeavesManager] Erreur de chargement :', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isNewModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isNewModalOpen]);

  const saveLeavesToDb = async (updated: CongePersonnel[]) => {
    setLeaves(updated);
    await LocalDatabaseService.setConfig('staff_leaves', updated);
  };

  // Calcul du nombre de jours ouvrables
  const calculateDays = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Number.isNaN(diffDays) ? 1 : diffDays;
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeave.staffId) return;

    const staffMember = staffList.find((s) => s.id === newLeave.staffId);
    const days = calculateDays(newLeave.dateDebut, newLeave.dateFin);

    const created: CongePersonnel = {
      id: `leave_${Date.now()}`,
      staffId: newLeave.staffId,
      nomPersonnel: staffMember ? `${staffMember.prenom} ${staffMember.nom}` : 'Personnel',
      rolePersonnel: staffMember?.role || 'ENSEIGNANT',
      typeConge: (newLeave.typeConge as any) || 'ANNUEL',
      dateDebut: newLeave.dateDebut || new Date().toISOString().split('T')[0],
      dateFin: newLeave.dateFin || new Date().toISOString().split('T')[0],
      nombreJours: days,
      motif: newLeave.motif || 'Demande de congé réglementaire.',
      statut: 'EN_ATTENTE',
      dateDemande: new Date().toISOString().split('T')[0],
      documentJustificatifNom: newLeave.documentJustificatifNom || '',
    };

    const updated = [created, ...leaves];
    await saveLeavesToDb(updated);
    setIsNewModalOpen(false);
    setNewLeave({
      staffId: staffList[0]?.id || '',
      typeConge: 'ANNUEL',
      dateDebut: new Date().toISOString().split('T')[0],
      dateFin: new Date().toISOString().split('T')[0],
      motif: '',
      documentJustificatifNom: '',
    });
  };

  const handleUpdateStatus = async (id: string, newStatut: 'APPROUVE' | 'REFUSE') => {
    const currentUser = LocalDatabaseService.getCurrentUser();
    const updated = leaves.map((l) => {
      if (l.id === id) {
        return {
          ...l,
          statut: newStatut,
          // Lors d'un refus : l'absence est non justifiée => retenue automatique
          impactePaie: newStatut === 'REFUSE' ? true : false,
          approuvePar: currentUser ? `${currentUser.nom} (${currentUser.role})` : 'Direction Établissement',
        };
      }
      return l;
    });
    await saveLeavesToDb(updated);
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const matchSearch =
        !searchTerm ||
        l.nomPersonnel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.motif.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = selectedStatusFilter === 'ALL' || l.statut === selectedStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [leaves, searchTerm, selectedStatusFilter]);

  const { paginated: paginatedLeaves, ...leavesPagination } = usePagination(filteredLeaves, { defaultPageSize: 12 });

  const staffSelectOptions: SelectOption[] = useMemo(() => {
    return staffList.map((s) => ({
      value: s.id,
      label: `${s.prenom} ${s.nom} — ${s.role}`,
    }));
  }, [staffList]);

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
              Gestion des Congés, Absences & Documents FST du Personnel
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registre des autorisations d’absences, justificatifs médicaux FST et validation hiérarchique
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-500/40 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Nouvelle Demande de Congé</span>
        </button>
      </div>

      {/* Barre de recherche et filtre */}
      <div
        className="p-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un membre du personnel ou un motif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="w-full sm:w-64">
          <CustomSelect
            options={statusFilterOptions}
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
            placeholder="Filtrer par statut"
          />
        </div>
      </div>

      {/* Liste des Demandes de Congé */}
      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Chargement du registre des congés...</div>
      ) : !filteredLeaves.length ? (
        <div
          className="p-8 rounded-2xl border text-center space-y-2 transition-colors"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Aucune demande de congé enregistrée
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Le registre des autorisations d'absence pour cette période est vierge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedLeaves.map((leave) => {
            const isApproved = leave.statut === 'APPROUVE';
            const isRejected = leave.statut === 'REFUSE';

            return (
              <div
                key={leave.id}
                className="p-4 rounded-2xl border shadow-xs flex flex-col justify-between space-y-3 transition-colors"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                        isApproved
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Approuvé</span>
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle className="w-3 h-3 text-rose-500" />
                          <span>Refusé</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                          <span>En Attente</span>
                        </>
                      )}
                    </span>

                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {leave.nombreJours} jour{leave.nombreJours > 1 ? 's' : ''}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {leave.nomPersonnel}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-2">
                    {leave.rolePersonnel}
                  </p>

                  <div className="p-2.5 rounded-xl border space-y-1 text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                      <span>Du : <strong style={{ color: 'var(--text-primary)' }}>{leave.dateDebut}</strong></span>
                      <span>Au : <strong style={{ color: 'var(--text-primary)' }}>{leave.dateFin}</strong></span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                      "{leave.motif}"
                    </p>
                  </div>
                </div>

                {/* Pièce Justificative & Actions */}
                <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                  {isRejected && leave.impactePaie && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="text-[10.5px] font-black text-rose-600 dark:text-rose-400">
                        Retenue sur salaire — {leave.nombreJours} j. non justifié{leave.nombreJours > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {leave.documentJustificatifNom && (
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{leave.documentJustificatifNom}</span>
                    </div>
                  )}

                  {leave.statut === 'EN_ATTENTE' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateStatus(leave.id, 'APPROUVE')}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valider</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(leave.id, 'REFUSE')}
                        className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Refuser</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
                      <span>Traité par :</span>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{leave.approuvePar || 'Direction'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <Pagination
            currentPage={leavesPagination.page}
            totalPages={leavesPagination.totalPages}
            total={leavesPagination.total}
            pageSize={leavesPagination.pageSize}
            start={leavesPagination.start}
            end={leavesPagination.end}
            onPageChange={leavesPagination.setPage}
            onPageSizeChange={leavesPagination.setPageSize}
          />
        </div>
      )}

      {/* Modale de Création de Demande de Congé */}
      {isNewModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsNewModalOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors"
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Nouvelle Demande de Congé ou Absence FST
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Membre du Personnel Concerné *
                </label>
                <CustomSelect
                  options={staffSelectOptions}
                  value={newLeave.staffId || ''}
                  onChange={(v) => setNewLeave({ ...newLeave, staffId: v })}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Type de Congé / Motif Officiel *
                </label>
                <CustomSelect
                  options={typeCongeOptions}
                  value={newLeave.typeConge || 'ANNUEL'}
                  onChange={(v) => setNewLeave({ ...newLeave, typeConge: v as any })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Date de Début *
                  </label>
                  <CustomDatePicker
                    value={newLeave.dateDebut || new Date().toISOString().split('T')[0]}
                    onChange={(d) => setNewLeave({ ...newLeave, dateDebut: d })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Date de Fin *
                  </label>
                  <CustomDatePicker
                    value={newLeave.dateFin || new Date().toISOString().split('T')[0]}
                    onChange={(d) => setNewLeave({ ...newLeave, dateFin: d })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Motifs & Détails Précis *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Précisez la raison administrative ou le motif médical du congé..."
                  value={newLeave.motif || ''}
                  onChange={(e) => setNewLeave({ ...newLeave, motif: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Outil de numérisation justificatif FST */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <label className="text-xs font-bold block mb-2" style={{ color: 'var(--text-primary)' }}>
                  Joindre / Numériser la Pièce Justificative FST (Certificat Médical)
                </label>
                <DocumentScanTool
                  entityId={newLeave.staffId || 'temp'}
                  entityType="STAFF"
                  category="CONGES_JUSTIFICATIF"
                  onDocumentAdded={(doc) => setNewLeave({ ...newLeave, documentJustificatifNom: doc.originalName || doc.fileName })}
                />
              </div>

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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Enregistrer la Demande
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
