import type { MyEventSummary } from '@/features/events/types';
import type { LocaleCode } from '@/shared/i18n/locales';

export interface EventMonthGroup {
  key: string;
  label: string;
  events: MyEventSummary[];
}

const LOCALE_TAG: Record<LocaleCode, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

function monthKey(date: string): string {
  const parts = date.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : date;
}

export function groupEventsByMonth(
  events: readonly MyEventSummary[],
  locale: LocaleCode
): EventMonthGroup[] {
  const groups: EventMonthGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const event of events) {
    const key = monthKey(event.date);
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = groups.length;
      indexByKey.set(key, index);
      groups.push({ key, label: monthLabel(key, locale), events: [] });
    }
    groups[index]!.events.push(event);
  }

  return groups;
}

function monthLabel(key: string, locale: LocaleCode): string {
  const [yearStr, monthStr] = key.split('-');
  const year = Number.parseInt(yearStr ?? '', 10);
  const month = Number.parseInt(monthStr ?? '', 10);
  if (Number.isNaN(year) || Number.isNaN(month)) return key;
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], { month: 'long', year: 'numeric' }).format(
    date
  );
}
