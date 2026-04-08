import { describe, it, expect } from 'vitest';
import {
  computeEventStartReminder,
  eventScheduledStartUtcMs,
  EVENT_START_REMINDER_WINDOW_MINUTES,
  formatEventStartInUserTimezone,
} from './eventScheduled';

describe('eventScheduled', () => {
  it('eventScheduledStartUtcMs parse en UTC', () => {
    expect(eventScheduledStartUtcMs({ date: '2030-01-15', time: '18:30' })).toBe(
      Date.parse('2030-01-15T18:30:00Z')
    );
    expect(eventScheduledStartUtcMs({ date: '2030-06-01', time: 'not-a-time' })).toBeNull();
  });

  it('formatEventStartInUserTimezone utilise Intl (locale fixée)', () => {
    const s = formatEventStartInUserTimezone('2030-06-01', '20:00', 'fr-FR');
    expect(s).toMatch(/2030/);
    expect(s).toMatch(/20/);
    expect(s!.length).toBeGreaterThan(8);
  });

  it('computeEventStartReminder : masqué si terminé ou hors fenêtre', () => {
    const start = eventScheduledStartUtcMs({ date: '2030-12-01', time: '21:00' })!;
    expect(computeEventStartReminder('2030-12-01', '21:00', true, start - 60_000)).toEqual({
      visible: false,
    });
    expect(
      computeEventStartReminder('2030-12-01', '21:00', false, start - 45 * 60_000, {
        windowMinutes: 30,
      })
    ).toEqual({ visible: false });
    expect(computeEventStartReminder('2030-12-01', '21:00', false, start)).toEqual({
      visible: false,
    });
  });

  it('computeEventStartReminder : visible dans la fenêtre', () => {
    const start = eventScheduledStartUtcMs({ date: '2030-12-01', time: '21:00' })!;
    const now = start - 10 * 60_000;
    const r = computeEventStartReminder('2030-12-01', '21:00', false, now, {
      windowMinutes: EVENT_START_REMINDER_WINDOW_MINUTES,
    });
    expect(r.visible).toBe(true);
    if (r.visible) {
      expect(r.line1).toContain('10');
      expect(r.line2).toContain('Début prévu');
      expect(r.line2).toContain('appareil');
    }
  });

  it('computeEventStartReminder : moins d’une minute', () => {
    const start = eventScheduledStartUtcMs({ date: '2030-12-01', time: '21:00' })!;
    const r = computeEventStartReminder('2030-12-01', '21:00', false, start - 30_000);
    expect(r.visible).toBe(true);
    if (r.visible) expect(r.line1).toMatch(/moins d'une minute/i);
  });
});
