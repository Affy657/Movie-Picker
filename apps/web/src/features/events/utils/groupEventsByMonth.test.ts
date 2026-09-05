import { describe, expect, it } from 'vitest';
import { groupEventsByMonth } from './groupEventsByMonth';
import type { MyEventSummary } from '@/features/events/types';

function event(overrides: Partial<MyEventSummary>): MyEventSummary {
  return {
    id: overrides.id ?? 'e',
    slug: overrides.slug ?? 'e',
    title: overrides.title ?? 'Titre',
    date: '2026-06-01',
    time: '20:00',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isCreator: false,
    isParticipant: true,
    ...overrides,
  };
}

describe('groupEventsByMonth', () => {
  it('groups events sharing a month under a single label', () => {
    const events = [
      event({ id: 'a', date: '2026-08-12' }),
      event({ id: 'b', date: '2026-08-01' }),
      event({ id: 'c', date: '2026-06-18' }),
    ];

    const groups = groupEventsByMonth(events, 'fr');

    expect(groups).toHaveLength(2);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups[0]!.label.toLowerCase()).toContain('août');
    expect(groups[1]!.events.map((e) => e.id)).toEqual(['c']);
    expect(groups[1]!.label.toLowerCase()).toContain('juin');
  });

  it('preserves input order without resorting', () => {
    const events = [event({ id: 'a', date: '2026-06-01' }), event({ id: 'b', date: '2026-08-01' })];

    const groups = groupEventsByMonth(events, 'fr');

    expect(groups.map((g) => g.events[0]!.id)).toEqual(['a', 'b']);
  });

  it('merges non-contiguous events sharing a month under the same group', () => {
    const events = [
      event({ id: 'a', date: '2026-08-01' }),
      event({ id: 'b', date: '2026-06-01' }),
      event({ id: 'c', date: '2026-08-15' }),
    ];

    const groups = groupEventsByMonth(events, 'fr');

    expect(groups).toHaveLength(2);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('formats the label in English', () => {
    const groups = groupEventsByMonth([event({ date: '2026-08-01' })], 'en');
    expect(groups[0]!.label).toContain('2026');
    expect(groups[0]!.label.toLowerCase()).toContain('august');
  });
});
