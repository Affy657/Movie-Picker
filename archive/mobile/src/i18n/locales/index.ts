export { fr, type Locale } from './fr';
export { en } from './en';

export type LocaleCode = 'fr' | 'en';

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  fr: 'Français',
  en: 'English',
};

export const SUPPORTED_LOCALES: readonly LocaleCode[] = ['fr', 'en'] as const;

export function isLocaleCode(value: string): value is LocaleCode {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
