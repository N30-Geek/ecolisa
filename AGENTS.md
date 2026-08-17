# Règles du projet ECOLISA

## Affichage et calculs monétaires

Toujours s'appliquer lorsqu'un montant, un prix, un salaire, un frais, une facture, un paiement ou tout calcul financier doit être affiché ou calculé.

### 1. Affichage d'un montant

- **Jamais** afficher une valeur brute suivie d'un symbole hardcodé (`$`, `Fc`, `USD`, `CDF`, etc.).
- Utiliser impérativement `formatCurrency(montant, deviseCible, deviseSource)` depuis `src/utils/currency` OU le helper `format(montant, deviseSource)` du hook `useSchoolConfig()`.
- La `deviseCible` doit être la devise d'affichage active (`useSchoolConfig().currency` / `displayCurrency`).
- La `deviseSource` est celle du montant stocké (champ `devise` ou `currency` du record). Si absente, utiliser la devise de référence (`USD`).

### 2. Calculs financiers

- **Ne jamais additionner, soustraire ou moyenner des montants de devises différentes sans les convertir au préalable.**
- Convertir chaque terme vers la devise d'affichage avant le calcul : `convertCurrency(montant, source, cible)`.
- Pour les agrégats (`reduce`, `total`, `balance`) : itérer sur chaque ligne, convertir individuellement, puis sommer.
- Pour les moyennes (`avg`, `tarif moyen`) : convertir puis diviser, pas l'inverse.

### 3. Devises et taux

- La logique de conversion centralisée est dans `src/utils/currency.ts`.
- Utiliser `useSchoolConfig()` pour obtenir `currencies`, `referenceCurrency`, `displayCurrency`, `exchangeRate`.
- La devise de référence a un `rateToReference = 1`. Les autres devises ont leur taux relatif.
- Si une paire n'est pas USD/CDF, la conversion passe automatiquement par `convertCurrencyFromList` avec les devises configurées.

### 4. Exemples corrects

```tsx
const { currency, exchangeRate, format } = useSchoolConfig();

// Affichage
format(facture.montantTotal, facture.devise);
formatCurrency(paiement.montantPaye, currency, paiement.devise, exchangeRate);

// Calcul d'un total
const total = invoices.reduce(
  (sum, inv) => sum + convertCurrency(inv.montantTotal, inv.devise, currency),
  0
);

// Affichage du résultat
<span>{formatCurrency(total, currency)}</span>
```

### 5. Anti-exemples interdits

```tsx
// ❌ Ne pas faire
<span>{montant} $</span>
<span>{montant} {devise}</span>
const total = invoices.reduce((s, i) => s + i.montantTotal, 0);
```

### 6. Tests obligatoires

Après toute modification affichant ou calculant un montant :
- `npx tsc --noEmit` doit passer.
- `npm run build` doit passer.
- Vérifier visuellement que des montants en CDF convertis s'affichent correctement en USD/XAF/FCFA selon la devise d'affichage choisie.
