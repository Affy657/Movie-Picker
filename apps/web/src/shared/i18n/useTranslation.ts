import { useCallback } from 'react';
import { useLocale } from './LocaleContext';
import { translate, type TranslationKey } from './t';

export function useTranslation() {
  const { locale, translations } = useLocale();

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(translations, key, vars),
    [translations]
  );

  return { t, locale } as const;
}
