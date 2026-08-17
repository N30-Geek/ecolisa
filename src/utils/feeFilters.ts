import type { TypeFraisScolaire, FraisAnnexeConfig } from '../types';

export interface FeeContext {
  schoolYearId?: string;
  classId?: string;
  className?: string;
  cycleId?: string;
  option?: string;
  salleId?: string;
  regime?: string;
}

export interface FeeLike {
  actif?: boolean;
  schoolYearId?: string;
  anneeScolaireId?: string;
  classId?: string;
  salleId?: string;
  cycleId?: string;
  optionCode?: string;
  regime?: string;
  portee?: string;
  typeFrais?: string;
  categorie?: string;
}

/**
 * Détermine si un frais (DB TypeFraisScolaire ou FraisAnnexeConfig d'une année)
 * est applicable au contexte élève/classe sélectionné.
 *
 * Règles :
 * - exclu si inactif ou pas de la bonne année
 * - exclu si classId/salleId/cycleId/optionCode/régime ne correspondent pas
 * - si la portée est "Toute l'école" :
 *   - garder sauf si c'est un uniforme (un uniforme ne doit pas être générique)
 * - sinon, la portée doit contenir le nom de classe, le libellé du cycle ou l'option
 */
export function isFeeApplicable(
  fee: FeeLike,
  ctx: FeeContext,
  cycleLabels: Record<string, string>
): boolean {
  if (fee.actif === false) return false;

  if (
    fee.schoolYearId &&
    fee.schoolYearId !== ctx.schoolYearId &&
    fee.anneeScolaireId !== ctx.schoolYearId
  ) {
    return false;
  }

  if (fee.classId && fee.classId !== ctx.classId) return false;
  if (fee.salleId && fee.salleId !== ctx.salleId) return false;

  const feeCycleId = fee.cycleId || 'TOUS';
  const feeOption = fee.optionCode || 'TOUS';
  const feeRegime = fee.regime || 'TOUS';

  if (feeCycleId !== 'TOUS' && feeCycleId !== ctx.cycleId) return false;
  if (feeOption !== 'TOUS' && feeOption !== ctx.option) return false;
  if (feeRegime !== 'TOUS' && feeRegime !== ctx.regime) return false;

  // Si un ciblage strict (cycle/option/classe/salle/régime) a déjà validé le frais,
  // on ne se base plus sur le libellé de portée, sauf pour exclure les uniformes génériques.
  const hasSpecificTarget =
    (feeCycleId !== 'TOUS' && feeCycleId === ctx.cycleId) ||
    (feeOption !== 'TOUS' && feeOption === ctx.option) ||
    (feeRegime !== 'TOUS' && feeRegime === ctx.regime) ||
    (!!fee.classId && fee.classId === ctx.classId) ||
    (!!fee.salleId && fee.salleId === ctx.salleId);

  const portee = (fee.portee || '').toLowerCase();
  const categorie = (fee.categorie || fee.typeFrais || '').toUpperCase();

  const isGenericAllSchool = portee.includes('toute') && portee.includes('école');
  const isUniforme = categorie === 'FRAIS_UNIFORME' || portee.includes('uniforme');

  if (isGenericAllSchool) return !isUniforme;

  // Si le frais a déjà ciblé un élément spécifique, la portée descriptive est suffisante.
  if (hasSpecificTarget) return true;

  const classNameLower = (ctx.className || '').toLowerCase();
  const cycleLabelLower = (cycleLabels[ctx.cycleId || ''] || ctx.cycleId || '').toLowerCase();
  const optionLower = (ctx.option || '').toLowerCase();

  const cycleLabelWords = cycleLabelLower.split(/[^\wéèàêôûç\-]+/).filter(w => w.length >= 3);

  const matchesClass = classNameLower && (portee === classNameLower || portee.includes(classNameLower));
  const matchesCycle = cycleLabelWords.some(w => portee.includes(w));
  const matchesOption = optionLower && portee.includes(optionLower);

  return !!matchesClass || !!matchesCycle || !!matchesOption;
}

/**
 * Version typée pour FraisAnnexeConfig (année scolaire)
 */
export function isFraisAnnexeApplicable(
  fa: FraisAnnexeConfig,
  ctx: FeeContext,
  cycleLabels: Record<string, string>
): boolean {
  return isFeeApplicable(
    {
      portee: fa.portee,
      typeFrais: fa.typeFrais,
      categorie: fa.typeFrais,
    },
    ctx,
    cycleLabels
  );
}

/**
 * Version typée pour TypeFraisScolaire (base de données)
 */
export function isFeeTypeApplicable(
  ft: TypeFraisScolaire,
  ctx: FeeContext,
  cycleLabels: Record<string, string>
): boolean {
  return isFeeApplicable(
    {
      actif: ft.actif,
      schoolYearId: ft.schoolYearId,
      anneeScolaireId: ft.anneeScolaireId,
      classId: ft.classId,
      salleId: ft.salleId,
      cycleId: ft.cycleId,
      optionCode: ft.optionCode,
      regime: ft.regime,
      portee: ft.portee,
      categorie: ft.categorie,
    },
    ctx,
    cycleLabels
  );
}
