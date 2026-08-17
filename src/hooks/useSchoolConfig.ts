import { useState, useEffect, useMemo, useCallback } from 'react';
import { LocalDatabaseService } from '../services/localDatabase';
import type { SchoolConfig } from '../components/onboarding/OnboardingWizard';
import {
  convertCurrencyFromList,
  formatCurrencyFromList,
  getCurrency,
  getReferenceCurrency,
  Currency,
  NumberFormatConfig,
  DEFAULT_CURRENCIES,
  DEFAULT_REFERENCE_CURRENCY,
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_NUMBER_FORMAT,
  applyNumberFormatPreset,
} from '../utils/currency';

export interface UseSchoolConfigReturn {
  config: Partial<SchoolConfig> | null;
  loading: boolean;
  currency: string;
  currencies: Currency[];
  referenceCurrency: string;
  displayCurrency: string;
  exchangeRate: number;
  numberFormat: NumberFormatConfig;
  convert: (amount: number, from?: string) => number;
  format: (amount: number, from?: string) => string;
  setDisplayCurrency: (code: string) => void;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'ecolisa_school_config';
const USER_DISPLAY_CURRENCY_KEY = 'ecolisa_user_display_currency';

export const useSchoolConfig = (): UseSchoolConfigReturn => {
  const [config, setConfig] = useState<Partial<SchoolConfig> | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [userDisplayCurrency, setUserDisplayCurrency] = useState<string>(() => {
    try {
      return localStorage.getItem(USER_DISPLAY_CURRENCY_KEY) || '';
    } catch {
      return '';
    }
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    let parsed: Partial<SchoolConfig> | null = null;
    try {
      parsed = stored ? JSON.parse(stored) : null;
    } catch {}

    const db = await LocalDatabaseService.getConfig('school_config');
    if (db && typeof db === 'object') {
      parsed = { ...parsed, ...db };
    }

    if (parsed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      setConfig(parsed);
    } else {
      setConfig({
        currency: 'USD',
        exchangeRate: DEFAULT_EXCHANGE_RATE,
        currencies: DEFAULT_CURRENCIES,
        referenceCurrency: DEFAULT_REFERENCE_CURRENCY,
        displayCurrency: DEFAULT_REFERENCE_CURRENCY,
        numberFormat: DEFAULT_NUMBER_FORMAT,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };

    const onConfigChange = () => refresh();
    const onDisplayCurrencyChange = () => {
      try {
        const saved = localStorage.getItem(USER_DISPLAY_CURRENCY_KEY) || '';
        setUserDisplayCurrency(saved);
      } catch {}
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('ecolisa:config:change', onConfigChange);
    window.addEventListener('ecolisa:currency:change', onDisplayCurrencyChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('ecolisa:config:change', onConfigChange);
      window.removeEventListener('ecolisa:currency:change', onDisplayCurrencyChange);
    };
  }, [refresh]);

  const currencies = useMemo<Currency[]>(() => {
    const list = config?.currencies?.length ? config.currencies : DEFAULT_CURRENCIES;
    // Si la config legacy n'a qu'une devise, on s'assure que CDF est aussi présent par défaut
    const hasLegacy = config?.currency && !list.some((c) => c.code === config.currency);
    if (hasLegacy) {
      const legacyCur: Currency = {
        code: config.currency!,
        name: config.currency!,
        symbol: config.currency!,
        rateToReference: config.currency === 'CDF' ? (config.exchangeRate || DEFAULT_EXCHANGE_RATE) : 1,
        isReference: config.currency === 'USD',
      };
      return [...list, legacyCur];
    }
    return list;
  }, [config?.currencies, config?.currency, config?.exchangeRate]);

  const referenceCurrency = useMemo(
    () => config?.referenceCurrency || getReferenceCurrency(currencies).code,
    [config?.referenceCurrency, currencies]
  );

  const displayCurrency = useMemo(() => {
    const code = userDisplayCurrency || config?.displayCurrency || referenceCurrency;
    return getCurrency(code, currencies) ? code : referenceCurrency;
  }, [userDisplayCurrency, config?.displayCurrency, referenceCurrency, currencies]);

  const currency = displayCurrency;

  const exchangeRate = useMemo(() => {
    const usd = getCurrency('USD', currencies);
    const cdf = getCurrency('CDF', currencies);
    if (!cdf || !usd || usd.rateToReference === 0) return DEFAULT_EXCHANGE_RATE;
    return cdf.rateToReference / usd.rateToReference;
  }, [currencies]);

  const numberFormat = useMemo<NumberFormatConfig>(() => {
    const base = config?.numberFormat || DEFAULT_NUMBER_FORMAT;
    const preset = base.preset;
    if (preset && preset !== 'CUSTOM') {
      return { ...base, ...applyNumberFormatPreset(preset) };
    }
    return { ...DEFAULT_NUMBER_FORMAT, ...base };
  }, [config?.numberFormat]);

  const setDisplayCurrency = useCallback((code: string) => {
    localStorage.setItem(USER_DISPLAY_CURRENCY_KEY, code);
    setUserDisplayCurrency(code);
    try {
      window.dispatchEvent(new Event('ecolisa:currency:change'));
    } catch {}
  }, []);

  const convert = useCallback(
    (amount: number, from?: string) => {
      return convertCurrencyFromList(amount, from || referenceCurrency, displayCurrency, currencies);
    },
    [referenceCurrency, displayCurrency, currencies]
  );

  const format = useCallback(
    (amount: number, from?: string) => {
      return formatCurrencyFromList(amount, displayCurrency, from || referenceCurrency, currencies, numberFormat);
    },
    [displayCurrency, referenceCurrency, currencies, numberFormat]
  );

  return {
    config,
    loading,
    currency,
    currencies,
    referenceCurrency,
    displayCurrency,
    exchangeRate,
    numberFormat,
    convert,
    format,
    setDisplayCurrency,
    refresh,
  };
};
