import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PushSubscriptionSync from '@/app/components/PushSubscriptionSync';
import { postPushSubscription } from '@/features/notifications/api/notificationsApi';
import { currentBrowserPushSubscription } from '@/shared/utils/browserPushSubscription';

vi.mock('@/features/notifications/api/notificationsApi', () => ({
  postPushSubscription: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/shared/utils/browserPushSubscription', () => ({
  currentBrowserPushSubscription: vi.fn(),
}));

const useAuth = vi.fn();
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuth(),
}));

const subscriptionJson = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'key', auth: 'auth' },
};

describe('PushSubscriptionSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('Notification', { permission: 'granted' });
    vi.mocked(currentBrowserPushSubscription).mockResolvedValue({
      toJSON: () => subscriptionJson,
    } as unknown as PushSubscription);
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

    expect(currentBrowserPushSubscription).not.toHaveBeenCalled();
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
    vi.mocked(currentBrowserPushSubscription).mockResolvedValue(null);
    useAuth.mockReturnValue({ user: { userId: 'u1' } });

    render(<PushSubscriptionSync />);
    await vi.waitFor(() => expect(currentBrowserPushSubscription).toHaveBeenCalled());

    expect(postPushSubscription).not.toHaveBeenCalled();
  });
});
