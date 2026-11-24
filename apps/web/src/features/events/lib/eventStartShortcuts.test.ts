import { describe, expect, it } from 'vitest';
import { defaultEventStart } from '@/features/events/lib/eventStartShortcuts';

function parisInstant(iso: string): number {
  return new Date(iso).getTime();
}

describe('defaultEventStart', () => {
  it('starts at 20:00 the same evening before 20:00 in Paris', () => {
    expect(defaultEventStart(parisInstant('2026-11-12T10:05:00+01:00'))).toEqual({
      date: '2026-11-12',
      time: '20:00',
    });
  });

  it('starts at the next half hour once 20:00 has passed', () => {
    expect(defaultEventStart(parisInstant('2026-11-12T20:30:00+01:00'))).toEqual({
      date: '2026-11-12',
      time: '21:00',
    });
  });

  it('starts tomorrow at midnight when it is 23:30 in Paris', () => {
    expect(defaultEventStart(parisInstant('2026-11-12T23:30:00+01:00'))).toEqual({
      date: '2026-11-13',
      time: '00:00',
    });
  });
});
