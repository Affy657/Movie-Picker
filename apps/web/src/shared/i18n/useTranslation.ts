import { useCallback } from 'react';
import { useLocale } from './LocaleContext';
import { t as rawT, type TranslationKey } from './t';

export function useTranslation() {
  const { locale } = useLocale();

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => rawT(key, vars, locale),
    [locale]
  );

  return { t, locale } as const;
}
