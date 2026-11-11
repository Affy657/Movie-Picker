import { describe, it, expect } from 'vitest';
import type { MyEventSummary } from '@/features/events/types';
import { pickNextEvent } from './nextEvent';

function event(overrides: Partial<MyEventSummary>): MyEventSummary {
  return {
    id: overrides.slug ?? 'e',
    slug: 'e',
    title: 'Soirée',
    date: '2026-11-20',
    time: '20:30',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    isCreator: false,
    isParticipant: true,
    lifecycle: 'upcoming',
    ...overrides,
  };
}

describe('pickNextEvent', () => {
  it('returns null without any event', () => {
    expect(pickNextEvent([])).toBeNull();
  });

  it('picks the nearest upcoming night, whatever the list order', () => {
    const later = event({ slug: 'later', date: '2026-11-28' });
    const sooner = event({ slug: 'sooner', date: '2026-11-14' });

    expect(pickNextEvent([later, sooner])?.slug).toBe('sooner');
  });

  it('breaks a same-day tie on the time', () => {
    const late = event({ slug: 'late', date: '2026-11-14', time: '22:00' });
    const early = event({ slug: 'early', date: '2026-11-14', time: '18:00' });

    expect(pickNextEvent([late, early])?.slug).toBe('early');
  });

  it('prefers a night in progress over an upcoming one', () => {
    const upcoming = event({ slug: 'upcoming', date: '2026-11-12' });
    const live = event({ slug: 'live', date: '2026-11-11', lifecycle: 'live' });

    expect(pickNextEvent([upcoming, live])?.slug).toBe('live');
  });

  it('counts the nights the user hosts as well as the ones they joined', () => {
    const hosted = event({ slug: 'hosted', isCreator: true, isParticipant: false });

    expect(pickNextEvent([hosted])?.slug).toBe('hosted');
  });

  it('skips a pending night and a finished one', () => {
    const pending = event({ slug: 'pending', lifecycle: 'pending', date: '2026-11-01' });
    const finished = event({ slug: 'finished', lifecycle: 'finished', date: '2026-11-02' });

    expect(pickNextEvent([pending, finished])).toBeNull();
  });
});
