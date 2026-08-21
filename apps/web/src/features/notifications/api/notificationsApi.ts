import { fetchApi } from '@/shared/api/client';

export type NotificationTypeKey =
  | 'newfollower'
  | 'movieadded'
  | 'moviepicked'
  | 'participantjoined'
  | 'eventdeleted'
  | 'eventreminder1h'
  | 'eventreminder24h'
  | 'eventinvitation'
  | 'eventpending'
  | 'moviepickedmanually';

export interface NotificationTypePreference {
  type: NotificationTypeKey;
  enabled: boolean;
}

export interface NotificationPreferences {
  preferences: NotificationTypePreference[];
}

export interface UserNotificationItem {
  id: string;
  type: string;
  actorHandle: string | null;
  actorDisplayName: string | null;
  actorAvatarId: string | null;
  eventSlug: string | null;
  eventTitle: string | null;
  movieTitle: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationInbox {
  items: UserNotificationItem[];
  unreadCount: number;
  hasMore: boolean;
}

export async function fetchNotificationInbox(offset = 0): Promise<NotificationInbox> {
  const params = offset > 0 ? `?offset=${offset}` : '';
  return fetchApi<NotificationInbox>(`/notifications/inbox${params}`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetchApi('/notifications/inbox/read-all', { method: 'POST' });
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetchApi(`/notifications/inbox/${id}/read`, { method: 'POST' });
}

export async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetchApi<{ publicKey: string }>('/notifications/vapid-public-key');
  return res.publicKey;
}

export async function postPushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  const keys = subscription.keys as { p256dh: string; auth: string } | undefined;
  await fetchApi('/notifications/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: keys?.p256dh ?? '',
      auth: keys?.auth ?? '',
    }),
  });
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await fetchApi('/notifications/subscriptions', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  return fetchApi<NotificationPreferences>('/notifications/preferences');
}

export async function patchNotificationPreferences(
  patch: { type: NotificationTypeKey; enabled: boolean }[]
): Promise<NotificationPreferences> {
  return fetchApi<NotificationPreferences>('/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ preferences: patch }),
  });
}
