import type { LocaleCode } from '@/shared/i18n/locales';

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

export function formatMyEventsListDate(isoDate: string, locale: LocaleCode): string {
  const raw = isoDate.trim();
  const parts = raw.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return raw;
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return raw;
  const currentYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    ...(y !== currentYear && { year: 'numeric' }),
  };
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], options).format(dt);
}

export function formatEventTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr ?? '', 10);
  const min = parseInt(mStr ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return time;
  return min === 0 ? `${h}h` : `${h}h${String(min).padStart(2, '0')}`;
}
