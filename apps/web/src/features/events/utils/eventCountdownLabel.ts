import type { Translate, TranslationKey } from '@/shared/i18n';
import { eventCountdown, type EventCountdown } from '@/shared/utils/eventCountdown';

const DAYS_WITHOUT_HOURS = 7;

const COUNTDOWN_KEYS = {
  imminent: 'events.detail.countdownImminent',
  minutes: 'events.detail.countdownMinutes',
  hours: 'events.detail.countdownHours',
  days: 'events.detail.countdownDays',
} as const satisfies Record<EventCountdown['unit'], TranslationKey>;

function countdownParams(countdown: EventCountdown): Record<string, string | number> | undefined {
  if (countdown.unit === 'imminent') return undefined;
  if (countdown.unit === 'days')
    return { count: countdown.count, hours: String(countdown.hours).padStart(2, '0') };
  return { count: countdown.count };
}

export function eventCountdownLabel(
  date: string | undefined,
  time: string | undefined,
  nowMs: number,
  t: Translate,
  { daysOnly = false }: { daysOnly?: boolean } = {}
): string | null {
  const countdown = eventCountdown(date, time, nowMs);
  if (!countdown) return null;
  if (countdown.unit === 'days' && (daysOnly || countdown.calendarDays >= DAYS_WITHOUT_HOURS))
    return t('events.detail.countdownDaysOnly', { count: countdown.calendarDays });
  return t(COUNTDOWN_KEYS[countdown.unit], countdownParams(countdown));
}
