import { useState, useEffect, useCallback } from 'react';
import { LocalDatabaseService } from '../services/localDatabase';
import type { AppSettings, ThemeConfig } from '../types';

/**
 * Configuration d'apparence par défaut.
 * 'system' suit prefers-color-scheme de l'OS.
 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  accentColor: '#6366f1',
  appearance: 'system',
  fontScale: 'medium',
  density: 'comfortable',
  fontFamily: 'sans',
  borderRadius: 'rounded',
};

export type ResolvedTheme = 'light' | 'dark';

// ─── Helpers couleur ──────────────────────────────────────────────────────────

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(hex: string): string | null {
  if (!hex || typeof hex !== 'string') return null;
  const m = hex.trim().match(HEX_RE);
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mixe une couleur hex vers le blanc (amount>0) ou le noir (amount<0). amount ∈ [-1, 1] */
function shiftHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return rgbToHex(
    rgb.r + (target - rgb.r) * t,
    rgb.g + (target - rgb.g) * t,
    rgb.b + (target - rgb.b) * t,
  );
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Renvoie noir (#000000) ou blanc (#ffffff) selon la luminance du fond. */
export function contrastOnColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  const y = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return y > 0.5 ? '#000000' : '#ffffff';
}

/** Mélange une couleur hex avec blanc (positif) ou noir (négatif). */
function mixWithSurface(hex: string, surface: string, amount: number): string {
  const fg = hexToRgb(hex);
  const bg = hexToRgb(surface);
  if (!fg || !bg) return hex;
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(fg.r + (bg.r - fg.r) * t, fg.g + (bg.g - fg.g) * t, fg.b + (bg.b - fg.b) * t);
}

// ─── Palettes dérivées ────────────────────────────────────────────────────────

const FONT_STACKS: Record<ThemeConfig['fontFamily'], string | null> = {
  sans: null, // null = on retire la surcharge → --font-sans du stylesheet
  serif: "Georgia, 'Times New Roman', 'Noto Serif', serif",
  mono: "'DM Mono', 'Fira Code', ui-monospace, monospace",
};

const FONT_SIZES: Record<ThemeConfig['fontScale'], string | null> = {
  small: '13px',
  medium: null, // null = clamp() responsive du stylesheet
  large: '17px',
};

const RADIUS_PRESETS: Record<NonNullable<ThemeConfig['borderRadius']>, Record<string, string> | null> = {
  sharp: {
    '--radius-sm': '2px', '--radius-md': '4px', '--radius-lg': '6px',
    '--radius-xl': '8px', '--radius-2xl': '10px', '--radius-3xl': '12px',
  },
  rounded: null, // valeurs par défaut du stylesheet
  extra: {
    '--radius-sm': '12px', '--radius-md': '16px', '--radius-lg': '22px',
    '--radius-xl': '26px', '--radius-2xl': '30px', '--radius-3xl': '36px',
  },
};

const RADIUS_VARS = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl', '--radius-3xl'];

// Variables injectées dynamiquement (pour nettoyage éventuel)
const ACCENT_VARS = [
  '--brand-500', '--brand-600', '--brand-400',
  '--border-focus', '--shadow-brand', '--shadow-brand-lg',
  '--sidebar-active-text', '--sidebar-active-border',
  '--sidebar-icon-hover', '--sidebar-active-bg', '--sidebar-item-active-bar',
];

// Garde une trace des variables customColors déjà posées pour pouvoir les retirer
let appliedCustomColorVars: string[] = [];

/**
 * Applique un ThemeConfig sur le DOM (`:root` / `<html>` / `<body>`).
 * Fonction pure DOM, exportée pour un usage hors React si nécessaire.
 */
