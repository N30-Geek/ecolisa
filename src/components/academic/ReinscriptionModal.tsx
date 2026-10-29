import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  GraduationCap,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Save,
  Calculator,
  Wallet,
  Calendar,
} from 'lucide-react';
import type { Eleve, ClasseScolaire, AnneeScolaireConfig, FactureEleve, LigneFacture } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { showToast } from '../common/ToastNotification';
import { uuid } from '../../utils/feeTranches';

interface ReinscriptionModalProps {
  student: Eleve;
  onClose: () => void;
  onSuccess: () => void;
}

const PASSAGE_THRESHOLD = 50; // % de la moyenne générale

type DecisionType = 'PASS' | 'REPEAT' | 'EXCLU';

const DECISION_OPTIONS: { value: DecisionType; label: string; color: string; description: string }[] = [
  { value: 'PASS', label: 'Passage', color: 'emerald', description: "Passe à la classe supérieure" },
  { value: 'REPEAT', label: 'Redoublement', color: 'amber', description: "Reste dans la même classe" },
  { value: 'EXCLU', label: 'Exclusion', color: 'rose', description: "N'est plus réinscrit" },
];

export const ReinscriptionModal: React.FC<ReinscriptionModalProps> = ({ student, onClose, onSuccess }) => {
  const { currency, referenceCurrency, currencies, format } = useSchoolConfig();

  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const [targetYearId, setTargetYearId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [decision, setDecision] = useState<DecisionType>('PASS');
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [feeCurrency, setFeeCurrency] = useState<string>(referenceCurrency || 'USD');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Chargement initial
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [clsList, yearList] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSchoolYears(),
      ]);
      setClasses(clsList);
      setYears(yearList);

      const currentYear = yearList.find(y => y.id === student.schoolYearId);
      const nextYear =
        yearList.find(y => y.id !== student.schoolYearId && y.statut === 'EN_COURS') ||
        yearList.find(y => y.id !== student.schoolYearId && y.statut === 'PLANIFIEE') ||
        yearList.find(y => y.id !== student.schoolYearId) ||
        yearList[0];
      const defaultYear = nextYear || currentYear;
      setTargetYearId(defaultYear?.id || '');
      setFeeCurrency(referenceCurrency || 'USD');
      setLoading(false);
    };
    load();
  }, [student, referenceCurrency]);

  // Décision automatique selon les résultats de l'élève
  const recommendedDecision = useMemo<DecisionType>(() => {
    if (student.decisionConseil) {
      const d = student.decisionConseil.toLowerCase();
      if (d.includes('admis') || d.includes('pass') || d.includes('promu') || d.includes('réussite')) return 'PASS';
      if (d.includes('redouble') || d.includes('échec') || d.includes('recalé')) return 'REPEAT';
      if (d.includes('exclu') || d.includes('renvoi')) return 'EXCLU';
    }
    if (typeof student.pourcentageGeneral === 'number') {
      return student.pourcentageGeneral >= PASSAGE_THRESHOLD ? 'PASS' : 'REPEAT';
    }
    return 'PASS';
  }, [student]);

  // Proposition de frais de réinscription selon l'année cible
  const targetYear = useMemo(() => years.find(y => y.id === targetYearId), [years, targetYearId]);

  useEffect(() => {
    if (targetYear && targetYear.fraisReinscription > 0) {
      setFeeAmount(targetYear.fraisReinscription);
    }
  }, [targetYear]);

  // Filtrer les classes de l'année cible
  const targetClasses = useMemo(() => {
    return classes
      .filter(c => c.schoolYearId === targetYearId || !c.schoolYearId)
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [classes, targetYearId]);

  // Classe cible par défaut
  useEffect(() => {
    const currentClass = classes.find(c => c.id === student.classId);
    let suggestion: ClasseScolaire | undefined;

    if (decision === 'REPEAT' && currentClass) {
      // Essaye de retrouver la même classe (même nom ou même cycle/option)
      suggestion =
        targetClasses.find(c => c.nom === currentClass.nom) ||
        targetClasses.find(c =>
          c.cycleId === currentClass.cycleId &&
          (c.optionCode || 'TRONC_COMMUN') === (currentClass.optionCode || 'TRONC_COMMUN')
        );
    } else if (decision === 'PASS' && currentClass) {
      suggestion = targetClasses.find(c =>
        c.cycleId === currentClass.cycleId &&
        (c.optionCode || 'TRONC_COMMUN') === (currentClass.optionCode || 'TRONC_COMMUN')
      );
    }

    setTargetClassId(suggestion?.id || targetClasses[0]?.id || '');
  }, [targetClasses, decision, student, classes]);

  const targetClass = useMemo(() => targetClasses.find(c => c.id === targetClassId), [targetClasses, targetClassId]);
  const currentClass = useMemo(() => classes.find(c => c.id === student.classId), [classes, student.classId]);

  const currencyOptions: SelectOption[] = useMemo(() => {
    return (currencies.length ? currencies : [{ code: 'USD' } as any]).map((c: any) => ({
      value: c.code,
      label: `${c.code}${c.name ? ` — ${c.name}` : ''}`,
    }));
  }, [currencies]);

  const yearOptions: SelectOption[] = useMemo(() => {
    return years.map(y => ({
      value: y.id,
      label: `${y.nom} ${y.statut === 'EN_COURS' ? '(Active)' : y.statut === 'PLANIFIEE' ? '(Planifiée)' : ''}`,
    }));
  }, [years]);

  const classOptions: SelectOption[] = useMemo(() => {
    return targetClasses.map(c => ({
      value: c.id,
      label: `${c.nom}${c.salle ? ` — Salle ${c.salle}` : ''}`,
    }));
  }, [targetClasses]);

  const handleApplyRecommendation = () => {
    setDecision(recommendedDecision);
  };

  const handleSubmit = async () => {
    if (!targetYear || !targetClass) {
      showToast('Champs manquants', "Veuillez choisir une année scolaire et une classe cible.", 'error');
      return;
    }
    if (decision !== 'EXCLU' && feeAmount < 0) {
      showToast('Montant invalide', "Le montant des frais ne peut pas être négatif.", 'error');
      return;
    }

    setSaving(true);
    try {
      const historyEntry: import('../../types').HistoriqueInscription = {
        id: uuid(),
        anneeScolaireId: targetYear.id,
        anneeScolaireNom: targetYear.nom,
        ancienneClasseId: currentClass?.id,
        ancienneClasseNom: currentClass?.nom || student.nomClasse,
        nouvelleClasseId: targetClass.id,
        nouvelleClasseNom: targetClass.nom,
        decision,
        moyenne: student.pourcentageGeneral,
        mention: student.mentionConseil,
        montantFrais: decision === 'EXCLU' ? undefined : feeAmount,
        deviseFrais: decision === 'EXCLU' ? undefined : feeCurrency,
        date: new Date().toISOString(),
        commentaire: comment,
      };

      let factureId: string | undefined;

      if (decision !== 'EXCLU' && feeAmount > 0) {
        const lignes: LigneFacture[] = [{
          id: uuid(),
          invoiceId: '',
          feeTypeId: '',
          nom: 'Frais de réinscription',
          categorie: 'FRAIS_REINSCRIPTION',
          montant: feeAmount,
          devise: feeCurrency,
        }];

        const invoice: FactureEleve = {
          id: uuid(),
          anneeScolaireId: targetYear.id,
          schoolYearId: targetYear.id,
          anneeScolaire: targetYear.nom,
          numeroFacture: `F-REIN-${Date.now()}`,
          eleveId: student.id,
          studentId: student.id,
          nomEleve: `${student.prenom} ${student.nom}`,
          nomClasse: targetClass.nom,
          classeId: targetClass.id,
          montantTotal: feeAmount,
          montantPaye: 0,
          devise: feeCurrency,
          statut: 'NON_PAYE',
          dateEcheance: dueDate,
          lignes,
        };

        const saved = await LocalDatabaseService.addInvoice(invoice);
        if (saved) {
          factureId = saved.id;
          historyEntry.fraisFactureId = saved.id;
        }
      }

      const updatedHistory = [...(student.historiqueInscriptions || []), historyEntry];

      await LocalDatabaseService.updateEleve(student.id, {
        schoolYearId: targetYear.id,
        anneePrecedente: student.schoolYearId,
        moyenneAnneePrecedente: student.pourcentageGeneral,
        classId: targetClass.id,
        nomClasse: targetClass.nom,
        statut: decision === 'EXCLU' ? 'EXCLU' : decision === 'REPEAT' ? 'REDOUBLANT' : 'ACTIF',
        historiqueInscriptions: updatedHistory,
      });

      showToast(
        'Réinscription effectuée',
        `${student.prenom} ${student.nom} a été ${decision === 'PASS' ? 'promu' : decision === 'REPEAT' ? 'redoublant' : 'exclu'} ${decision !== 'EXCLU' ? 'vers ' + targetClass.nom : ''}${factureId ? ' avec facture générée' : ''}.`,
        'success'
      );
      onSuccess();
    } catch (err: any) {
      console.error('[ReinscriptionModal] Erreur réinscription :', err);
      showToast('Erreur', err.message || 'La réinscription a échoué.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const decisionBadge = DECISION_OPTIONS.find(d => d.value === decision);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Réinscription de l'élève</h3>
              <p className="text-[10.5px] text-slate-400">{student.prenom} {student.nom} · {student.registrationNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Chargement des années et classes...</div>
          ) : (
            <>
              {/* Aperçu année/classe actuelle */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Situation actuelle</span>
                  {typeof student.pourcentageGeneral === 'number' && (
                    <span className="text-[10.5px] font-bold text-indigo-600">
                      Moyenne : {student.pourcentageGeneral}%
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                  <div>
                    <span className="text-slate-400">Classe :</span>{' '}
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{student.nomClasse || 'Non renseignée'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Année :</span>{' '}
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{years.find(y => y.id === student.schoolYearId)?.nom || student.schoolYearId}</span>
                  </div>
                </div>
                {student.mentionConseil && (
                  <div className="mt-2 text-[10.5px] font-bold text-emerald-600">Décision du conseil : {student.mentionConseil}</div>
                )}
              </div>

              {/* Décision */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Décision de passage</div>
                  <button
                    onClick={handleApplyRecommendation}
                    className="flex items-center gap-1 text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Appliquer la recommandation ({DECISION_OPTIONS.find(d => d.value === recommendedDecision)?.label})
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {DECISION_OPTIONS.map(d => {
                    const active = decision === d.value;
                    return (
                      <button
                        key={d.value}
                        onClick={() => setDecision(d.value)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          active
                            ? `bg-${d.color}-500/10 border-${d.color}-500/40 text-${d.color}-600 dark:text-${d.color}-400`
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-500/5'
                        }`}
                        style={{ borderColor: active ? `var(--${d.color}-500, #${d.color === 'emerald' ? '10b981' : d.color === 'amber' ? 'f59e0b' : 'f43f5e'})` : 'var(--border)' }}
                      >
                        <span>{d.label}</span>
                        <span className="text-[9.5px] font-normal opacity-75 text-center leading-tight">{d.description}</span>
                      </button>
                    );
                  })}
                </div>

                {decision === 'PASS' && (
                  <div className="mt-2 p-2 rounded-lg bg-emerald-500/5 text-emerald-600 text-[10.5px] font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    L'élève passe dans la classe sélectionnée ci-dessous.
                  </div>
                )}
                {decision === 'REPEAT' && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/5 text-amber-600 text-[10.5px] font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    L'élève redouble. Vérifiez la classe cible (souvent la même classe ou équivalente).
                  </div>
                )}
                {decision === 'EXCLU' && (
                  <div className="mt-2 p-2 rounded-lg bg-rose-500/5 text-rose-600 text-[10.5px] font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    L'élève est exclu et n'est pas réinscrit. Aucune facture ne sera générée.
                  </div>
                )}
              </div>

              {/* Année & classe cible */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
                <div className="text-[10.5px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Réinscription cible</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-500">Année scolaire cible</label>
                    <CustomSelect
                      options={yearOptions}
                      value={targetYearId}
                      onChange={setTargetYearId}
                      placeholder="Choisir l'année scolaire"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-500">Classe cible</label>
                    <CustomSelect
                      options={classOptions}
                      value={targetClassId}
                      onChange={setTargetClassId}
                      placeholder="Choisir la classe"
                    />
                  </div>
                </div>

                {targetClass && currentClass && decision === 'PASS' && targetClass.id === currentClass.id && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/5 text-amber-600 text-[10.5px] font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    La classe cible est identique à la classe actuelle. Voulez-vous plutôt redoubler ?
                  </div>
                )}

                {targetClass && decision === 'REPEAT' && targetClass.nom !== currentClass?.nom && (
                  <div className="mt-2 p-2 rounded-lg bg-sky-500/5 text-sky-600 text-[10.5px] font-bold flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                    Redoublement : la classe sélectionnée est différente de l'année précédente.
                  </div>
                )}
              </div>

              {/* Frais de réinscription */}
              {decision !== 'EXCLU' && (
                <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
                  <div className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    <Wallet className="w-3.5 h-3.5" />
                    Frais de réinscription
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-bold text-slate-500">Montant</label>
                      <NumberInput
                        value={feeAmount}
                        onChange={setFeeAmount}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      {targetYear && targetYear.fraisReinscription > 0 && feeAmount !== targetYear.fraisReinscription && (
                        <button
                          onClick={() => setFeeAmount(targetYear.fraisReinscription)}
                          className="text-[9.5px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                        >
                          Rétablir le montant de l'année ({format(targetYear.fraisReinscription, referenceCurrency)})
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-bold text-slate-500">Devise</label>
                      <CustomSelect
                        options={currencyOptions}
                        value={feeCurrency}
                        onChange={setFeeCurrency}
                        placeholder="Devise"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-bold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Date d'échéance
                      </label>
                      <CustomDatePicker
                        value={dueDate}
                        onChange={setDueDate}
                        placeholder="Échéance"
                        className="w-full"
                      />
                    </div>
                  </div>
                  {feeAmount > 0 && (
                    <div className="mt-2 text-[10.5px] font-bold text-emerald-600">
                      Montant affiché : {format(feeAmount, feeCurrency)}
                    </div>
                  )}
                </div>
              )}

              {/* Commentaire */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
                <label className="text-[10.5px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Commentaire (optionnel)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  placeholder="Motif, observation du conseil..."
                  className="w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)', boxShadow: 'var(--elevation-1)' }}
          >
            Annuler
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyRecommendation}
              disabled={loading}
              className="px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: '#6366f1', boxShadow: 'var(--elevation-1)' }}
            >
              <Calculator className="w-3.5 h-3.5 inline mr-1.5" />
              Recommandation
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || loading || !targetClassId}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Traitement...' : 'Confirmer la réinscription'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
