import type { LocaleCode } from '@/shared/i18n/locales';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

export function formatMyEventsListDate(isoDate: string, locale: LocaleCode): string {
  const raw = isoDate.trim();
  const parts = raw.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return raw;
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return raw;
  const currentYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(y !== currentYear && { year: 'numeric' }),
  };
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], options).format(dt);
}

export function formatEventTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = Number.parseInt(hStr ?? '', 10);
  const min = Number.parseInt(mStr ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return time;
  return min === 0 ? `${h}h` : `${h}h${String(min).padStart(2, '0')}`;
}

export function formatEventDateLong(
  isoDate: string,
  time: string,
  locale: LocaleCode,
  joiner: string
): string {
  const raw = isoDate.trim();
  const parts = raw.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return raw;
  const y = parts[0]!;
  const dt = new Date(y, parts[1]! - 1, parts[2]!);
  if (Number.isNaN(dt.getTime())) return raw;
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    ...(y !== new Date().getFullYear() && { year: 'numeric' }),
  };
  const datePart = new Intl.DateTimeFormat(LOCALE_TAG[locale], options).format(dt);
  return `${datePart} ${joiner} ${formatEventTime(time)}`;
}

export function formatEventTitleDate(isoDate: string, locale: LocaleCode): string {
  const raw = isoDate.trim();
  const parts = raw.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return raw;
  const y = parts[0]!;
  const dt = new Date(y, parts[1]! - 1, parts[2]!);
  if (Number.isNaN(dt.getTime())) return raw;
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(y !== new Date().getFullYear() && { year: 'numeric' }),
  };
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], options).format(dt);
}
