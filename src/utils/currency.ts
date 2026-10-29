import type { SchoolConfig, NumberFormatConfig } from '../components/onboarding/OnboardingWizard';

export type { NumberFormatConfig };

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rateToReference: number;
  isReference?: boolean;
}

export type CurrencyCode = string;

export const DEFAULT_REFERENCE_CURRENCY = 'USD';

export const DEFAULT_NUMBER_FORMAT: NumberFormatConfig = {
  thousandsSeparator: ' ',
  decimalSeparator: ',',
  decimalPlaces: 2,
  showCurrencySymbol: true,
  currencyPosition: 'after',
  preset: 'FR',
};

export const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'Dollar américain', symbol: '$', rateToReference: 1, isReference: true },
  { code: 'CDF', name: 'Franc congolais', symbol: 'Fc', rateToReference: 2850 },
  { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA', rateToReference: 600 },
  { code: 'FCFA', name: 'Franc CFA BCEAO', symbol: 'FCFA', rateToReference: 655 },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToReference: 0.92 },
  { code: 'GBP', name: 'Livre sterling', symbol: '£', rateToReference: 0.79 },
  { code: 'CNY', name: 'Yuan chinois', symbol: '¥', rateToReference: 7.2 },
];

export const DEFAULT_EXCHANGE_RATE = 2850;

// Cache mémoire partagé alimenté par la base SQLite (via useSchoolConfig).
// Plus aucune lecture localStorage ici : la base de données est la seule source
// de vérité pour les devises et la configuration monétaire.
let _schoolConfigCache: Partial<SchoolConfig> | null = null;
let _userDisplayCurrencyCache: string | null = null;

export const setCurrencyConfigCache = (config: Partial<SchoolConfig> | null) => {
  _schoolConfigCache = config;
};

export const setUserDisplayCurrencyCache = (code: string | null) => {
  _userDisplayCurrencyCache = code;
};

const normalize = (code?: string) => (code || '').toUpperCase().trim();

export const getCurrency = (code: string, currencies: Currency[] = DEFAULT_CURRENCIES): Currency | undefined => {
  return currencies.find((c) => c.code === normalize(code));
};

export const getReferenceCurrency = (currencies: Currency[] = DEFAULT_CURRENCIES): Currency => {
  return currencies.find((c) => c.isReference) || currencies[0] || DEFAULT_CURRENCIES[0];
};

export const getDisplayCurrency = (currencies: Currency[] = DEFAULT_CURRENCIES): Currency => {
  return getReferenceCurrency(currencies);
};

/**
 * Convertit un montant entre deux devises via la devise de référence.
 * Prend en charge un tableau de devises configurables.
 */
export const convertCurrencyFromList = (
  amount: number,
  from?: CurrencyCode | string,
  to?: CurrencyCode | string,
  currencies: Currency[] = DEFAULT_CURRENCIES
): number => {
  if (!amount || Number.isNaN(amount)) return 0;
  const fromCode = normalize(from) || getReferenceCurrency(currencies).code;
  const toCode = normalize(to) || fromCode;
  if (fromCode === toCode) return amount;

  const fromCur = getCurrency(fromCode, currencies) || getReferenceCurrency(currencies);
  const toCur = getCurrency(toCode, currencies) || getReferenceCurrency(currencies);

  if (!fromCur || !toCur || fromCur.rateToReference === 0 || toCur.rateToReference === 0) return 0;

  const inReference = amount / fromCur.rateToReference;
  return inReference * toCur.rateToReference;
};

/**
 * Applique un preset de format de nombre.
 */
export const applyNumberFormatPreset = (preset: NumberFormatConfig['preset']): Partial<NumberFormatConfig> => {
  switch (preset) {
    case 'US': return { thousandsSeparator: ',', decimalSeparator: '.', decimalPlaces: 2, preset: 'US' };
    case 'FR': return { thousandsSeparator: ' ', decimalSeparator: ',', decimalPlaces: 2, preset: 'FR' };
    case 'DE': return { thousandsSeparator: '.', decimalSeparator: ',', decimalPlaces: 2, preset: 'DE' };
    case 'NONE': return { thousandsSeparator: '', decimalSeparator: '.', decimalPlaces: 2, preset: 'NONE' };
    default: return {};
  }
};

/**
 * Formate un nombre selon la configuration demandée (séparateurs, décimales).
 * Ne hardcode aucun symbole monétaire.
 */
const CURRENCIES_WITHOUT_DECIMALS: string[] = ['CDF', 'XAF', 'FCFA', 'GNF', 'RWF', 'UGX', 'MGA', 'BIF', 'KMF', 'TND'];

export const formatNumber = (
  value: number,
  numberFormat?: NumberFormatConfig
): string => {
  const nf = { ...DEFAULT_NUMBER_FORMAT, ...(numberFormat || {}) };
  const { thousandsSeparator, decimalSeparator, decimalPlaces } = nf;
  if (!Number.isFinite(value)) return '—';
  const factor = Math.pow(10, Math.max(0, decimalPlaces));
  const rounded = Math.round(value * factor) / factor;
  const [intPart, decPart = ''] = rounded.toFixed(decimalPlaces).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator === ' ' ? '\u00A0' : thousandsSeparator);
  if (decimalPlaces <= 0) return formattedInt;
  return `${formattedInt}${decimalSeparator}${decPart}`;
};

/**
 * Formate un montant dans la devise d'affichage souhaitée.
 * Prend en charge un tableau de devises configurables.
 */
