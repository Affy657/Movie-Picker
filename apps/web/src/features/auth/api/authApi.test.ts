import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  postAuthLogin,
  postAuthLogout,
  postAuthRegister,
  postEmailVerificationConfirm,
  postEmailVerificationResend,
} from '@/features/auth/api/authApi';
import { clearSessionHint, hasSessionHint, setSessionHint } from '@/features/auth/session-hint';
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

describe('email confirmation', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
    mockFetchApi.mockResolvedValue(undefined);
  });

  afterEach(() => {
    localStorage.clear();
  });

  function callTo(path: string): { method?: string; body: unknown } {
    const [, init] = mockFetchApi.mock.calls.find(([called]) => called === path)!;
    const { method, body } = init as { method?: string; body: string };
    return { method, body: JSON.parse(body) };
  }

  it('asks for the confirmation email in the language of the interface when signing up', async () => {
    localStorage.setItem('moviepicker-locale', 'en');

    await postAuthRegister('a@test.local', 'secret1', 'Alice');

    expect(callTo('/auth/register').body).toMatchObject({ locale: 'en' });
  });

  it('sends the token of the link to confirm the address', async () => {
    await postEmailVerificationConfirm('token-from-the-email');

    expect(callTo('/auth/email-verification/confirm')).toEqual({
      method: 'POST',
      body: { token: 'token-from-the-email' },
    });
  });

  it('asks for a new confirmation email in the given language', async () => {
    await postEmailVerificationResend('fr');

    expect(callTo('/auth/me/email-verification')).toEqual({
      method: 'POST',
      body: { locale: 'fr' },
    });
  });
});

describe('postAuthLogin and two-factor accounts', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
    clearSessionHint();
  });

  it('opens the session hint when the password is enough', async () => {
    mockFetchApi.mockResolvedValue({
      userId: 'u1',
      displayName: 'Alice',
      twoFactorRequired: false,
    });

    await expect(postAuthLogin('a@test.local', 'secret1')).resolves.toEqual({
      twoFactorRequired: false,
    });

    expect(hasSessionHint()).toBe(true);
  });

  it('waits for the code before keeping a session hint', async () => {
    mockFetchApi.mockResolvedValue({ userId: '', displayName: '', twoFactorRequired: true });

    await expect(postAuthLogin('a@test.local', 'secret1')).resolves.toEqual({
      twoFactorRequired: true,
    });

    expect(hasSessionHint()).toBe(false);
  });
});
