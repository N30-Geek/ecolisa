import type { FactureEleve, LigneFacture, TransactionPaiement, TypeFraisScolaire } from '../types';
import { convertCurrency } from './currency';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Calcule le montant total d'une facture dans la devise cible.
 * Privilégie le recalcul à partir des lignes si elles existent (plus fiable).
 * Gère les anciennes factures PayFeesModal où la ligne montantPaye === montant
 * indique que le montant est déjà dans la devise de la facture.
 */
export const getInvoiceTotal = (
  invoice: FactureEleve,
  targetCurrency: string
): number => {
  const lignes = invoice.lignes?.filter((l): l is LigneFacture => !!l && typeof l.montant === 'number');
  if (lignes && lignes.length > 0) {
    return round2(lignes.reduce((sum, l) => {
      let source = l.devise || invoice.devise;
      // Ancien enregistrement PayFeesModal : montant et montantPaye identiques
      // signifient que le montant est déjà dans la devise d'affichage (invoice.devise)
      if (l.devise !== invoice.devise && l.montantPaye !== undefined && Math.abs(l.montantPaye - l.montant) < 0.001) {
        source = invoice.devise;
      }
      return sum + convertCurrency(l.montant, source, targetCurrency);
    }, 0));
  }
  return round2(convertCurrency(invoice.montantTotal, invoice.devise, targetCurrency));
};

/**
 * Calcule le montant déjà payé pour une facture dans la devise cible.
 * Privilégie la somme des allocations si elles existent (plus fiable pour
 * les anciens enregistrements dont le montantPaye global peut être incohérent).
 */
export const getInvoicePaid = (
  invoice: FactureEleve,
  payments: TransactionPaiement[],
  targetCurrency: string
): number => {
  const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
  return round2(invoicePayments.reduce((sum, p) => {
    if (p.allocations && p.allocations.length > 0) {
      return sum + round2(p.allocations.reduce((a, alloc) => a + convertCurrency(alloc.montant, p.devise, targetCurrency), 0));
    }
    return sum + convertCurrency(p.montantPaye, p.devise, targetCurrency);
  }, 0));
};

/**
 * Calcule le montant réel d'un paiement dans la devise cible.
 * Privilégie les allocations si le montant global est anormalement nul ou incohérent.
 */
export const getPaymentAmount = (
  payment: TransactionPaiement,
  targetCurrency: string
): number => {
  if (payment.allocations && payment.allocations.length > 0) {
    const fromAllocations = round2(payment.allocations.reduce((a, alloc) => a + convertCurrency(alloc.montant, payment.devise, targetCurrency), 0));
    if (fromAllocations > 0 && payment.montantPaye !== undefined && payment.montantPaye > 0 && Math.abs(fromAllocations - payment.montantPaye) > 0.01) {
      return fromAllocations;
    }
  }
  return round2(convertCurrency(payment.montantPaye, payment.devise, targetCurrency));
};

const ROUNDING_TOLERANCE = 0.10;

/**
 * Détermine le statut réel d'une facture à partir de ses paiements.
 * Ne se fie pas au champ `statut` stocké, qui peut être périmé.
 * Une tolérance de 0,10 est appliquée pour éviter les blocages dus aux arrondis.
 */
export const getInvoiceStatus = (
  invoice: FactureEleve,
  payments: TransactionPaiement[],
  targetCurrency: string
): 'PAYE' | 'PARTIEL' | 'NON_PAYE' => {
  const total = getInvoiceTotal(invoice, targetCurrency);
  const paid = getInvoicePaid(invoice, payments, targetCurrency);
  if (total <= 0.001) return paid > 0.001 ? 'PAYE' : 'NON_PAYE';
  if (getInvoiceRemaining(invoice, payments, targetCurrency) <= 0.001) return 'PAYE';
  if (paid > 0.01) return 'PARTIEL';
  return 'NON_PAYE';
};

/**
 * Calcule le solde restant d'une facture dans la devise cible.
 * Applique une tolérance de 0,10 pour les différences d'arrondi.
 */
