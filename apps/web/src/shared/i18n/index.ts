export { t, type Translate, type TranslationKey } from './t';
export {
  type Locale,
  type LocaleCode,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  isLocaleCode,
  loadLocale,
  loadedLocale,
} from './locales';
export { LocaleProvider, useLocale, preferredLocale } from './LocaleContext';
export { useTranslation } from './useTranslation';
