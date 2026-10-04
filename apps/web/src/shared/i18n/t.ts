import { anyLoadedLocale, loadedLocale, type Locale, type LocaleCode } from './locales';

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

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type TemplateVars = Record<string, string | number>;

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

export function interpolate(template: string, vars: TemplateVars): string {
  return template.replaceAll(PLACEHOLDER, (placeholder, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : placeholder
  );
}

export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale: LocaleCode = 'fr'
): string {
  return translate(loadedLocale(locale) ?? anyLoadedLocale(), key, vars);
}

export function translate(
  messages: Locale | undefined,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const parts = key.split('.');
  let node: unknown = messages;

  for (const part of parts) {
    if (node == null || typeof node !== 'object') {
      if (import.meta.env.DEV) console.warn(`[i18n] missing key: "${key}"`);
      return key;
    }
    node = (node as Record<string, unknown>)[part];
  }

  if (typeof node !== 'string') {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: "${key}"`);
    return key;
  }

  return vars ? interpolate(node, vars) : node;
}
