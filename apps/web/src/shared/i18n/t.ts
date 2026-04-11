import { fr, en, type Locale, type LocaleCode } from './locales';

const LOCALES: Record<LocaleCode, Locale> = { fr, en };

/**
 * Union de toutes les clés dot-notation valides dans le fichier de locale.
 * Permet l'autocomplétion et la vérification à la compilation.
 */
type DotPrefix<P extends string, K extends string> = `${P}${K}`;

type NestedKeys<T, Prefix extends string = ''> =
  T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: T[K] extends Record<string, unknown>
          ? NestedKeys<T[K], DotPrefix<Prefix, `${K}.`>>
          : DotPrefix<Prefix, K>;
      }[keyof T & string]
    : never;

export type TranslationKey = NestedKeys<Locale>;

/**
 * Résout une clé dot-notation (`'common.loading'`, `'auth.login.title'`, …)
 * dans la locale demandée (par défaut FR).
 *
 * Interpolation : `t('movies.search.regionHint', { region: 'FR' })`
 * remplace `{{region}}` dans la chaîne.
 *
 * Retourne la clé brute si elle ne correspond à aucune entrée.
 * En mode dev, un warning console aide à détecter les clés invalides.
 */
export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale: LocaleCode = 'fr'
): string {
  const parts = key.split('.');
  let node: unknown = LOCALES[locale] ?? LOCALES.fr;

  for (const part of parts) {
    if (node == null || typeof node !== 'object') {
      if (import.meta.env.DEV) console.warn(`[i18n] clé introuvable : "${key}" (${locale})`);
      return key;
    }
    node = (node as Record<string, unknown>)[part];
  }

  if (typeof node !== 'string') {
    if (import.meta.env.DEV) console.warn(`[i18n] clé introuvable : "${key}" (${locale})`);
    return key;
  }

  if (!vars) return node;

  let result = node;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{{${k}}}`, String(v));
  }
  return result;
}
