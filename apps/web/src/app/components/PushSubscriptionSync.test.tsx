import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PushSubscriptionSync from '@/app/components/PushSubscriptionSync';
import {
  deletePushSubscription,
  fetchVapidPublicKey,
  postPushSubscription,
} from '@/features/notifications/api/notificationsApi';
import { currentBrowserPushRegistration } from '@/shared/utils/browserPushSubscription';

vi.mock('@/features/notifications/api/notificationsApi', () => ({
  postPushSubscription: vi.fn(() => Promise.resolve()),
  deletePushSubscription: vi.fn(() => Promise.resolve()),
  fetchVapidPublicKey: vi.fn(),
}));
vi.mock('@/shared/utils/browserPushSubscription', () => ({
  currentBrowserPushRegistration: vi.fn(),
}));

const useAuth = vi.fn();
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuth(),
}));

const subscriptionJson = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'key', auth: 'auth' },
};

function keyBytes(text: string): ArrayBuffer {
  return Uint8Array.from(text, (char) => char.charCodeAt(0)).buffer;
}

function base64Url(text: string): string {
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

describe('PushSubscriptionSync', () => {
  let getSubscription: ReturnType<typeof vi.fn>;
  let subscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('Notification', { permission: 'granted' });
    getSubscription = vi.fn().mockResolvedValue({
      endpoint: subscriptionJson.endpoint,
      toJSON: () => subscriptionJson,
    });
    subscribe = vi.fn();
    vi.mocked(currentBrowserPushRegistration).mockResolvedValue({
      pushManager: { getSubscription, subscribe },
    } as unknown as ServiceWorkerRegistration);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers this browser subscription again for the signed-in account', async () => {
    useAuth.mockReturnValue({ user: { userId: 'u1' } });

    render(<PushSubscriptionSync />);

    await vi.waitFor(() => expect(postPushSubscription).toHaveBeenCalledWith(subscriptionJson));
  });

  it('sends nothing while nobody is signed in', async () => {
    useAuth.mockReturnValue({ user: null });

    render(<PushSubscriptionSync />);
    await Promise.resolve();

    expect(currentBrowserPushRegistration).not.toHaveBeenCalled();
    expect(postPushSubscription).not.toHaveBeenCalled();
  });

  it('sends nothing when the notification permission is not granted', async () => {
    vi.stubGlobal('Notification', { permission: 'default' });
    useAuth.mockReturnValue({ user: { userId: 'u1' } });

    render(<PushSubscriptionSync />);
    await Promise.resolve();

    expect(postPushSubscription).not.toHaveBeenCalled();
  });

  it('sends nothing when this browser holds no subscription', async () => {
    getSubscription.mockResolvedValue(null);
    useAuth.mockReturnValue({ user: { userId: 'u1' } });

    render(<PushSubscriptionSync />);
    await vi.waitFor(() => expect(getSubscription).toHaveBeenCalled());

    expect(postPushSubscription).not.toHaveBeenCalled();
  });

  it('renews a subscription made with a rotated server key and registers only the new one', async () => {
    const unsubscribeStale = vi.fn().mockResolvedValue(true);
    getSubscription.mockResolvedValue({
      endpoint: 'https://push/stale',
      options: { applicationServerKey: keyBytes('old-server-key') },
      unsubscribe: unsubscribeStale,
      toJSON: () => ({ endpoint: 'https://push/stale' }),
    });
    vi.mocked(fetchVapidPublicKey).mockResolvedValue(base64Url('new-server-key'));
    const renewedJson = { endpoint: 'https://push/renewed', keys: { p256dh: 'k', auth: 'a' } };
    subscribe.mockResolvedValue({ endpoint: 'https://push/renewed', toJSON: () => renewedJson });
    useAuth.mockReturnValue({ user: { userId: 'u1' } });

    render(<PushSubscriptionSync />);

    await vi.waitFor(() => expect(postPushSubscription).toHaveBeenCalledWith(renewedJson));
    expect(postPushSubscription).toHaveBeenCalledTimes(1);
    expect(unsubscribeStale).toHaveBeenCalledOnce();
    expect(deletePushSubscription).toHaveBeenCalledWith('https://push/stale');
  });
});
