import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  deletePushSubscription,
  fetchVapidPublicKey,
  postPushSubscription,
} from '@/features/notifications/api/notificationsApi';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import { LocaleProvider } from '@/shared/i18n';

const renderPushHook = () => renderHook(() => usePushNotifications(), { wrapper: LocaleProvider });

vi.mock('@/features/notifications/api/notificationsApi', () => ({
  fetchVapidPublicKey: vi.fn(),
  postPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
}));

const mockFetchKey = vi.mocked(fetchVapidPublicKey);
const mockPost = vi.mocked(postPushSubscription);
const mockDelete = vi.mocked(deletePushSubscription);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('usePushNotifications (unsupported)', () => {
  it('reports unsupported and no-ops subscribe', async () => {
    const { result } = renderPushHook();

    expect(result.current.supported).toBe(false);
    expect(result.current.permission).toBe('unsupported');
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockFetchKey).not.toHaveBeenCalled();
  });
});

describe('usePushNotifications (supported)', () => {
  let getSubscription: ReturnType<typeof vi.fn>;
  let pmSubscribe: ReturnType<typeof vi.fn>;
  let requestPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSubscription = vi.fn().mockResolvedValue(null);
    pmSubscribe = vi.fn();
    requestPermission = vi.fn();
    const reg = { pushManager: { getSubscription, subscribe: pmSubscribe } };
    vi.stubGlobal('navigator', {
      userAgent: 'test',
      serviceWorker: { ready: Promise.resolve(reg) },
    });
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
  });

  it('detects an existing subscription on mount', async () => {
    getSubscription.mockResolvedValue({ endpoint: 'https://push/x' });

    const { result } = renderPushHook();

    expect(result.current.supported).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscribed).toBe(true);
  });

  it('reports not subscribed when none exists', async () => {
    const { result } = renderPushHook();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscribed).toBe(false);
  });

  it('subscribe() requests permission and posts the subscription', async () => {
    requestPermission.mockResolvedValue('granted');
    mockFetchKey.mockResolvedValue('dGVzdA');
    const subJson = { endpoint: 'https://push/x', keys: { p256dh: 'k', auth: 'a' } };
    pmSubscribe.mockResolvedValue({ toJSON: () => subJson });
    mockPost.mockResolvedValue(undefined);

    const { result } = renderPushHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(mockFetchKey).toHaveBeenCalledOnce();
    expect(pmSubscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(mockPost).toHaveBeenCalledWith(subJson);
    expect(result.current.permission).toBe('granted');
    expect(result.current.subscribed).toBe(true);
  });

  it('subscribe() stops when permission is denied', async () => {
    requestPermission.mockResolvedValue('denied');

    const { result } = renderPushHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.permission).toBe('denied');
    expect(mockFetchKey).not.toHaveBeenCalled();
    expect(result.current.subscribed).toBe(false);
  });

  it('unsubscribe() deletes the subscription server-side and locally', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    getSubscription.mockResolvedValue({ endpoint: 'https://push/x', unsubscribe });
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderPushHook();
    await waitFor(() => expect(result.current.subscribed).toBe(true));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockDelete).toHaveBeenCalledWith('https://push/x');
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(result.current.subscribed).toBe(false);
  });
});
