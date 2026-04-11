import type { LocaleCode } from '@/shared/i18n/locales';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

/**
 * Formate une date API `YYYY-MM-DD` pour les listes (Mes soirées, etc.).
 */
export function formatMyEventsListDate(isoDate: string, locale: LocaleCode): string {
  const raw = isoDate.trim();
  const parts = raw.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return raw;
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return raw;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}
