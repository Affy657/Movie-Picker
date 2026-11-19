import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postAuthLogin, postAuthLogout, postAuthRegister } from '@/features/auth/api/authApi';
import { hasSessionHint, setSessionHint } from '@/features/auth/session-hint';
import { ApiError } from '@/shared/api/apiError';

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

  it('forgets the session hint once the server confirmed', async () => {
    setSessionHint();

    await postAuthLogout();

    expect(hasSessionHint()).toBe(false);
  });

  it.each([
    ['the session was already gone', 401],
    ['the server cannot be reached', 0],
  ])('forgets the session hint when %s', async (_case, code) => {
    setSessionHint();
    mockFetchApi.mockRejectedValue(new ApiError('Refused', { code }));

    await expect(postAuthLogout()).rejects.toThrow('Refused');

    expect(hasSessionHint()).toBe(false);
  });

  it.each([500, 503, 429])(
    'keeps the session hint on a %i, the session is still open',
    async (code) => {
      setSessionHint();
      mockFetchApi.mockRejectedValue(new ApiError('Refused', { code }));

      await expect(postAuthLogout()).rejects.toThrow('Refused');

      expect(hasSessionHint()).toBe(true);
    }
  );
});

describe('sign-in and sign-up destination', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
    mockFetchApi.mockResolvedValue(undefined);
  });

  function bodyOf(path: string): { returnTo?: string } {
    const [, init] = mockFetchApi.mock.calls.find(([called]) => called === path)!;
    return JSON.parse((init as { body: string }).body) as { returnTo?: string };
  }

  it('keeps an overlong destination within what the server accepts, its start intact', async () => {
    const overlong = `/e/soiree?${'x'.repeat(3000)}`;

    await postAuthRegister('a@test.local', 'secret1', 'Alice', overlong);
    await postAuthLogin('a@test.local', 'secret1', overlong);

    for (const path of ['/auth/register', '/auth/login']) {
      const { returnTo } = bodyOf(path);
      expect(returnTo).toHaveLength(2048);
      expect(returnTo?.startsWith('/e/soiree?')).toBe(true);
    }
  });

  it('never cuts a character in two when it shortens the destination', async () => {
    const overlong = `/e/${'a'.repeat(2044)}\u{1F3AC}tail`;

    await postAuthLogin('a@test.local', 'secret1', overlong);

    const { returnTo } = bodyOf('/auth/login');
    expect(returnTo).toBe(`/e/${'a'.repeat(2044)}`);
  });

  it('sends no destination when there is none', async () => {
    await postAuthLogin('a@test.local', 'secret1');

    expect(bodyOf('/auth/login')).not.toHaveProperty('returnTo');
  });
});
