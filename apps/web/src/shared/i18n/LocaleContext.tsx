import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isLocaleCode, type LocaleCode } from './locales';

const STORAGE_KEY = 'moviepicker-locale';

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;

  tmdbLanguage: string;
};

const TMDB_LANGUAGE_MAP: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectBrowserLocale(): LocaleCode {
  if (typeof navigator === 'undefined') return 'fr';
  const lang = navigator.language?.toLowerCase() ?? '';
  if (lang.startsWith('en')) return 'en';
  return 'fr';
}

function readStoredLocale(): LocaleCode {
  if (globalThis.window === undefined) return 'fr';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored != null && isLocaleCode(stored)) return stored;
  } catch {
    // Storage unavailable — fallback to browser locale detection
  }
  return detectBrowserLocale();
}

function persistLocale(code: LocaleCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage unavailable (private browsing or quota exceeded) — write fails silently
  }
}

export function LocaleProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [localeState, setLocaleState] = useState<LocaleCode>(readStoredLocale);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    persistLocale(code);
  }, []);

  useEffect(() => {
    document.documentElement.lang = localeState;
  }, [localeState]);

  const tmdbLanguage = TMDB_LANGUAGE_MAP[localeState];

  const value = useMemo<LocaleContextValue>(
    () => ({ locale: localeState, setLocale, tmdbLanguage }),
    [localeState, setLocale, tmdbLanguage]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale doit être utilisé sous LocaleProvider');
  return ctx;
}
