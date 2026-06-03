import { fetchApi } from '@/shared/api/client';

export interface NotificationPreferences {
  notifyOnParticipantJoined: boolean;
  notifyEventReminder: boolean;
  notifyOnMovieAdded: boolean;
  notifyOnMoviePicked: boolean;
  notifyOnEventDeleted: boolean;
  notifyOnNewFollower: boolean;
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
}

export async function fetchNotificationInbox(): Promise<NotificationInbox> {
  return fetchApi<NotificationInbox>('/notifications/inbox');
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetchApi('/notifications/inbox/read-all', { method: 'POST' });
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
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return fetchApi<NotificationPreferences>('/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
