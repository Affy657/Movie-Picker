import { describe, expect, it } from 'vitest';
import { groupInboxItems } from './groupInboxItems';
import type { UserNotificationItem } from '@/features/notifications/api/notificationsApi';

function item(overrides: Partial<UserNotificationItem>): UserNotificationItem {
  return {
    id: 'id',
    type: 'movieadded',
    actorHandle: null,
    actorDisplayName: null,
    actorAvatarId: null,
    eventSlug: null,
    eventTitle: null,
    movieTitle: null,
    isRead: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('groupInboxItems', () => {
  it('groups two or more items sharing the same event into one event group', () => {
    const items = [
      item({ id: 'a', eventSlug: 's1', eventTitle: 'Soiree', createdAt: '2026-01-02T00:00:00Z' }),
      item({ id: 'b', eventSlug: 's1', eventTitle: 'Soiree', createdAt: '2026-01-01T00:00:00Z' }),
    ];

    const groups = groupInboxItems(items);

    expect(groups).toHaveLength(1);
    const [group] = groups;
    expect(group).toMatchObject({ kind: 'event', eventSlug: 's1', items: expect.any(Array) });
    if (group?.kind === 'event') {
      expect(group.items).toHaveLength(2);
      expect(group.latestCreatedAt).toBe('2026-01-02T00:00:00Z');
    }
  });

  it('keeps a lone event item as a single, not a group', () => {
    const items = [item({ id: 'a', eventSlug: 's1', eventTitle: 'Soiree' })];

    const groups = groupInboxItems(items);

    expect(groups).toEqual([{ kind: 'single', item: items[0], supersededIds: [] }]);
  });

  it('never groups newfollower or eventinvitation even with a matching eventSlug', () => {
    const items = [
      item({ id: 'a', type: 'eventinvitation', eventSlug: 's1', eventTitle: 'Soiree' }),
      item({ id: 'b', type: 'eventinvitation', eventSlug: 's1', eventTitle: 'Soiree' }),
      item({ id: 'c', type: 'newfollower', eventSlug: null }),
    ];

    const groups = groupInboxItems(items);

    expect(groups.every((g) => g.kind === 'single')).toBe(true);
    expect(groups).toHaveLength(3);
  });

  it('orders groups and singles by most recent activity, descending', () => {
    const items = [
      item({ id: 'old-single', createdAt: '2026-01-01T00:00:00Z', eventSlug: null }),
      item({ id: 'a', eventSlug: 's1', eventTitle: 'Soiree A', createdAt: '2026-01-05T00:00:00Z' }),
      item({ id: 'b', eventSlug: 's1', eventTitle: 'Soiree A', createdAt: '2026-01-04T00:00:00Z' }),
      item({ id: 'recent-single', createdAt: '2026-01-06T00:00:00Z', eventSlug: null }),
    ];

    const groups = groupInboxItems(items);

    const ids = groups.map((g) => (g.kind === 'single' ? g.item.id : 'group:' + g.eventSlug));
    expect(ids).toEqual(['recent-single', 'group:s1', 'old-single']);
  });

  it('ne garde que la derniere synchro Letterboxd et rattache les precedentes', () => {
    const items = [
      item({
        id: 'lb-recent',
        type: 'letterboxdreconciliationpending',
        createdAt: '2026-01-05T00:00:00Z',
      }),
      item({
        id: 'lb-old',
        type: 'letterboxdreconciliationpending',
        createdAt: '2026-01-03T00:00:00Z',
      }),
      item({
        id: 'lb-older',
        type: 'letterboxdreconciliationpending',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    ];

    const groups = groupInboxItems(items);

    expect(groups).toHaveLength(1);
    const [group] = groups;
    expect(group).toMatchObject({ kind: 'single' });
    if (group?.kind === 'single') {
      expect(group.item.id).toBe('lb-recent');
      expect(group.supersededIds).toEqual(['lb-old', 'lb-older']);
    }
  });

  it('groups items from different events independently', () => {
    const items = [
      item({ id: 'a1', eventSlug: 's1', eventTitle: 'A', createdAt: '2026-01-01T00:00:00Z' }),
      item({ id: 'b1', eventSlug: 's2', eventTitle: 'B', createdAt: '2026-01-02T00:00:00Z' }),
      item({ id: 'a2', eventSlug: 's1', eventTitle: 'A', createdAt: '2026-01-03T00:00:00Z' }),
      item({ id: 'b2', eventSlug: 's2', eventTitle: 'B', createdAt: '2026-01-04T00:00:00Z' }),
    ];

    const groups = groupInboxItems(items);

    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.kind === 'event')).toBe(true);
  });
});
