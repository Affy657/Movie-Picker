import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  deletePushSubscription,
  fetchNotificationInbox,
  fetchNotificationPreferences,
  fetchVapidPublicKey,
  markAllNotificationsRead,
  patchNotificationPreferences,
  postPushSubscription,
} from '@/features/notifications/api/notificationsApi';

vi.mock('@/shared/api/client', () => ({ fetchApi: vi.fn() }));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('notificationsApi', () => {
  it('fetchNotificationInbox reads the inbox endpoint', async () => {
    const inbox = { items: [], unreadCount: 0 };
    mockFetchApi.mockResolvedValue(inbox);

    await expect(fetchNotificationInbox()).resolves.toBe(inbox);
    expect(mockFetchApi).toHaveBeenCalledWith('/notifications/inbox');
  });

  it('markAllNotificationsRead posts to the read-all endpoint', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await markAllNotificationsRead();

    expect(mockFetchApi).toHaveBeenCalledWith('/notifications/inbox/read-all', { method: 'POST' });
  });

  it('fetchVapidPublicKey unwraps the publicKey field', async () => {
    mockFetchApi.mockResolvedValue({ publicKey: 'PUB-KEY' });

    await expect(fetchVapidPublicKey()).resolves.toBe('PUB-KEY');
    expect(mockFetchApi).toHaveBeenCalledWith('/notifications/vapid-public-key');
  });

  it('postPushSubscription sends endpoint and keys', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await postPushSubscription({
      endpoint: 'https://push/x',
      keys: { p256dh: 'k', auth: 'a' },
    } as PushSubscriptionJSON);

    expect(mockFetchApi).toHaveBeenCalledWith('/notifications/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push/x', p256dh: 'k', auth: 'a' }),
    });
  });

  it('postPushSubscription falls back to empty keys when absent', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await postPushSubscription({ endpoint: 'https://push/x' } as PushSubscriptionJSON);

    expect(mockFetchApi).toHaveBeenCalledWith('/notifications/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push/x', p256dh: '', auth: '' }),
    });
  });

  it('deletePushSubscription sends the endpoint in the body', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await deletePushSubscription('https://push/x');

    expect(mockFetchApi).toHaveBeenCalledWith('/notifications/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: 'https://push/x' }),
    });
  });

  it('fetchNotificationPreferences reads the preferences endpoint', async () => {
    const prefs = { notifyOnMovieAdded: true };
    mockFetchApi.mockResolvedValue(prefs);

    await expect(fetchNotificationPreferences()).resolves.toBe(prefs);
    expect(mockFetchApi).toHaveBeenCalledWith('/notifications/preferences');
  });

  it('patchNotificationPreferences sends the patch body', async () => {
    const updated = { notifyOnMovieAdded: false };
    mockFetchApi.mockResolvedValue(updated);

    await expect(patchNotificationPreferences({ notifyOnMovieAdded: false })).resolves.toBe(
      updated
    );
    expect(mockFetchApi).toHaveBeenCalledWith('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ notifyOnMovieAdded: false }),
    });
  });
});
