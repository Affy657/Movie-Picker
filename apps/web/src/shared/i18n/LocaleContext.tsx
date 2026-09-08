import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isLocaleCode, loadLocale, loadedLocale, type Locale, type LocaleCode } from './locales';

const STORAGE_KEY = 'moviepicker-locale';

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;

  tmdbLanguage: string;
  translations: Locale | undefined;
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

export function preferredLocale(): LocaleCode {
  if (globalThis.window === undefined) return 'fr';
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

export function LocaleProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [localeState, setLocaleState] = useState<LocaleCode>(preferredLocale);
  const [translations, setTranslations] = useState<Locale | undefined>(() =>
    loadedLocale(localeState)
  );

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    persistLocale(code);
  }, []);

  useEffect(() => {
    document.documentElement.lang = localeState;
  }, [localeState]);

  useEffect(() => {
    const alreadyLoaded = loadedLocale(localeState);
    if (alreadyLoaded) {
      setTranslations(alreadyLoaded);
      return;
    }
    let stillWanted = true;
    void loadLocale(localeState).then(() => {
      if (stillWanted) setTranslations(loadedLocale(localeState));
    });
    return () => {
      stillWanted = false;
    };
  }, [localeState]);

  const tmdbLanguage = TMDB_LANGUAGE_MAP[localeState];

  const value = useMemo<LocaleContextValue>(
    () => ({ locale: localeState, setLocale, tmdbLanguage, translations }),
    [localeState, setLocale, tmdbLanguage, translations]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale doit être utilisé sous LocaleProvider');
  return ctx;
}
