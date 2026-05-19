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
  if (typeof window === 'undefined') return 'fr';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored != null && isLocaleCode(stored)) return stored;
  } catch {}
  return detectBrowserLocale();
}

function persistLocale(code: LocaleCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(readStoredLocale);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    persistLocale(code);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const tmdbLanguage = TMDB_LANGUAGE_MAP[locale];

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, tmdbLanguage }),
    [locale, setLocale, tmdbLanguage]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale doit être utilisé sous LocaleProvider');
  return ctx;
}
