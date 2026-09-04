import type { LocaleCode } from '@/shared/i18n/locales';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

function parseIsoDateParts(isoDate: string): [number, number, number] | null {
  const parts = isoDate
    .trim()
    .split('-')
    .map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0]!, parts[1]!, parts[2]!];
}

export function formatRelativeEventDate(isoDate: string, locale: LocaleCode): string {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return isoDate;
  const [y, m, d] = parts;
  const eventDay = new Date(y, m - 1, d);
  if (Number.isNaN(eventDay.getTime())) return isoDate;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.round((eventDay.getTime() - today.getTime()) / 86_400_000);

  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAG[locale], { numeric: 'auto' });

  if (Math.abs(dayDiff) < 31) return rtf.format(dayDiff, 'day');

  const monthDiff =
    (eventDay.getFullYear() - today.getFullYear()) * 12 + (eventDay.getMonth() - today.getMonth());
  return rtf.format(monthDiff, 'month');
}
