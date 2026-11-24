import { eventWallClockAt } from '@/shared/utils/eventScheduled';
import { earliestOpenStartLocal, latestEventDate } from './createEventValidation';

const DEFAULT_START_MINUTES = 20 * 60;
const START_SLOT_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isoDate(day: Date): string {
  return `${day.getUTCFullYear()}-${pad2(day.getUTCMonth() + 1)}-${pad2(day.getUTCDate())}`;
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

export function eventDateBounds(now: Date): { min: string; max: string; today: string } {
  return {
    min: earliestOpenStartLocal(now).slice(0, 10),
    max: latestEventDate(now),
    today: todayInEventZone(now.getTime()),
  };
}
