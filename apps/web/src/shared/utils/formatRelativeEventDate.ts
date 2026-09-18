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

function parseEventDay(isoDate: string): Date | null {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return null;
  const [y, m, d] = parts;
  const eventDay = new Date(y, m - 1, d);
  return Number.isNaN(eventDay.getTime()) ? null : eventDay;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysUntilEventDate(isoDate: string): number | null {
  const eventDay = parseEventDay(isoDate);
  if (!eventDay) return null;
  return Math.round((eventDay.getTime() - startOfToday().getTime()) / 86_400_000);
}

export type RelativeEventDistance = { unit: 'day' | 'month' | 'year'; value: number };

export function relativeEventDistance(isoDate: string): RelativeEventDistance | null {
  const eventDay = parseEventDay(isoDate);
  if (!eventDay) return null;
  const today = startOfToday();
  const dayDiff = Math.round((eventDay.getTime() - today.getTime()) / 86_400_000);
  if (Math.abs(dayDiff) < 31) return { unit: 'day', value: dayDiff };

  const monthDiff =
    (eventDay.getFullYear() - today.getFullYear()) * 12 + (eventDay.getMonth() - today.getMonth());
  if (Math.abs(monthDiff) < 12) return { unit: 'month', value: monthDiff };

  return { unit: 'year', value: Math.round(monthDiff / 12) };
}

export function formatRelativeEventDate(isoDate: string, locale: LocaleCode): string {
  const distance = relativeEventDistance(isoDate);
  if (!distance) return isoDate;
  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAG[locale], { numeric: 'auto' });
  return rtf.format(distance.value, distance.unit);
}
