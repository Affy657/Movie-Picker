import type { UserNotificationItem } from '@/features/notifications/api/notificationsApi';

const UNGROUPABLE_TYPES = new Set(['newfollower', 'eventinvitation']);

export type InboxGroup =
  | {
      kind: 'event';
      eventSlug: string;
      eventTitle: string;
      items: UserNotificationItem[];
      latestCreatedAt: string;
    }
  | { kind: 'single'; item: UserNotificationItem };

function groupLatestCreatedAt(group: InboxGroup): string {
  return group.kind === 'event' ? group.latestCreatedAt : group.item.createdAt;
}

export function groupInboxItems(items: UserNotificationItem[]): InboxGroup[] {
  const buckets = new Map<string, UserNotificationItem[]>();
  const singles: UserNotificationItem[] = [];

  for (const item of items) {
    if (UNGROUPABLE_TYPES.has(item.type) || !item.eventSlug) {
      singles.push(item);
      continue;
    }
    const bucket = buckets.get(item.eventSlug);
    if (bucket) bucket.push(item);
    else buckets.set(item.eventSlug, [item]);
  }

  const groups: InboxGroup[] = [];
  for (const [eventSlug, bucketItems] of buckets) {
    const [first, ...rest] = bucketItems;
    if (!first || rest.length === 0) {
      singles.push(...bucketItems);
      continue;
    }
    groups.push({
      kind: 'event',
      eventSlug,
      eventTitle: first.eventTitle ?? '',
      items: bucketItems,
      latestCreatedAt: bucketItems.reduce(
        (max, i) => (i.createdAt > max ? i.createdAt : max),
        first.createdAt
      ),
    });
  }

  for (const item of singles) {
    groups.push({ kind: 'single', item });
  }

  return groups.sort((a, b) => groupLatestCreatedAt(b).localeCompare(groupLatestCreatedAt(a)));
}
