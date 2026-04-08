import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UiThemePreference } from '../types/auth';
import { getNextUiPreference, isUiThemePreference } from '../utils/uiThemePreference';

/** Ancienne clé MVP ; lecture + suppression au premier chargement si la clé V1 est absente. */
const MIGRATE_FROM_STORAGE_KEY = 'moviepicker-theme';
const PREFERENCE_STORAGE_KEY = 'moviepicker-ui-preference';

type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  /** Préférence persistée (local ou recopiée depuis le compte). */
  preference: UiThemePreference;
  /** Thème réellement appliqué au document (système résolu). */
  resolvedTheme: ResolvedTheme;
  setUiPreference: (p: UiThemePreference) => void;
  /** Clair → sombre → auto (système) → clair. */
  toggleTheme: () => void;
  /** Après chargement du profil : applique la préférence serveur + localStorage. */
  applyRemotePreference: (p: UiThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): UiThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (isUiThemePreference(stored)) return stored;

    const migrated = localStorage.getItem(MIGRATE_FROM_STORAGE_KEY);
    if (migrated === 'light' || migrated === 'dark') {
      persistPreference(migrated);
      localStorage.removeItem(MIGRATE_FROM_STORAGE_KEY);
      return migrated;
    }
  } catch {
    /* ignore */
  }
  return 'system';
}

function persistPreference(p: UiThemePreference): void {
  try {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, p);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<UiThemePreference>(() =>
    readStoredPreference()
  );
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const resolvedTheme: ResolvedTheme =
    preference === 'dark'
      ? 'dark'
      : preference === 'light'
        ? 'light'
        : systemDark
          ? 'dark'
          : 'light';

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const setUiPreference = useCallback((p: UiThemePreference) => {
    setPreferenceState(p);
    persistPreference(p);
  }, []);

  const applyRemotePreference = useCallback((p: UiThemePreference) => {
    setPreferenceState((prev) => {
      if (prev === p) return prev;
      persistPreference(p);
      return p;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferenceState((prev) => {
      const next = getNextUiPreference(prev);
      persistPreference(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setUiPreference,
      toggleTheme,
      applyRemotePreference,
    }),
    [preference, resolvedTheme, setUiPreference, toggleTheme, applyRemotePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans ThemeProvider');
  return ctx;
}
