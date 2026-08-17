import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Plus, Users, School, AlertTriangle, Loader2 } from 'lucide-react';
import { ClasseScolaire, AnneeScolaireConfig, CycleConfig } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect } from '../common/CustomSelect';
import { ClassPickerModal, SectionsModal, CYCLES_REF, NIVEAUX_PAR_CYCLE, CodeCycleWizard, DraftSection, parseClassesToDraft, uuid } from './SchoolYearWizardShared';

interface BulkAddClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  schoolYears: AnneeScolaireConfig[];
  activeSchoolYearId?: string;
  existingClasses: ClasseScolaire[];
}

const ACTIVE_CYCLES: Record<CodeCycleWizard, boolean> = {
  MATERNELLE: true,
  PRIMAIRE: true,
  SECONDAIRE_CTEB: true,
  HUMANITES: true,
};

const cycleCodeList = (cycles: CycleConfig[]) => cycles.map(c => c.code);

export const BulkAddClassesModal: React.FC<BulkAddClassesModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  schoolYears,
  activeSchoolYearId,
  existingClasses,
}) => {
  const [schoolYearId, setSchoolYearId] = useState<string>(activeSchoolYearId || schoolYears[0]?.id || '');
  const [selectedNiveaux, setSelectedNiveaux] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [sectionsModalNiveau, setSectionsModalNiveau] = useState<{ cycleCode: CodeCycleWizard; niveau: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const selectedYear = useMemo(() => schoolYears.find(y => y.id === schoolYearId), [schoolYears, schoolYearId]);

  // Charge les classes existantes de l'année pour pré-remplir / cocher le picker
  useEffect(() => {
    if (!isOpen || !schoolYearId) {
      setSelectedNiveaux({});
      setSections([]);
      return;
    }
    setLoadingExisting(true);
    LocalDatabaseService.getClasses(schoolYearId)
      .then(classes => {
        const { selected, sections } = parseClassesToDraft(classes);
        setSelectedNiveaux(selected);
        setSections(sections);
      })
      .catch(err => console.error('[BulkAddClassesModal] Erreur chargement classes :', err))
      .finally(() => setLoadingExisting(false));
  }, [isOpen, schoolYearId]);
  const activeCycles = useMemo(() => {
    const codes = (selectedYear?.cycles?.map(c => c.code as CodeCycleWizard) || []).filter(Boolean);
    if (codes.length === 0) return Object.keys(ACTIVE_CYCLES) as CodeCycleWizard[];
    return codes;
  }, [selectedYear]);

  const selectedNiveauxList = useMemo(() => {
    return Object.keys(selectedNiveaux)
      .filter(k => selectedNiveaux[k])
      .map(k => {
        const [cycleCode, niveau] = k.split('|');
        return { cycleCode: cycleCode as CodeCycleWizard, niveau };
      })
      .filter(({ cycleCode }) => activeCycles.includes(cycleCode));
  }, [selectedNiveaux, activeCycles]);

  const removeSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id));

  const addSections = (cycleCode: CodeCycleWizard, niveau: string, rows: { label: string; capacite: number }[]) => {
    setSections(prev => [
      ...prev,
      ...rows.map(r => ({ id: uuid(), cycleCode, niveau, label: r.label, capacite: r.capacite })),
    ]);
  };

  const handleSave = async () => {
    if (!schoolYearId) {
      setError('Veuillez sélectionner une année scolaire.');
      return;
    }
    if (sections.length === 0) {
      setError('Veuillez sélectionner au moins une classe et une section.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const existingClasses = await LocalDatabaseService.getClasses(schoolYearId);
      const existingNames = new Set(existingClasses.map(c => c.nom));
      const newSections = sections.filter(s => !existingNames.has(`${s.niveau} ${s.label}`));

      if (newSections.length === 0) {
        setError('Toutes les classes sélectionnées existent déjà pour cette année.');
        setSaving(false);
        return;
      }

      for (const sec of newSections) {
        const classe: ClasseScolaire = {
          id: uuid(),
          schoolYearId,
          cycleId: sec.cycleCode,
          cycleCode: sec.cycleCode,
          nom: `${sec.niveau} ${sec.label}`,
          salle: `${sec.niveau} ${sec.label}`,
          optionCode: 'TRONC_COMMUN',
          nombreEleves: 0,
          capacite: sec.capacite,
          professeurTitulaire: 'Non Attribué',
        };
        await LocalDatabaseService.addClass(classe);
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création des classes.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setSelectedNiveaux({});
    setSections([]);
    setError(null);
    onClose();
  };

  const existingLabelsForNiveau = (cycleCode: CodeCycleWizard, niveau: string) =>
    sections.filter(s => s.cycleCode === cycleCode && s.niveau === niveau).map(s => s.label);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl" onClick={handleClose}>
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-[0_32px_80px_-12px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-300"
        style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between shrink-0" style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Créer des Classes RDC</h3>
              <p className="text-[11px] text-slate-400 font-medium">Sélection multiple · sections A, B, C · par année scolaire</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 sidebar-scroll space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Année Scolaire *</label>
            <CustomSelect
              value={schoolYearId}
              onChange={setSchoolYearId}
              options={schoolYears.map(y => ({ value: y.id, label: `${y.nom} (${y.statut})` }))}
              placeholder="Sélectionner une année"
            />
          </div>

          {loadingExisting && (
            <div className="p-6 rounded-2xl border border-dashed text-center animate-pulse" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-semibold">Chargement des classes existantes…</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Classes & Sections</h4>
            <button
              type="button"
              onClick={() => setShowClassPicker(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Sélectionner les Classes RDC
            </button>
          </div>

          {selectedNiveauxList.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="w-14 h-14 rounded-2xl bg-slate-500/10 flex items-center justify-center mx-auto mb-3">
                <School className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 font-bold">Aucune classe sélectionnée</p>
              <p className="text-[11px] text-slate-500 mt-1">Cliquez sur « Sélectionner les Classes RDC » pour commencer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedNiveauxList.map(({ cycleCode, niveau }) => {
                const secs = sections.filter(s => s.cycleCode === cycleCode && s.niveau === niveau);
                return (
                  <div key={`${cycleCode}|${niveau}`} className="p-4 rounded-2xl border shadow-sm hover:shadow-md transition-shadow" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: CYCLES_REF.find(c => c.code === cycleCode)?.couleur ? `var(--${CYCLES_REF.find(c => c.code === cycleCode)?.couleur}-500, #6366f1)` : '#6366f1' }} />
                        <div>
                          <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{niveau}</p>
                          <p className="text-[10px] text-slate-400">{CYCLES_REF.find(c => c.code === cycleCode)?.nom}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSectionsModalNiveau({ cycleCode, niveau })}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Sections
                      </button>
                    </div>
                    {secs.length === 0 ? (
                      <p className="text-[11px] text-amber-500 font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Aucune section ajoutée pour ce niveau.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {secs.map(s => (
                          <span key={s.id} className="px-3 py-1.5 rounded-lg bg-slate-500/10 border text-[11px] font-bold flex items-center gap-2 hover:border-indigo-500/30 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                            {niveau} {s.label} · {s.capacite} places
                            <button type="button" onClick={() => removeSection(s.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-bold" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <span className="text-slate-500 dark:text-slate-400">Total sections à créer</span>
            <span className="text-indigo-600 dark:text-indigo-400">{sections.length} classe(s)</span>
          </div>
        </div>

        <div className="p-5 border-t flex items-center justify-between shrink-0" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-500/10 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || sections.length === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Création en cours…' : 'Créer les Classes'}
          </button>
        </div>
      </div>

      {showClassPicker && (
        <ClassPickerModal
          activeCycles={activeCycles}
          selectedNiveaux={selectedNiveaux}
          onToggle={(key) => setSelectedNiveaux(prev => ({ ...prev, [key]: !prev[key] }))}
          onConfirm={() => {
            setSections(prev => prev.filter(s => selectedNiveaux[`${s.cycleCode}|${s.niveau}`]));
            setShowClassPicker(false);
          }}
          onClose={() => setShowClassPicker(false)}
        />
      )}

      {sectionsModalNiveau && (
        <SectionsModal
          cycleCode={sectionsModalNiveau.cycleCode}
          niveau={sectionsModalNiveau.niveau}
          existingLabels={existingLabelsForNiveau(sectionsModalNiveau.cycleCode, sectionsModalNiveau.niveau)}
          onConfirm={(rows) => { addSections(sectionsModalNiveau.cycleCode, sectionsModalNiveau.niveau, rows); setSectionsModalNiveau(null); }}
          onClose={() => setSectionsModalNiveau(null)}
        />
      )}
    </div>,
    document.body
  );
};
