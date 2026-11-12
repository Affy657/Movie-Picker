import { eventWallClockAt } from '@/shared/utils/eventScheduled';

export type EventDateShortcutKind = 'tonight' | 'tomorrow' | 'day';

export interface EventDateShortcut {
  date: string;
  kind: EventDateShortcutKind;
}

export const EVENT_TIME_SHORTCUTS = ['19:00', '20:00', '20:30', '21:00'] as const;

const DEFAULT_START_MINUTES = 20 * 60;
const START_SLOT_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;
const LATER_DAYS_SHOWN = 2;
const LOOKAHEAD_DAYS = 6;
const SATURDAY = 6;
const SUNDAY = 0;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isoDate(day: Date): string {
  return `${day.getUTCFullYear()}-${pad2(day.getUTCMonth() + 1)}-${pad2(day.getUTCDate())}`;
}

function addDays(isoDay: string, days: number): Date {
  const start = new Date(`${isoDay}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + days);
  return start;
}

function isWeekend(day: Date): boolean {
  const weekday = day.getUTCDay();
  return weekday === SATURDAY || weekday === SUNDAY;
}

export function eventDateShortcuts(today: string): EventDateShortcut[] {
  const laterDays = Array.from({ length: LOOKAHEAD_DAYS - 1 }, (_, index) =>
    addDays(today, index + 2)
  );
  const weekendFirst = [
    ...laterDays.filter(isWeekend),
    ...laterDays.filter((day) => !isWeekend(day)),
  ];
  const picked = weekendFirst
    .slice(0, LATER_DAYS_SHOWN)
    .sort((left, right) => left.getTime() - right.getTime());
  return [
    { date: today, kind: 'tonight' },
    { date: isoDate(addDays(today, 1)), kind: 'tomorrow' },
    ...picked.map((day) => ({ date: isoDate(day), kind: 'day' as const })),
  ];
}

export function todayInEventZone(nowMs: number): string {
  const now = eventWallClockAt(nowMs);
  return `${now.year}-${pad2(now.month)}-${pad2(now.day)}`;
}

export function defaultEventStart(nowMs: number): { date: string; time: string } {
  const now = eventWallClockAt(nowMs);
  const nowMinutes = now.hour * 60 + now.minute;
  const startMinutes =
    nowMinutes < DEFAULT_START_MINUTES
      ? DEFAULT_START_MINUTES
      : (Math.floor(nowMinutes / START_SLOT_MINUTES) + 1) * START_SLOT_MINUTES;
  const startDay = new Date(
    Date.UTC(now.year, now.month - 1, now.day + Math.floor(startMinutes / MINUTES_PER_DAY))
  );
  const startMinuteOfDay = startMinutes % MINUTES_PER_DAY;
  return {
    date: isoDate(startDay),
    time: `${pad2(Math.floor(startMinuteOfDay / 60))}:${pad2(startMinuteOfDay % 60)}`,
  };
}
