import type { TranslationKey } from '@/shared/i18n';

export function pluralizeCount(
  count: number,
  oneKey: TranslationKey,
  manyKey: TranslationKey,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  extraVars?: Record<string, string | number>
) {
  if (count === 1) return t(oneKey, extraVars);
  return t(manyKey, { count, ...extraVars });
}
