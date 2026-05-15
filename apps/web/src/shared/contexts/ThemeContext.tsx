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

/** Ancienne clé MVP ; lecture + suppression au premier chargement si la clé V1 est absente. */
const MIGRATE_FROM_STORAGE_KEY = 'moviepicker-theme';
const PREFERENCE_STORAGE_KEY = 'moviepicker-ui-preference';
const ACCENT_STORAGE_KEY = 'moviepicker-ui-accent';

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

  /** Palette d'accent active (locale ou recopiée du profil). */
  accent: AccentColor;
  setAccent: (c: AccentColor) => void;
  /** Après chargement du profil : applique l'accent serveur + localStorage. */
  applyRemoteAccent: (c: AccentColor) => void;
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

function readStoredAccent(): AccentColor {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (isAccentColor(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'default';
}

function persistAccent(c: AccentColor): void {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, c);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<UiThemePreference>(() =>
    readStoredPreference()
  );
  const [accentState, setAccentState] = useState<AccentColor>(() => readStoredAccent());
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

  // `default` = pas d'attribut → utilise les valeurs natives :root/[data-theme=dark].
  useEffect(() => {
    if (accentState === 'default') {
      delete document.documentElement.dataset.accent;
    } else {
      document.documentElement.dataset.accent = accentState;
    }
  }, [accentState]);

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
