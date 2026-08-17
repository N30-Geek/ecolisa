import type { FraisTranche, ModePaiementFrais } from '../types';

export const uuid = () => (window as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
  MENSUEL: 9,
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
