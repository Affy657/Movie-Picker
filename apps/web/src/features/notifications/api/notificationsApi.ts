import { fetchApi } from '@/shared/api/client';

export interface NotificationPreferences {
  notifyOnParticipantJoined: boolean;
  notifyEventReminder: boolean;
  notifyOnMovieAdded: boolean;
  notifyOnMoviePicked: boolean;
  notifyOnEventDeleted: boolean;
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
