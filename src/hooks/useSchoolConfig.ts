import { useState, useEffect, useMemo, useCallback } from 'react';
import { LocalDatabaseService } from '../services/localDatabase';
import type { SchoolConfig } from '../components/onboarding/OnboardingWizard';
import { convertCurrency, formatCurrency, DEFAULT_EXCHANGE_RATE } from '../utils/currency';

export interface UseSchoolConfigReturn {
  config: Partial<SchoolConfig> | null;
  loading: boolean;
  currency: 'USD' | 'CDF';
  exchangeRate: number;
  convert: (amount: number, from?: 'USD' | 'CDF' | string) => number;
  format: (amount: number, from?: 'USD' | 'CDF' | string) => string;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'ecolisa_school_config';

export const useSchoolConfig = (): UseSchoolConfigReturn => {
  const [config, setConfig] = useState<Partial<SchoolConfig> | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);

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
      setConfig({ currency: 'USD', exchangeRate: DEFAULT_EXCHANGE_RATE });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const currency = useMemo(() => (config?.currency === 'CDF' ? 'CDF' : 'USD'), [config?.currency]);
  const exchangeRate = useMemo(() => config?.exchangeRate || DEFAULT_EXCHANGE_RATE, [config?.exchangeRate]);

  const convert = useCallback((amount: number, from?: string) => {
    return convertCurrency(amount, from || currency, currency, exchangeRate);
  }, [currency, exchangeRate]);

  const format = useCallback((amount: number, from?: string) => {
    return formatCurrency(amount, currency, from || currency, exchangeRate);
  }, [currency, exchangeRate]);

  return {
    config,
    loading,
    currency,
    exchangeRate,
    convert,
    format,
    refresh,
  };
};
