import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';
import { eventCountdownLabel } from './eventCountdownLabel';

const START = eventScheduledStartUtcMs({ date: '2026-08-19', time: '19:00' })!;
const HOUR = 3_600_000;
const t = (key: string, vars?: Record<string, string | number>) =>
  `${key}${vars ? JSON.stringify(vars) : ''}`;

function pinParisClock(date: string, time: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(eventScheduledStartUtcMs({ date, time })!);
}

describe('eventCountdownLabel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts days and hours within the week', () => {
    expect(eventCountdownLabel('2026-08-19', '19:00', START - 54 * HOUR, t)).toBe(
      'events.detail.countdownDays{"count":2,"hours":"06"}'
    );
  });

  it('drops the hours beyond a week', () => {
    expect(eventCountdownLabel('2026-08-19', '19:00', START - 8 * 24 * HOUR - 5 * HOUR, t)).toBe(
      'events.detail.countdownDaysOnly{"count":8}'
    );
  });

  it('drops the hours on demand', () => {
    expect(
      eventCountdownLabel('2026-08-19', '19:00', START - 54 * HOUR, t, { daysOnly: true })
    ).toBe('events.detail.countdownDaysOnly{"count":2}');
  });

  it('says nothing once the night started', () => {
    expect(eventCountdownLabel('2026-08-19', '19:00', START + HOUR, t)).toBeNull();
  });

  it('counts the days of the Paris calendar once the hours are dropped', () => {
    pinParisClock('2026-11-12', '21:00');

    expect(eventCountdownLabel('2026-11-14', '20:00', Date.now(), t, { daysOnly: true })).toBe(
      'events.detail.countdownDaysOnly{"count":2}'
    );
    expect(eventCountdownLabel('2026-11-14', '20:00', Date.now(), t)).toBe(
      'events.detail.countdownDays{"count":1,"hours":"23"}'
    );
  });

  it('keeps a night the next day at the same time one whole day away across the clock change', () => {
    pinParisClock('2026-10-24', '20:00');

    expect(eventCountdownLabel('2026-10-25', '20:00', Date.now(), t)).toBe(
      'events.detail.countdownDays{"count":1,"hours":"00"}'
    );
    expect(eventCountdownLabel('2026-10-25', '20:00', Date.now(), t, { daysOnly: true })).toBe(
      'events.detail.countdownDaysOnly{"count":1}'
    );
  });
});
