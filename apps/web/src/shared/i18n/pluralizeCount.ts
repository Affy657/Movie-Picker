import type { Translate, TranslationKey } from './t';

export function pluralizeCount(
  count: number,
  oneKey: TranslationKey,
  manyKey: TranslationKey,
  t: Translate,
  extraVars?: Record<string, string | number>
) {
  if (count === 1) return t(oneKey, extraVars);
  return t(manyKey, { count, ...extraVars });
}