export function applyThemeVariables(theme: ThemeConfig, mode: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  // 1) Mode clair / sombre (classes consommées par index.css et Tailwind)
  root.classList.remove('dark', 'light');
  body.classList.remove('dark', 'light');
  root.classList.add(mode);
  body.classList.add(mode);

  // 2) Couleur d'accentuation → variables brand + dérivées sidebar/focus/shadows
  const accent = normalizeHex(theme.accentColor || DEFAULT_THEME_CONFIG.accentColor);
  if (accent) {
    const rgb = hexToRgb(accent);
    const isDark = mode === 'dark';
    const accent400 = shiftHex(accent, 0.20);   // teinte claire
    const accent600 = shiftHex(accent, -0.12);  // teinte foncée

    root.style.setProperty('--brand-500', accent);
    root.style.setProperty('--brand-600', accent600);
    root.style.setProperty('--brand-400', accent400);
    if (rgb) root.style.setProperty('--brand-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

    root.style.setProperty('--border-focus', rgba(accent, isDark ? 0.6 : 0.45));
    root.style.setProperty(
      '--shadow-brand',
      `0 2px 10px ${rgba(accent, isDark ? 0.25 : 0.14)}, 0 1px 3px ${rgba(accent, isDark ? 0.15 : 0.08)}`
    );
    root.style.setProperty(
      '--shadow-brand-lg',
      `0 6px 20px ${rgba(accent, isDark ? 0.35 : 0.22)}, 0 2px 6px ${rgba(accent, isDark ? 0.20 : 0.12)}`
    );

    root.style.setProperty('--sidebar-active-bg', rgba(accent, isDark ? 0.15 : 0.08));
    root.style.setProperty('--sidebar-active-text', isDark ? shiftHex(accent, 0.35) : shiftHex(accent, -0.20));
    root.style.setProperty('--sidebar-active-border', rgba(accent, isDark ? 0.35 : 0.25));
    root.style.setProperty('--sidebar-icon-hover', isDark ? accent400 : accent600);
    root.style.setProperty('--sidebar-item-active-bar', accent);

    // ── Material Design 3 tokens générés depuis l'accent ──────────────────
    const surface = isDark ? '#0d1229' : '#ffffff';
    const onSurface = isDark ? '#f8fafc' : '#0f172a';
    const onSurfaceVariant = isDark ? '#cbd5e1' : '#334155';
    const primary = accent;
    const onPrimary = contrastOnColor(primary);
    const primaryContainer = isDark ? shiftHex(primary, 0.30) : shiftHex(primary, 0.88);
    const onPrimaryContainer = isDark ? shiftHex(primary, -0.35) : shiftHex(primary, -0.55);
    const secondaryContainer = mixWithSurface(primary, surface, isDark ? 0.18 : 0.14);
    const onSecondaryContainer = isDark ? shiftHex(primary, -0.20) : shiftHex(primary, -0.45);
    const surfaceContainerLow = isDark ? mixWithSurface(primary, surface, 0.04) : mixWithSurface(primary, '#f4f6fb', 0.03);
    const surfaceContainer = isDark ? mixWithSurface(primary, surface, 0.07) : mixWithSurface(primary, '#f4f6fb', 0.06);
    const surfaceContainerHigh = isDark ? mixWithSurface(primary, surface, 0.12) : mixWithSurface(primary, '#f4f6fb', 0.10);
    const surfaceVariant = isDark ? mixWithSurface(primary, surface, 0.18) : mixWithSurface(primary, '#f4f6fb', 0.16);
    const outline = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const outlineVariant = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const error = '#ef4444';
    const onError = '#ffffff';

    root.style.setProperty('--md-sys-color-primary', primary);
    root.style.setProperty('--md-sys-color-on-primary', onPrimary);
    root.style.setProperty('--md-sys-color-primary-container', primaryContainer);
    root.style.setProperty('--md-sys-color-on-primary-container', onPrimaryContainer);
    root.style.setProperty('--md-sys-color-secondary-container', secondaryContainer);
    root.style.setProperty('--md-sys-color-on-secondary-container', onSecondaryContainer);
    root.style.setProperty('--md-sys-color-surface', surface);
    root.style.setProperty('--md-sys-color-surface-container-low', surfaceContainerLow);
    root.style.setProperty('--md-sys-color-surface-container', surfaceContainer);
    root.style.setProperty('--md-sys-color-surface-container-high', surfaceContainerHigh);
    root.style.setProperty('--md-sys-color-surface-variant', surfaceVariant);
    root.style.setProperty('--md-sys-color-on-surface', onSurface);
    root.style.setProperty('--md-sys-color-on-surface-variant', onSurfaceVariant);
    root.style.setProperty('--md-sys-color-outline', outline);
    root.style.setProperty('--md-sys-color-outline-variant', outlineVariant);
    root.style.setProperty('--md-sys-color-error', error);
    root.style.setProperty('--md-sys-color-on-error', onError);
  } else {
    // Couleur invalide → on nettoie pour retomber sur les valeurs du stylesheet
    ACCENT_VARS.forEach((v) => root.style.removeProperty(v));
  }

  // 3) Échelle de police (taille de base sur <html>)
  const fontSize = FONT_SIZES[theme.fontScale || 'medium'];
  if (fontSize) root.style.fontSize = fontSize;
  else root.style.removeProperty('font-size');

  // 4) Famille de police → surcharge de --font-sans
  const fontStack = FONT_STACKS[theme.fontFamily || 'sans'];
  if (fontStack) root.style.setProperty('--font-sans', fontStack);
  else root.style.removeProperty('--font-sans');

  // 5) Densité → attribut consommé par index.css
  root.dataset.density = theme.density || 'comfortable';

  // 6) Rayon de bordure
  const radius = RADIUS_PRESETS[theme.borderRadius || 'rounded'];
  if (radius) {
    Object.entries(radius).forEach(([k, v]) => root.style.setProperty(k, v));
  } else {
    RADIUS_VARS.forEach((v) => root.style.removeProperty(v));
  }

  // 7) Accessibilité
  if (theme.reducedMotion) root.dataset.reducedMotion = 'true';
  else delete root.dataset.reducedMotion;
  if (theme.highContrast) root.dataset.highContrast = 'true';
  else delete root.dataset.highContrast;

  // 8) Couleurs personnalisées (--var: valeur)
  const nextCustom = theme.customColors || {};
  appliedCustomColorVars
    .filter((k) => !(k in nextCustom))
    .forEach((k) => root.style.removeProperty(k));
  Object.entries(nextCustom).forEach(([k, v]) => {
    if (k.startsWith('--') && typeof v === 'string') root.style.setProperty(k, v);
  });
  appliedCustomColorVars = Object.keys(nextCustom).filter((k) => k.startsWith('--'));
}

// ─── Détection du mode système ────────────────────────────────────────────────

function getSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseThemeConfigReturn {
  /** Config d'apparence effective (toujours définie, avec valeurs par défaut). */
  themeConfig: ThemeConfig;
  /** Objet app_settings complet (null tant que non chargé). */
  appSettings: AppSettings | null;
  /** Mode résolu après prise en compte de 'system'. */
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  /** true tant que app_settings n'a pas été lu depuis la base. */
  loading: boolean;
  /** Applique immédiatement + persiste themeConfig dans app_settings. */
  applyThemeConfig: (theme: ThemeConfig) => Promise<void>;
  /** Change uniquement le mode d'apparence (light/dark/system) et persiste. */
  setAppearance: (appearance: ThemeConfig['appearance']) => Promise<void>;
  /** Bascule clair ↔ sombre (fixe une apparence explicite, quitte 'system'). */
  toggleTheme: () => Promise<void>;
  /** Recharge app_settings depuis la base. */
  refresh: () => Promise<void>;
}

export const useThemeConfig = (): UseThemeConfigReturn => {
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [loading, setLoading] = useState(true);
  const [systemDark, setSystemDark] = useState<boolean>(getSystemDark);

  // Abonnement aux changements du thème OS (utile quand appearance === 'system')
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // anciens WebKit
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const raw = await LocalDatabaseService.getConfig('app_settings');
      const settings: AppSettings | null = raw && typeof raw === 'object' ? raw : null;
      setAppSettings(settings);

      if (settings?.themeConfig) {
        setThemeConfig({ ...DEFAULT_THEME_CONFIG, ...settings.themeConfig });
      } else {
        // Migration douce : l'ancienne préférence vivait dans localStorage('ecolisa_theme')
        const legacy = (localStorage.getItem('ecolisa_theme') as 'dark' | 'light' | null);
        setThemeConfig({
          ...DEFAULT_THEME_CONFIG,
          appearance: legacy === 'dark' || legacy === 'light' ? legacy : 'system',
        });
      }
    } catch (e) {
      console.warn('[useThemeConfig] Erreur de chargement app_settings :', e);
      setThemeConfig(DEFAULT_THEME_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial + réapplication sur 'ecolisa:config:change'
  useEffect(() => {
    refresh();
    const onConfigChange = () => refresh();
    window.addEventListener('ecolisa:config:change', onConfigChange);
    return () => window.removeEventListener('ecolisa:config:change', onConfigChange);
  }, [refresh]);

  const resolvedTheme: ResolvedTheme =
    themeConfig.appearance === 'system' ? (systemDark ? 'dark' : 'light') : themeConfig.appearance;

  // Application des variables CSS / classes à chaque changement pertinent
  useEffect(() => {
    applyThemeVariables(themeConfig, resolvedTheme);
    // Miroir legacy pour compatibilité descendante (localDatabase purge cette clé au logout)
    try { localStorage.setItem('ecolisa_theme', resolvedTheme); } catch {}
  }, [themeConfig, resolvedTheme]);

  const applyThemeConfig = useCallback(async (theme: ThemeConfig) => {
    const merged: ThemeConfig = { ...DEFAULT_THEME_CONFIG, ...theme };
    setThemeConfig(merged);
    setAppSettings((prev) => {
      const next: AppSettings = { ...(prev || {}), themeConfig: merged };
      // Persistance (async fire-and-forget, l'état local est déjà à jour)
      LocalDatabaseService.setConfig('app_settings', next).catch((e) =>
        console.warn('[useThemeConfig] Erreur de persistance app_settings :', e)
      );
      return next;
    });
    try { window.dispatchEvent(new Event('ecolisa:config:change')); } catch {}
  }, []);

  const setAppearance = useCallback(
    async (appearance: ThemeConfig['appearance']) => {
      await applyThemeConfig({ ...themeConfig, appearance });
    },
    [applyThemeConfig, themeConfig]
  );

  const toggleTheme = useCallback(async () => {
    // Bascule déterministe sur le mode résolu actuel
    const next: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    await applyThemeConfig({ ...themeConfig, appearance: next });
  }, [applyThemeConfig, themeConfig, resolvedTheme]);

  return {
    themeConfig,
    appSettings,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    loading,
    applyThemeConfig,
    setAppearance,
    toggleTheme,
    refresh,
  };
};

export default useThemeConfig;
