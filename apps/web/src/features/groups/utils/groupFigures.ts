import type { LocaleCode } from '@/shared/i18n/locales';
import { capitalizeFirst } from '@/features/library/utils/listMembers';

const A_SUNDAY = { year: 2024, monthIndex: 0, day: 7 };

export function weekdayName(weekday: number, locale: LocaleCode): string {
  const day = new Date(A_SUNDAY.year, A_SUNDAY.monthIndex, A_SUNDAY.day + weekday);
  return capitalizeFirst(new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(day), locale);
}

export function sinceMonth(
  isoDate: string,
  locale: LocaleCode,
  now: Date = new Date()
): string | null {
  const [year, month] = isoDate.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month) return null;
  const first = new Date(year, month - 1, 1);
  const options: Intl.DateTimeFormatOptions =
    year === now.getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, options).format(first);
}
