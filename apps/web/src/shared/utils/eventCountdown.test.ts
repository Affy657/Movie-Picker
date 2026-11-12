import { describe, it, expect } from 'vitest';
import { eventCountdown } from '@/shared/utils/eventCountdown';
import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';

const START = eventScheduledStartUtcMs({ date: '2026-08-19', time: '19:00' })!;

describe('eventCountdown', () => {
  it('renvoie null si la date ou l’heure manque', () => {
    expect(eventCountdown(undefined, '19:00', START)).toBeNull();
    expect(eventCountdown('2026-08-19', undefined, START)).toBeNull();
  });

  it('renvoie null si la date est invalide', () => {
    expect(eventCountdown('pas-une-date', '19:00', START)).toBeNull();
  });

  it('returns null when the start is past or reached', () => {
    expect(eventCountdown('2026-08-19', '19:00', START)).toBeNull();
    expect(eventCountdown('2026-08-19', '19:00', START + 60_000)).toBeNull();
  });

  it('flags an imminent start under the minute', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 30_000)).toEqual({ unit: 'imminent' });
  });

  it('rounds the minutes up', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 90_000)).toEqual({
      unit: 'minutes',
      count: 2,
    });
  });

  it('switches to hours beyond one hour', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 22 * 3_600_000 - 400_000)).toEqual({
      unit: 'hours',
      count: 22,
    });
  });

  it('counts days and hours beyond the 24 h window', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 86_400_000)).toEqual({
      unit: 'days',
      count: 1,
      hours: 0,
      calendarDays: 1,
    });
    expect(
      eventCountdown('2026-08-19', '19:00', START - 2 * 86_400_000 - 6 * 3_600_000 - 400_000)
    ).toEqual({ unit: 'days', count: 2, hours: 6, calendarDays: 2 });
  });

  it('counts the calendar days of Paris, not slices of 24 h', () => {
    const thursdayNight = eventScheduledStartUtcMs({ date: '2026-11-12', time: '21:00' })!;
    expect(eventCountdown('2026-11-14', '20:00', thursdayNight)).toEqual({
      unit: 'days',
      count: 1,
      hours: 23,
      calendarDays: 2,
    });
  });

  it('keeps a whole day across the autumn clock change', () => {
    const saturdayNight = eventScheduledStartUtcMs({ date: '2026-10-24', time: '20:00' })!;
    expect(eventCountdown('2026-10-25', '20:00', saturdayNight)).toEqual({
      unit: 'days',
      count: 1,
      hours: 0,
      calendarDays: 1,
    });
  });

  it('affiche encore les heures juste sous les 24 h', () => {
    expect(eventCountdown('2026-08-19', '19:00', START - 86_400_000 + 60_000)).toEqual({
      unit: 'hours',
      count: 23,
    });
  });
});
