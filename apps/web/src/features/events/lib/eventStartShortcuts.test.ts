import { describe, expect, it } from 'vitest';
import {
  defaultEventStart,
  eventDateShortcuts,
  EVENT_TIME_SHORTCUTS,
} from '@/features/events/lib/eventStartShortcuts';

function parisInstant(iso: string): number {
  return new Date(iso).getTime();
}

describe('eventDateShortcuts', () => {
  it('offers tonight, tomorrow and the coming weekend on a Thursday', () => {
    expect(eventDateShortcuts('2026-11-12')).toEqual([
      { date: '2026-11-12', kind: 'tonight' },
      { date: '2026-11-13', kind: 'tomorrow' },
      { date: '2026-11-14', kind: 'day' },
      { date: '2026-11-15', kind: 'day' },
    ]);
  });

  it('keeps the Sunday and adds the Monday when tomorrow is already Saturday', () => {
    expect(eventDateShortcuts('2026-11-13').map((shortcut) => shortcut.date)).toEqual([
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
    ]);
  });

  it('falls back to the next two days on a Saturday, the weekend being already covered', () => {
    expect(eventDateShortcuts('2026-11-14').map((shortcut) => shortcut.date)).toEqual([
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
    ]);
  });

  it('reaches the end of the week from a Monday', () => {
    expect(eventDateShortcuts('2026-11-16').map((shortcut) => shortcut.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-21',
      '2026-11-22',
    ]);
  });

  it('crosses a month boundary', () => {
    expect(eventDateShortcuts('2026-11-30').map((shortcut) => shortcut.date)).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-05',
      '2026-12-06',
    ]);
  });
});

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

describe('EVENT_TIME_SHORTCUTS', () => {
  it('lists the usual evening start times', () => {
    expect(EVENT_TIME_SHORTCUTS).toEqual(['19:00', '20:00', '20:30', '21:00']);
  });
});
