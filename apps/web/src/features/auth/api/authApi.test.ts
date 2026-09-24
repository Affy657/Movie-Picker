import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postAuthLogout } from '@/features/auth/api/authApi';

const mockFetchApi = vi.fn();
vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/device-1';

function installServiceWorker(
  subscription: { endpoint: string; unsubscribe: () => Promise<boolean> } | null,
  getRegistration: () => Promise<unknown> = () =>
    Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(subscription) } })
) {
  vi.stubGlobal('PushManager', function PushManager() {});
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration },
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
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('hands the push subscription of this device to the server', async () => {
    installServiceWorker({ endpoint: ENDPOINT, unsubscribe: vi.fn().mockResolvedValue(true) });

    await postAuthLogout();

    expect(logoutBody()).toEqual({ pushEndpoint: ENDPOINT });
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

  it('signs out without an endpoint when the browser cannot read its subscription', async () => {
    installServiceWorker(null, () => Promise.reject(new Error('service worker unavailable')));

    await postAuthLogout();

    expect(logoutBody()).toEqual({});
  });
});
