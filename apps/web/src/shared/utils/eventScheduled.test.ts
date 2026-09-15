import { describe, it, expect } from 'vitest';
import {
  eventScheduledStartUtcMs,
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
