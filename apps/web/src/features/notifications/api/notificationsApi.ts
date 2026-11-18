import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';

export type NotificationTypePreference = ApiSchemas['NotificationTypePreference'];

export type NotificationTypeKey = NotificationTypePreference['type'];

export type NotificationPreferences = ApiSchemas['NotificationPreferencesResponse'];

export type UserNotificationItem = ApiSchemas['UserNotificationItem'];

export type NotificationInbox = ApiSchemas['NotificationInboxResponse'];

export type NotificationUnreadCount = ApiSchemas['NotificationUnreadCountResponse'];

export async function fetchNotificationUnreadCount(): Promise<NotificationUnreadCount> {
  return fetchApi<NotificationUnreadCount>('/notifications/inbox/unread-count');
}

export async function fetchNotificationInbox(offset = 0): Promise<NotificationInbox> {
  const params: '' | `?${string}` = offset > 0 ? `?offset=${offset}` : '';
  return fetchApi<NotificationInbox>(`/notifications/inbox${params}`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetchApi('/notifications/inbox/read-all', { method: 'POST' });
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetchApi(apiPath('notifications', 'inbox', id, 'read'), { method: 'POST' });
}

export async function acceptListInvitation(listId: string): Promise<void> {
  await fetchApi(apiPath('lists', listId, 'invitation', 'accept'), { method: 'POST' });
}

export async function declineListInvitation(listId: string): Promise<void> {
  await fetchApi(apiPath('lists', listId, 'invitation', 'decline'), { method: 'POST' });
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
