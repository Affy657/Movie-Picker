import type { Translate, TranslationKey } from './t';

const STARTS_WITH_VOWEL = /^[aeiouyàâäéèêëîïôöùûüÿæœ]/iu;

export function withElision(
  name: string,
  plainKey: TranslationKey,
  elidedKey: TranslationKey,
  t: Translate,
  vars: Record<string, string | number> = {}
): string {
  return t(STARTS_WITH_VOWEL.test(name) ? elidedKey : plainKey, { ...vars, name });
}
