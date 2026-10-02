import { describe, it, expect, vi } from 'vitest';
import {
  eventScheduledStartUtcMs,
  eventWallClockAt,
  formatEventStartInUserTimezone,
} from '@/shared/utils/eventScheduled';

describe('eventScheduled', () => {
  it('eventScheduledStartUtcMs convertit depuis Europe/Paris (hiver, UTC+1)', () => {
    expect(eventScheduledStartUtcMs({ date: '2030-01-15', time: '18:30' })).toBe(
      Date.parse('2030-01-15T17:30:00Z')
    );
  });

  it('eventScheduledStartUtcMs converts from Europe/Paris (summer, UTC+2)', () => {
    expect(eventScheduledStartUtcMs({ date: '2030-06-01', time: '20:00' })).toBe(
      Date.parse('2030-06-01T18:00:00Z')
    );
  });

  it('keeps summer time for a night starting between 01:00 and 01:59 on the day summer time ends', () => {
    expect(eventScheduledStartUtcMs({ date: '2026-10-25', time: '01:30' })).toBe(
      Date.parse('2026-10-24T23:30:00Z')
    );
  });

  it('keeps winter time for a night starting between 01:00 and 01:59 on the day summer time starts', () => {
    expect(eventScheduledStartUtcMs({ date: '2026-03-29', time: '01:30' })).toBe(
      Date.parse('2026-03-29T00:30:00Z')
    );
  });

  it('reads the repeated hour of the autumn switch as winter time, like the API', () => {
    expect(eventScheduledStartUtcMs({ date: '2026-10-25', time: '02:30' })).toBe(
      Date.parse('2026-10-25T01:30:00Z')
    );
  });

  it('builds the Europe/Paris formatter at most once across repeated conversions', () => {
    const formatterSpy = vi.spyOn(Intl, 'DateTimeFormat');
    try {
      for (let minute = 0; minute < 10; minute += 1) {
        eventScheduledStartUtcMs({
          date: '2030-06-01',
          time: `20:${String(minute).padStart(2, '0')}`,
        });
        eventWallClockAt(Date.parse('2030-06-01T18:00:00Z') + minute * 60_000);
      }
      expect(formatterSpy.mock.calls.length).toBeLessThanOrEqual(1);
    } finally {
      formatterSpy.mockRestore();
    }
  });

  it('reads the same wall clock as a fresh formatter after the cache is warm', () => {
    eventWallClockAt(0);
    expect(eventWallClockAt(Date.parse('2026-10-25T00:30:00Z'))).toEqual({
      year: 2026,
      month: 10,
      day: 25,
      hour: 2,
      minute: 30,
      second: 0,
    });
    expect(eventWallClockAt(Date.parse('2026-10-25T01:30:00Z'))).toEqual({
      year: 2026,
      month: 10,
      day: 25,
      hour: 2,
      minute: 30,
      second: 0,
    });
  });

  it('eventScheduledStartUtcMs : heure invalide', () => {
    expect(eventScheduledStartUtcMs({ date: '2030-06-01', time: 'not-a-time' })).toBeNull();
  });

  it('formatEventStartInUserTimezone uses Intl (fixed locale)', () => {
    const s = formatEventStartInUserTimezone('2030-06-01', '20:00', 'fr-FR');
    expect(s).toMatch(/2030/);
    expect(s).toMatch(/20/);
    expect(s!.length).toBeGreaterThan(8);
  });

  it('formatEventStartInUserTimezone: French by default (without a 3rd argument)', () => {
    const s = formatEventStartInUserTimezone('2030-06-01', '20:00');
    expect(s).toMatch(/juin/i);
    expect(s).toMatch(/2030/);
  });
});
