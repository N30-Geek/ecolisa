import type { FraisTranche, ModePaiementFrais, TypeFraisScolaire, FactureEleve, TransactionPaiement } from '../types';
import { getInvoicePaid, getInvoiceTotal } from './financeCalculations';

export const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const parseDate = (iso?: string) => {
  if (!iso) return new Date();
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
};

const formatISO = (d: Date) => d.toISOString().split('T')[0];

export const MOIS_SCOLAIRES = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre',
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
];

export const MODE_PAIEMENT_LABELS: Record<ModePaiementFrais, string> = {
  UNIQUE: 'Paiement unique',
  MENSUEL: 'Mensuel (RDC)',
  TRIMESTRIEL: 'Trimestriel',
  SEMESTRIEL: 'Semestriel',
  PERSONNALISE: 'Personnalisé',
};

export const tranchesDefautParMode: Record<ModePaiementFrais, number> = {
  UNIQUE: 1,
  MENSUEL: 10,
  TRIMESTRIEL: 3,
  SEMESTRIEL: 2,
  PERSONNALISE: 3,
};

export const genererTranches = (
  mode: ModePaiementFrais,
  nombre: number,
  montantTotal: number,
  devise: string,
  anneeDebut?: string,
  anneeFin?: string,
  prefixCible = ''
): FraisTranche[] => {
  const tranches: FraisTranche[] = [];
  const base = Math.max(0, montantTotal);
  const start = anneeDebut ? parseDate(anneeDebut) : new Date();

  if (mode === 'UNIQUE' || nombre <= 1) {
    return [{
      id: uuid(),
      nom: prefixCible ? `Paiement unique — ${prefixCible}` : 'Paiement unique',
      montant: base,
      devise,
      dateEcheance: anneeDebut ? formatISO(start) : undefined,
      ordre: 1,
    }];
  }

  const montantBase = Math.floor((base / nombre) * 100) / 100;
  const reste = Math.round((base - montantBase * nombre) * 100) / 100;

  for (let i = 0; i < nombre; i++) {
    let nom = '';
    let dateEcheance: string | undefined;

    if (mode === 'MENSUEL') {
      nom = MOIS_SCOLAIRES[i % MOIS_SCOLAIRES.length] || `Mois ${i + 1}`;
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      d.setDate(1);
      dateEcheance = formatISO(d);
    } else if (mode === 'TRIMESTRIEL') {
      nom = `${i + 1}${i === 0 ? 'er' : 'ème'} Trimestre`;
      const d = new Date(start);
      d.setMonth(d.getMonth() + i * 3 + 2);
      d.setDate(1);
      dateEcheance = formatISO(d);
    } else if (mode === 'SEMESTRIEL') {
      nom = `${i + 1}${i === 0 ? 'er' : 'ème'} Semestre`;
      const d = new Date(start);
      d.setMonth(d.getMonth() + i * 5 + 4);
      d.setDate(1);
      dateEcheance = formatISO(d);
    } else {
      nom = `Tranche ${i + 1}`;
      if (anneeDebut && anneeFin) {
        const debut = parseDate(anneeDebut).getTime();
        const fin = parseDate(anneeFin).getTime();
        const step = (fin - debut) / Math.max(1, nombre - 1);
        const d = new Date(debut + step * i);
        dateEcheance = formatISO(d);
      }
    }

    tranches.push({
      id: uuid(),
      nom,
      montant: i === nombre - 1 ? Math.round((montantBase + reste) * 100) / 100 : montantBase,
      devise,
      dateEcheance,
      ordre: i + 1,
    });
  }

  return tranches;
};

// Renvoie les tranches d'un frais (stockées ou générées à la volée)
export const getTranchesForFee = (
  ft: TypeFraisScolaire,
  anneeDebut?: string,
  anneeFin?: string
): FraisTranche[] => {
  if (ft.tranches && ft.tranches.length > 0) {
    return [...ft.tranches].sort((a, b) => a.ordre - b.ordre);
  }
  if (!ft.modePaiement || ft.modePaiement === 'UNIQUE') {
    return [{
      id: ft.id,
      nom: 'Paiement unique',
      montant: ft.montant,
      devise: ft.devise,
      dateEcheance: anneeDebut,
      ordre: 1,
    }];
  }
  const n = ft.nombreTranches || tranchesDefautParMode[ft.modePaiement] || 1;
  const generated = genererTranches(ft.modePaiement, n, ft.montant, ft.devise, anneeDebut, anneeFin);
  // Identifiants stables pour éviter les doublons de factures quand les tranches
  // ne sont pas encore stockées en base.
  return generated.map((t, i) => ({ ...t, id: `${ft.id}_t${i}` }));
};

const isInvoicePaid = (inv: FactureEleve, payments?: TransactionPaiement[]) => {
  if (payments && payments.length > 0) {
    return getInvoicePaid(inv, payments.filter(p => p.invoiceId === inv.id), inv.devise) >= getInvoiceTotal(inv, inv.devise) - 0.001;
  }
  return (inv.montantPaye || 0) >= (inv.montantTotal || 0) - 0.001;
};

// Détermine la prochaine tranche dûe à facturer pour un élève.
// alreadyInvoiced=true signifie qu'une facture existe déjà pour cette tranche et n'est pas encore soldée.
export const getNextUnpaidDueTranche = (
  ft: TypeFraisScolaire,
  studentInvoices: FactureEleve[],
  anneeDebut?: string,
  anneeFin?: string,
  referenceDate: Date = new Date(),
  ignoreDueDate = false,
  payments?: TransactionPaiement[]
): { tranche: FraisTranche | null; alreadyInvoiced: boolean; legacyFullInvoice?: boolean } => {
  const tranches = getTranchesForFee(ft, anneeDebut, anneeFin);
  if (!tranches.length) return { tranche: null, alreadyInvoiced: false };

  // Si une facture globale sans trancheId existe, on évite de créer une facture mensuelle en doublon.
  const hasLegacyInvoice = studentInvoices.some(inv =>
    inv.lignes?.some(l => l.feeTypeId === ft.id && !l.trancheId)
  );
  if (hasLegacyInvoice) {
    return { tranche: null, alreadyInvoiced: true, legacyFullInvoice: true };
  }

  const now = new Date(referenceDate);
  now.setHours(23, 59, 59, 999);

  for (const t of tranches) {
    const tInvoices = studentInvoices.filter(inv =>
      inv.lignes?.some(l => l.feeTypeId === ft.id && l.trancheId === t.id)
    );

    if (tInvoices.length > 0) {
      const allPaid = tInvoices.every(inv => isInvoicePaid(inv, payments));
      if (allPaid) continue;
      return { tranche: t, alreadyInvoiced: true };
    }

    if (!ignoreDueDate && t.dateEcheance) {
      const echeance = new Date(t.dateEcheance);
      if (!isNaN(echeance.getTime()) && echeance > now) continue;
    }

    return { tranche: t, alreadyInvoiced: false };
  }

  return { tranche: null, alreadyInvoiced: false };
};
