import type { LocaleCode } from '@/shared/i18n/locales';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

function formatIsoDate(
  isoDate: string,
  locale: LocaleCode,
  style: Pick<Intl.DateTimeFormatOptions, 'weekday' | 'month'>
): string | null {
  const parts = isoDate
    .trim()
    .split('-')
    .map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts as [number, number, number];
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = {
    ...style,
    day: 'numeric',
    ...(y !== new Date().getFullYear() && { year: 'numeric' }),
  };
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], options).format(dt);
}

export function formatMyEventsListDate(isoDate: string, locale: LocaleCode): string {
  return formatIsoDate(isoDate, locale, { weekday: 'short', month: 'short' }) ?? isoDate.trim();
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
  const datePart = formatIsoDate(isoDate, locale, { weekday: 'long', month: 'short' });
  return datePart === null ? isoDate.trim() : `${datePart} ${joiner} ${formatEventTime(time)}`;
}

export function formatEventTitleDate(isoDate: string, locale: LocaleCode): string {
  return formatIsoDate(isoDate, locale, { weekday: 'long', month: 'long' }) ?? isoDate.trim();
}
