export type { Locale } from './fr';

import type { Locale } from './fr';

export type LocaleCode = 'fr' | 'en';

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  fr: 'Français',
  en: 'English',
};

export const SUPPORTED_LOCALES: readonly LocaleCode[] = ['fr', 'en'] as const;

export function isLocaleCode(value: string): value is LocaleCode {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

const LOCALE_MODULES: Record<LocaleCode, () => Promise<Locale>> = {
  fr: () => import('./fr').then((module) => module.fr),
  en: () => import('./en').then((module) => module.en),
};

const loadedLocales = new Map<LocaleCode, Locale>();

export function loadedLocale(code: LocaleCode): Locale | undefined {
  return loadedLocales.get(code);
}

export function anyLoadedLocale(): Locale | undefined {
  return loadedLocales.values().next().value;
}

export async function loadLocale(code: LocaleCode): Promise<void> {
  if (loadedLocales.has(code)) return;
  loadedLocales.set(code, await LOCALE_MODULES[code]());
}
