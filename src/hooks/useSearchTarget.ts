import { useState, useEffect } from 'react';

export interface SearchTarget {
  tab: string;
  id?: string;
  name?: string;
  type?: string;
}

const KEY = 'ecolisa_search_target';

export const useSearchTarget = (tab?: string): { target: SearchTarget | null; apply: () => SearchTarget | null } => {
  const [target, setTarget] = useState<SearchTarget | null>(null);

  const matches = (t: string) => !tab || t === tab;

  useEffect(() => {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    try {
      const parsed: SearchTarget = JSON.parse(raw);
      if (matches(parsed.tab)) {
        setTarget(parsed);
      }
    } catch {
      // ignore malformed
    }
  }, [tab]);

  const apply = (): SearchTarget | null => {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const parsed: SearchTarget = JSON.parse(raw);
      if (matches(parsed.tab)) {
        sessionStorage.removeItem(KEY);
        return parsed;
      }
    } catch {}
    return null;
  };

  return { target, apply };
};

export const setSearchTarget = (target: SearchTarget) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(target));
  } catch {}
};
