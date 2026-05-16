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
import { NativeModules, Platform } from 'react-native';
import { isLocaleCode, type LocaleCode } from '@/i18n/locales';
import { t as rawT, type TranslationKey } from '@/i18n/t';

const STORAGE_KEY = 'moviepicker-locale';

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  /** TMDB language tag derived from the current locale (e.g. "fr-FR", "en-US"). */
  tmdbLanguage: string;
  /** True until the persisted locale has been loaded from AsyncStorage. */
  isHydrating: boolean;
};

const TMDB_LANGUAGE_MAP: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectDeviceLocale(): LocaleCode {
  const tag =
    Platform.OS === 'ios'
      ? (NativeModules.SettingsManager?.settings?.AppleLocale ??
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ??
          '')
      : (NativeModules.I18nManager?.localeIdentifier ?? '');
  const normalized = String(tag).toLowerCase();
  return normalized.startsWith('en') ? 'en' : 'fr';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => detectDeviceLocale());
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored != null && isLocaleCode(stored)) {
          setLocaleState(stored);
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {
      /* ignore */
    });
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      tmdbLanguage: TMDB_LANGUAGE_MAP[locale],
      isHydrating,
    }),
    [locale, setLocale, isHydrating]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale doit être utilisé sous LocaleProvider');
  return ctx;
}

export function useTranslation() {
  const { locale } = useLocale();
  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => rawT(key, vars, locale),
    [locale]
  );
  return { t, locale } as const;
}
