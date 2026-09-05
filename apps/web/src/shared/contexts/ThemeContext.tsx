import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AccentColor, UiThemePreference } from '@/shared/types/theme';
import { getNextUiPreference, isUiThemePreference } from '@/shared/utils/uiThemePreference';
import { isAccentColor } from '@/shared/utils/accentColor';

const MIGRATE_FROM_STORAGE_KEY = 'moviepicker-theme';
const PREFERENCE_STORAGE_KEY = 'moviepicker-ui-preference';
const ACCENT_STORAGE_KEY = 'moviepicker-ui-accent';

type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  preference: UiThemePreference;

  resolvedTheme: ResolvedTheme;
  setUiPreference: (p: UiThemePreference) => void;

  toggleTheme: () => void;

  applyRemotePreference: (p: UiThemePreference) => void;

  accent: AccentColor;
  setAccent: (c: AccentColor) => void;

  applyRemoteAccent: (c: AccentColor) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): UiThemePreference {
  if (globalThis.window === undefined) return 'system';
  try {
    const stored = localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (isUiThemePreference(stored)) return stored;

    const migrated = localStorage.getItem(MIGRATE_FROM_STORAGE_KEY);
    if (migrated === 'light' || migrated === 'dark') {
      persistPreference(migrated);
      localStorage.removeItem(MIGRATE_FROM_STORAGE_KEY);
      return migrated;
    }
  } catch {}
  return 'system';
}

function persistPreference(p: UiThemePreference): void {
  try {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, p);
  } catch {}
}

function readStoredAccent(): AccentColor {
  if (globalThis.window === undefined) return 'default';
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (isAccentColor(stored)) return stored;
  } catch {}
  return 'default';
}

function persistAccent(c: AccentColor): void {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, c);
  } catch {}
}

function resolveTheme(preference: UiThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [preference, setPreference] = useState<UiThemePreference>(() => readStoredPreference());
  const [accentState, setAccentState] = useState<AccentColor>(() => readStoredAccent());
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (globalThis.window === undefined || !globalThis.matchMedia) return false;
    return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const resolvedTheme: ResolvedTheme = resolveTheme(preference, systemDark);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document
      .getElementById('theme-color-meta')
      ?.setAttribute('content', resolvedTheme === 'dark' ? '#0a0f1c' : '#f4f6fa');
  }, [resolvedTheme]);

  useEffect(() => {
    if (accentState === 'default') {
      delete document.documentElement.dataset.accent;
    } else {
      document.documentElement.dataset.accent = accentState;
    }
  }, [accentState]);

  const setUiPreference = useCallback((p: UiThemePreference) => {
    setPreference(p);
    persistPreference(p);
  }, []);

  const applyRemotePreference = useCallback((p: UiThemePreference) => {
    setPreference((prev) => {
      if (prev === p) return prev;
      persistPreference(p);
      return p;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference((prev) => {
      const next = getNextUiPreference(prev);
      persistPreference(next);
      return next;
    });
  }, []);

  const setAccent = useCallback((c: AccentColor) => {
    setAccentState(c);
    persistAccent(c);
  }, []);

  const applyRemoteAccent = useCallback((c: AccentColor) => {
    setAccentState((prev) => {
      if (prev === c) return prev;
      persistAccent(c);
      return c;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setUiPreference,
      toggleTheme,
      applyRemotePreference,
      accent: accentState,
      setAccent,
      applyRemoteAccent,
    }),
    [
      preference,
      resolvedTheme,
      setUiPreference,
      toggleTheme,
      applyRemotePreference,
      accentState,
      setAccent,
      applyRemoteAccent,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans ThemeProvider');
  return ctx;
}