export const getInvoiceRemaining = (
  invoice: FactureEleve,
  payments: TransactionPaiement[],
  targetCurrency: string
): number => {
  const total = getInvoiceTotal(invoice, targetCurrency);
  const paid = getInvoicePaid(invoice, payments, targetCurrency);
  const remaining = round2(Math.max(0, total - paid));
  return remaining <= ROUNDING_TOLERANCE ? 0 : remaining;
};

/**
 * Calcule le total dû pour un élève en évitant de compter les factures en double
 * pour le même frais/tranche. Pour chaque couple frais/tranche, on garde le
 * montant le plus élevé parmi les factures existantes.
 */
export const getStudentTotalDue = (
  invoices: FactureEleve[],
  targetCurrency: string
): number => {
  const byFeeTranche = new Map<string, number>();
  for (const inv of invoices) {
    const lignes = inv.lignes?.filter((l): l is LigneFacture => !!l && typeof l.montant === 'number') || [];
    if (lignes.length > 0) {
      for (const l of lignes) {
        const key = `${l.feeTypeId}:${l.trancheId || ''}`;
        const lineTotal = convertCurrency(l.montant, l.devise || inv.devise, targetCurrency);
        byFeeTranche.set(key, Math.max(byFeeTranche.get(key) || 0, lineTotal));
      }
    } else {
      const total = convertCurrency(inv.montantTotal, inv.devise, targetCurrency);
      const key = `inv:${inv.id}`;
      byFeeTranche.set(key, Math.max(byFeeTranche.get(key) || 0, total));
    }
  }
  return round2(Array.from(byFeeTranche.values()).reduce((a, b) => a + b, 0));
};

export interface PaymentAllocationSummary {
  feeTypeId: string;
  trancheId?: string;
  montant: number;
  label: string;
  isPartial: boolean;
  total?: number;
  devise?: string;
}

/**
 * Construit un libellé explicite pour chaque allocation d'un paiement,
 * en identifiant le type de frais et la tranche (mois, période, etc.)
 * et en signalant si le montant est partiel.
 */
export const getPaymentAllocationsSummary = (
  payment: TransactionPaiement,
  feeTypes: TypeFraisScolaire[],
  invoice?: FactureEleve
): PaymentAllocationSummary[] => {
  const allocs = payment.allocations && payment.allocations.length > 0
    ? payment.allocations
    : [{ feeTypeId: '', trancheId: undefined, montant: payment.montantPaye || 0 }];

  return allocs.map(a => {
    const feeType = feeTypes.find(f => f.id === a.feeTypeId);
    const matchedTranche = feeType?.tranches?.find(t => t.id === a.trancheId);

    // Recherche dans les lignes de la facture si le type de frais n'a pas été trouvé
    const line = invoice?.lignes?.find(l =>
      l.feeTypeId === a.feeTypeId &&
      (a.trancheId ? l.trancheId === a.trancheId : !l.trancheId)
    );

    let feeName = feeType?.nom || line?.nom;
    if (!feeName || feeName.startsWith('fee_annexe_') || feeName.startsWith('inv:')) {
      feeName = 'Frais scolaires';
    }

    let trancheName = matchedTranche?.nom;
    if (!trancheName && line?.nom?.includes(' — ')) {
      trancheName = line.nom.split(' — ').pop() as string;
    }

    let label = feeName;
    if (trancheName && trancheName !== feeName) {
      label = `${feeName} — ${trancheName}`;
    }

    const totalReference = (matchedTranche as any)?.montant ?? feeType?.montant ?? line?.montant ?? 0;
    const totalDevise = (matchedTranche as any)?.devise ?? feeType?.devise ?? line?.devise ?? payment.devise;
    const isPartial = totalReference > 0.001 && a.montant < totalReference - 0.01;

    return {
      ...a,
      label,
      isPartial,
      total: totalReference,
      devise: totalDevise,
    };
  });
};
