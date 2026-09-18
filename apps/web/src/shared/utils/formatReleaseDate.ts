import type { LocaleCode } from '@/shared/i18n/locales';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

export function formatReleaseDate(isoDate: string, locale: LocaleCode): string {
  const parts = isoDate
    .trim()
    .split('-')
    .map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [year, month, day] = parts as [number, number, number];
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function yearFromDate(isoDate: string | null | undefined): string | undefined {
  const match = /^\s*(\d{4})/.exec(isoDate ?? '');
  return match?.[1];
}
