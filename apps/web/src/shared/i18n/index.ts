export { t, type TranslationKey } from './t';
export {
  type Locale,
  type LocaleCode,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  isLocaleCode,
  loadLocale,
} from './locales';
export { LocaleProvider, useLocale, preferredLocale } from './LocaleContext';
export { useTranslation } from './useTranslation';
