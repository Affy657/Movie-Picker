import { eventScheduledStartUtcMs, eventWallClockAt } from '@/shared/utils/eventScheduled';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type EventCountdown =
  | { unit: 'imminent' }
  | { unit: 'minutes' | 'hours'; count: number }
  | { unit: 'days'; count: number; hours: number; calendarDays: number };

function parisWallClockAsUtcMs(nowMs: number): number {
  const wall = eventWallClockAt(nowMs);
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
}

function calendarDaysBetween(fromWallClockMs: number, toWallClockMs: number): number {
  const startOfDay = (wallClockMs: number) => Math.floor(wallClockMs / DAY_MS);
  return startOfDay(toWallClockMs) - startOfDay(fromWallClockMs);
}

export function eventCountdown(
  date: string | undefined,
  time: string | undefined,
  nowMs: number
): EventCountdown | null {
  if (!date || !time) return null;
  const startMs = eventScheduledStartUtcMs({ date, time });
  if (startMs === null) return null;

  const delta = startMs - nowMs;
  if (delta <= 0) return null;
  if (delta < MINUTE_MS) return { unit: 'imminent' };
  if (delta < HOUR_MS)
    return { unit: 'minutes', count: Math.min(59, Math.ceil(delta / MINUTE_MS)) };

  const startWallClockMs = Date.parse(`${date}T${time}:00Z`);
  const nowWallClockMs = parisWallClockAsUtcMs(nowMs);
  const wallClockDelta = startWallClockMs - nowWallClockMs;
  if (delta >= DAY_MS && wallClockDelta >= DAY_MS)
    return {
      unit: 'days',
      count: Math.floor(wallClockDelta / DAY_MS),
      hours: Math.floor((wallClockDelta % DAY_MS) / HOUR_MS),
      calendarDays: calendarDaysBetween(nowWallClockMs, startWallClockMs),
    };
  return { unit: 'hours', count: Math.floor(delta / HOUR_MS) };
}
