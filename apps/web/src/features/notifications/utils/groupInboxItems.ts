import type { UserNotificationItem } from '@/features/notifications/api/notificationsApi';

const UNGROUPABLE_TYPES = new Set(['newfollower', 'eventinvitation']);

const STANDING_TASK_TYPES = new Set(['letterboxdreconciliationpending']);

export type InboxGroup =
  | {
      kind: 'event';
      eventSlug: string;
      eventTitle: string;
      items: UserNotificationItem[];
      latestCreatedAt: string;
    }
  | { kind: 'single'; item: UserNotificationItem; supersededIds: string[] };

function groupLatestCreatedAt(group: InboxGroup): string {
  return group.kind === 'event' ? group.latestCreatedAt : group.item.createdAt;
}

function keepLatestStandingTask(items: UserNotificationItem[]): {
  visible: UserNotificationItem[];
  supersededByItemId: Map<string, string[]>;
} {
  const latestPerType = new Map<string, UserNotificationItem>();
  for (const item of items) {
    if (!STANDING_TASK_TYPES.has(item.type)) continue;
    const current = latestPerType.get(item.type);
    if (!current || item.createdAt > current.createdAt) latestPerType.set(item.type, item);
  }

  const supersededByItemId = new Map<string, string[]>();
  const visible: UserNotificationItem[] = [];
  for (const item of items) {
    if (!STANDING_TASK_TYPES.has(item.type)) {
      visible.push(item);
      continue;
    }
    const latest = latestPerType.get(item.type);
    if (latest?.id === item.id) {
      visible.push(item);
      continue;
    }
    if (!latest) continue;
    const superseded = supersededByItemId.get(latest.id) ?? [];
    superseded.push(item.id);
    supersededByItemId.set(latest.id, superseded);
  }

  return { visible, supersededByItemId };
}

export function groupInboxItems(items: UserNotificationItem[]): InboxGroup[] {
  const { visible, supersededByItemId } = keepLatestStandingTask(items);
  const buckets = new Map<string, UserNotificationItem[]>();
  const singles: UserNotificationItem[] = [];

  for (const item of visible) {
    if (UNGROUPABLE_TYPES.has(item.type) || STANDING_TASK_TYPES.has(item.type) || !item.eventSlug) {
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
    groups.push({
      kind: 'single',
      item,
      supersededIds: supersededByItemId.get(item.id) ?? [],
    });
  }

  return groups.sort((a, b) => groupLatestCreatedAt(b).localeCompare(groupLatestCreatedAt(a)));
}
