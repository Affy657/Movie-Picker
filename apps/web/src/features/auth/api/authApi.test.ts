import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postAuthLogout } from '@/features/auth/api/authApi';

const mockFetchApi = vi.fn();
vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/device-1';

function installServiceWorker(
  subscription: { endpoint: string; unsubscribe: () => Promise<boolean> } | null
) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: () =>
        Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(subscription) } }),
    },
  });
}

function logoutBody(): unknown {
  const [, init] = mockFetchApi.mock.calls.find(([path]) => path === '/auth/logout')!;
  return JSON.parse((init as { body: string }).body);
}

describe('postAuthLogout', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
    mockFetchApi.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('hands the push subscription of this device to the server, then drops it locally', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    installServiceWorker({ endpoint: ENDPOINT, unsubscribe });

    await postAuthLogout();

    expect(logoutBody()).toEqual({ pushEndpoint: ENDPOINT });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('signs out without an endpoint on a device that never subscribed', async () => {
    installServiceWorker(null);

    await postAuthLogout();

    expect(logoutBody()).toEqual({});
  });

  it('signs out without an endpoint where the browser has no service worker', async () => {
    await postAuthLogout();

    expect(logoutBody()).toEqual({});
  });

  it('drops the subscription of this device even when the server call fails', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    installServiceWorker({ endpoint: ENDPOINT, unsubscribe });
    mockFetchApi.mockRejectedValueOnce(new Error('offline'));

    await expect(postAuthLogout()).rejects.toThrow('offline');

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
