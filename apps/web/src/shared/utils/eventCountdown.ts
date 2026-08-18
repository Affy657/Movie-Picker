import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const COUNTDOWN_WINDOW_MS = 24 * HOUR_MS;

export type EventCountdown = { unit: 'imminent' } | { unit: 'minutes' | 'hours'; count: number };

export function eventCountdown(
  date: string | undefined,
  time: string | undefined,
  nowMs: number
): EventCountdown | null {
  if (!date || !time) return null;
  const startMs = eventScheduledStartUtcMs({ date, time });
  if (startMs === null) return null;

  const delta = startMs - nowMs;
  if (delta <= 0 || delta >= COUNTDOWN_WINDOW_MS) return null;
  if (delta < MINUTE_MS) return { unit: 'imminent' };
  if (delta < HOUR_MS)
    return { unit: 'minutes', count: Math.min(59, Math.ceil(delta / MINUTE_MS)) };
  return { unit: 'hours', count: Math.floor(delta / HOUR_MS) };
}