export const formatCurrencyFromList = (
  amount: number,
  currency?: CurrencyCode | string,
  from?: CurrencyCode | string,
  currencies: Currency[] = DEFAULT_CURRENCIES,
  numberFormat?: NumberFormatConfig
): string => {
  const displayCode = normalize(currency) || getReferenceCurrency(currencies).code;
  const sourceCode = normalize(from) || displayCode;
  const displayCur = getCurrency(displayCode, currencies) || getReferenceCurrency(currencies);
  const rawNf = numberFormat || getCurrencyConfig().numberFormat || DEFAULT_NUMBER_FORMAT;
  const isNoDecimalCurrency = CURRENCIES_WITHOUT_DECIMALS.includes(displayCode);
  const nf = {
    ...rawNf,
    decimalPlaces: isNoDecimalCurrency ? 0 : (rawNf.decimalPlaces ?? 2),
  };
  const value = sourceCode !== displayCode
    ? convertCurrencyFromList(amount, sourceCode, displayCode, currencies)
    : amount;
  const roundedValue = isNoDecimalCurrency ? Math.round(value) : value;
  const formatted = formatNumber(roundedValue, nf);
  const symbol = nf.showCurrencySymbol ? (displayCur.symbol || displayCur.code) : '';
  if (!symbol) return formatted;
  return nf.currencyPosition === 'before'
    ? `${symbol} ${formatted}`
    : `${formatted} ${symbol}`;
};

/**
 * Récupère la configuration monétaire depuis le cache mémoire alimenté par
 * la base SQLite. Le localStorage n'est plus utilisé ici.
 */
export const getCurrencyConfig = (): {
  currencies: Currency[];
  referenceCurrency: string;
  displayCurrency: string;
  numberFormat: NumberFormatConfig;
} => {
  try {
    const parsed: Partial<SchoolConfig> = _schoolConfigCache || {};
    const userDisplay = _userDisplayCurrencyCache;

    const currencies = parsed.currencies?.length
      ? parsed.currencies
      : parsed.currency
        ? [getCurrency(parsed.currency) || DEFAULT_CURRENCIES[0], DEFAULT_CURRENCIES[1]].filter(Boolean) as Currency[]
        : DEFAULT_CURRENCIES;

    const referenceCurrency = parsed.referenceCurrency || getReferenceCurrency(currencies).code;
    const displayCurrency = userDisplay || parsed.displayCurrency || referenceCurrency;
    const numberFormat = parsed.numberFormat && typeof parsed.numberFormat === 'object'
      ? { ...DEFAULT_NUMBER_FORMAT, ...parsed.numberFormat }
      : DEFAULT_NUMBER_FORMAT;

    return { currencies, referenceCurrency, displayCurrency, numberFormat };
  } catch {
    return {
      currencies: DEFAULT_CURRENCIES,
      referenceCurrency: DEFAULT_REFERENCE_CURRENCY,
      displayCurrency: DEFAULT_REFERENCE_CURRENCY,
      numberFormat: DEFAULT_NUMBER_FORMAT,
    };
  }
};

/**
 * Convertit un montant entre deux devises.
 * Si `exchangeRate` est fourni et que les devises sont USD/CDF, il est utilisé.
 * Sinon, la conversion s'appuie sur les devises configurées dans l'application.
 */
export const convertCurrency = (
  amount: number,
  from: string = 'USD',
  to: string = 'USD',
  exchangeRate?: number
): number => {
  if (!amount || Number.isNaN(amount)) return 0;
  const f = normalize(from) || 'USD';
  const t = normalize(to) || 'USD';
  if (f === t) return amount;

  const { currencies } = getCurrencyConfig();

  if (exchangeRate && ((f === 'USD' && t === 'CDF') || (f === 'CDF' && t === 'USD'))) {
    if (f === 'USD' && t === 'CDF') return amount * exchangeRate;
    if (f === 'CDF' && t === 'USD') return amount / exchangeRate;
  }

  return convertCurrencyFromList(amount, f, t, currencies);
};

/**
 * Formate un montant dans la devise souhaitée.
 * S'appuie sur les devises configurées pour le symbole et la conversion.
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  from?: string,
  exchangeRate?: number,
  numberFormat?: NumberFormatConfig
): string => {
  const display = normalize(currency) || 'USD';
  const source = normalize(from) || display;
  const { currencies, numberFormat: configNumberFormat } = getCurrencyConfig();
  const displayCur = getCurrency(display, currencies) || getReferenceCurrency(currencies);
  const rawNf = numberFormat || configNumberFormat || DEFAULT_NUMBER_FORMAT;
  const isNoDecimalCurrency = CURRENCIES_WITHOUT_DECIMALS.includes(display);
  const nf = {
    ...rawNf,
    decimalPlaces: isNoDecimalCurrency ? 0 : (rawNf.decimalPlaces ?? 2),
  };

  const value = source !== display
    ? convertCurrency(amount, source, display, exchangeRate)
    : amount;

  const roundedValue = isNoDecimalCurrency ? Math.round(value) : value;
  const formatted = formatNumber(roundedValue, nf);
  const symbol = nf.showCurrencySymbol ? (displayCur.symbol || displayCur.code) : '';
  if (!symbol) return formatted;
  return nf.currencyPosition === 'before'
    ? `${symbol} ${formatted}`
    : `${formatted} ${symbol}`;
};

/**
 * Renvoie le symbole d'une devise configurée.
 */
export const getCurrencySymbol = (code: string): string => {
  const { currencies } = getCurrencyConfig();
  return getCurrency(code, currencies)?.symbol || code;
};
