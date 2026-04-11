import { useCallback } from 'react';
import { useLocale } from './LocaleContext';
import { t as rawT, type TranslationKey } from './t';

/**
 * Hook returning `t()` bound to the current locale from context.
 * Components using `useTranslation` re-render when the locale changes.
 *
 * Usage:
 * ```tsx
 * const { t } = useTranslation();
 * return <h1>{t('auth.login.title')}</h1>;
 * ```
 */
export function useTranslation() {
  const { locale } = useLocale();

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => rawT(key, vars, locale),
    [locale],
  );

  return { t, locale } as const;
}
