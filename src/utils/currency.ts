import type { SchoolConfig } from '../components/onboarding/OnboardingWizard';

export type CurrencyCode = 'USD' | 'CDF';

export const DEFAULT_EXCHANGE_RATE = 2850;

export const convertCurrency = (
  amount: number,
  from: CurrencyCode | string,
  to: CurrencyCode | string,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): number => {
  if (!amount || Number.isNaN(amount)) return 0;
  const f = (from || 'USD').toUpperCase();
  const t = (to || 'USD').toUpperCase();
  if (f === t) return amount;
  const rate = exchangeRate || DEFAULT_EXCHANGE_RATE;
  if (f === 'USD' && t === 'CDF') return amount * rate;
  if (f === 'CDF' && t === 'USD') return amount / rate;
  return amount;
};

export const formatCurrency = (
  amount: number,
  currency: CurrencyCode | string = 'USD',
  from?: CurrencyCode | string,
  exchangeRate?: number
): string => {
  const display = (currency || 'USD').toUpperCase();
  const source = (from || display).toUpperCase();
  const value = from && from !== currency
    ? convertCurrency(amount, source, display, exchangeRate)
    : amount;
  return `${Math.round(value).toLocaleString('fr-FR')} ${display}`;
};

export const getSchoolConfig = (): Partial<SchoolConfig> => {
  try {
    const raw = localStorage.getItem('ecolisa_school_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    currency: 'USD',
    exchangeRate: DEFAULT_EXCHANGE_RATE,
  };
};
