import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type EventCountdown =
  | { unit: 'imminent' }
  | { unit: 'minutes' | 'hours'; count: number }
  | { unit: 'days'; count: number; hours: number };

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
  if (delta >= DAY_MS)
    return {
      unit: 'days',
      count: Math.floor(delta / DAY_MS),
      hours: Math.floor((delta % DAY_MS) / HOUR_MS),
    };
  if (delta < MINUTE_MS) return { unit: 'imminent' };
  if (delta < HOUR_MS)
    return { unit: 'minutes', count: Math.min(59, Math.ceil(delta / MINUTE_MS)) };
  return { unit: 'hours', count: Math.floor(delta / HOUR_MS) };
}
