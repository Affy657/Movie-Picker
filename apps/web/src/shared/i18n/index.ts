export { t, type TranslationKey } from './t';
export {
  fr,
  en,
  type Locale,
  type LocaleCode,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  isLocaleCode,
} from './locales';
export { LocaleProvider, useLocale } from './LocaleContext';
export { useTranslation } from './useTranslation';
