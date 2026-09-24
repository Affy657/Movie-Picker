import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  deletePushSubscription,
  fetchVapidPublicKey,
  postPushSubscription,
} from '@/features/notifications/api/notificationsApi';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import { LocaleProvider } from '@/shared/i18n';
import { ApiError } from '@/shared/api/apiError';

const renderPushHook = () => renderHook(() => usePushNotifications(), { wrapper: LocaleProvider });

vi.mock('@/features/notifications/api/notificationsApi', () => ({
  fetchVapidPublicKey: vi.fn(),
  postPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
}));

const mockFetchKey = vi.mocked(fetchVapidPublicKey);
const mockPost = vi.mocked(postPushSubscription);
const mockDelete = vi.mocked(deletePushSubscription);

function keyBytes(text: string): ArrayBuffer {
  return Uint8Array.from(text, (char) => char.charCodeAt(0)).buffer;
}

function base64Url(text: string): string {
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function browserPushError(message: string, name: string): Error {
  return Object.assign(new Error(message), { name });
}

function textOf(key: BufferSource): string {
  const bytes = ArrayBuffer.isView(key)
    ? new Uint8Array(key.buffer, key.byteOffset, key.byteLength)
    : new Uint8Array(key);
  return String.fromCharCode(...bytes);
}

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

  it('silently renews a subscription made with a server key that has since rotated', async () => {
    const unsubscribeStale = vi.fn().mockResolvedValue(true);
    getSubscription.mockResolvedValue({
      endpoint: 'https://push/stale',
      options: { applicationServerKey: keyBytes('old-server-key') },
      unsubscribe: unsubscribeStale,
    });
    mockFetchKey.mockResolvedValue(base64Url('new-server-key'));
    const renewedJson = { endpoint: 'https://push/renewed', keys: { p256dh: 'k', auth: 'a' } };
    pmSubscribe.mockResolvedValue({ endpoint: 'https://push/renewed', toJSON: () => renewedJson });
    mockPost.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderPushHook();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(unsubscribeStale).toHaveBeenCalledOnce();
    expect(mockDelete).toHaveBeenCalledWith('https://push/stale');
    expect(textOf(pmSubscribe.mock.calls[0]![0].applicationServerKey)).toBe('new-server-key');
    expect(mockPost).toHaveBeenCalledWith(renewedJson);
    expect(result.current.subscribed).toBe(true);
    expect(result.current.error).toBeNull();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('keeps a subscription made with the key the server still serves', async () => {
    const unsubscribeCurrent = vi.fn();
    getSubscription.mockResolvedValue({
      endpoint: 'https://push/current',
      options: { applicationServerKey: keyBytes('server-key') },
      unsubscribe: unsubscribeCurrent,
    });
    mockFetchKey.mockResolvedValue(base64Url('server-key'));

    const { result } = renderPushHook();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscribed).toBe(true);
    expect(unsubscribeCurrent).not.toHaveBeenCalled();
    expect(pmSubscribe).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('still reports the subscription when the server key cannot be read', async () => {
    const unsubscribeCurrent = vi.fn();
    getSubscription.mockResolvedValue({
      endpoint: 'https://push/current',
      options: { applicationServerKey: keyBytes('server-key') },
      unsubscribe: unsubscribeCurrent,
    });
    mockFetchKey.mockRejectedValue(new Error('offline'));

    const { result } = renderPushHook();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscribed).toBe(true);
    expect(result.current.error).toBeNull();
    expect(unsubscribeCurrent).not.toHaveBeenCalled();
  });

  it('subscribe() shows the translated fallback, not the raw browser error', async () => {
    requestPermission.mockResolvedValue('granted');
    mockFetchKey.mockResolvedValue('dGVzdA');
    pmSubscribe.mockRejectedValue(
      browserPushError('Registration failed - push service error', 'AbortError')
    );

    const { result } = renderPushHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe('Erreur lors de l’activation des notifications');
    expect(result.current.subscribed).toBe(false);
  });

  it('subscribe() shows the message of an API error, already translated by the client', async () => {
    requestPermission.mockResolvedValue('granted');
    mockFetchKey.mockResolvedValue('dGVzdA');
    pmSubscribe.mockResolvedValue({ toJSON: () => ({ endpoint: 'https://push/x' }) });
    mockPost.mockRejectedValue(new ApiError('Trop de requêtes, réessayez.', { code: 429 }));

    const { result } = renderPushHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe('Trop de requêtes, réessayez.');
  });

  it('unsubscribe() shows the translated fallback, not the raw browser error', async () => {
    const unsubscribe = vi
      .fn()
      .mockRejectedValue(browserPushError('Push service unreachable', 'InvalidStateError'));
    getSubscription.mockResolvedValue({ endpoint: 'https://push/x', unsubscribe });
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderPushHook();
    await waitFor(() => expect(result.current.subscribed).toBe(true));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(result.current.error).toBe('Erreur lors de la désactivation');
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
