import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';
import {
  getPalette,
  isAccentColor,
  isUiThemePreference,
  type AccentColor,
  type ResolvedTheme,
  type UiThemePreference,
} from '@/theme/colors';

const PREFERENCE_STORAGE_KEY = 'moviepicker-ui-preference';
const ACCENT_STORAGE_KEY = 'moviepicker-ui-accent';

type ThemeContextValue = {
  preference: UiThemePreference;
  resolvedTheme: ResolvedTheme;
  setUiPreference: (p: UiThemePreference) => void;
  toggleTheme: () => void;
  applyRemotePreference: (p: UiThemePreference) => void;

  accent: AccentColor;
  setAccent: (c: AccentColor) => void;
  applyRemoteAccent: (c: AccentColor) => void;

  palette: ReturnType<typeof getPalette>;
};

const NEXT_PREFERENCE: Record<UiThemePreference, UiThemePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<UiThemePreference>('system');
  const [accentState, setAccentState] = useState<AccentColor>('default');
  const [systemDark, setSystemDark] = useState<boolean>(
    () => Appearance.getColorScheme() === 'dark'
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [prefRaw, accentRaw] = await Promise.all([
        AsyncStorage.getItem(PREFERENCE_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(ACCENT_STORAGE_KEY).catch(() => null),
      ]);
      if (cancelled) return;
      if (prefRaw && isUiThemePreference(prefRaw)) setPreferenceState(prefRaw);
      if (accentRaw && isAccentColor(accentRaw)) setAccentState(accentRaw);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemDark(colorScheme === 'dark');
    });
    return () => sub.remove();
  }, []);

  const resolvedTheme: ResolvedTheme =
    preference === 'dark'
      ? 'dark'
      : preference === 'light'
        ? 'light'
        : systemDark
          ? 'dark'
          : 'light';

  const setUiPreference = useCallback((p: UiThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(PREFERENCE_STORAGE_KEY, p).catch(() => {});
  }, []);

  const applyRemotePreference = useCallback((p: UiThemePreference) => {
    setPreferenceState((prev) => {
      if (prev === p) return prev;
      AsyncStorage.setItem(PREFERENCE_STORAGE_KEY, p).catch(() => {});
      return p;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferenceState((prev) => {
      const next = NEXT_PREFERENCE[prev];
      AsyncStorage.setItem(PREFERENCE_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const setAccent = useCallback((c: AccentColor) => {
    setAccentState(c);
    AsyncStorage.setItem(ACCENT_STORAGE_KEY, c).catch(() => {});
  }, []);

  const applyRemoteAccent = useCallback((c: AccentColor) => {
    setAccentState((prev) => {
      if (prev === c) return prev;
      AsyncStorage.setItem(ACCENT_STORAGE_KEY, c).catch(() => {});
      return c;
    });
  }, []);

  const palette = useMemo(
    () => getPalette(resolvedTheme, accentState),
    [resolvedTheme, accentState]
  );

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
      palette,
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
      palette,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé sous ThemeProvider');
  return ctx;
}
