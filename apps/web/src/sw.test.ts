import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const workbox = vi.hoisted(() => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
  registerRoute: vi.fn(),
  NetworkFirst: vi.fn(),
  CacheFirst: vi.fn(),
  StaleWhileRevalidate: vi.fn(),
  ExpirationPlugin: vi.fn(),
  CacheableResponsePlugin: vi.fn(),
}));

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: workbox.precacheAndRoute,
  cleanupOutdatedCaches: workbox.cleanupOutdatedCaches,
}));
vi.mock('workbox-routing', () => ({ registerRoute: workbox.registerRoute }));
vi.mock('workbox-strategies', () => ({
  NetworkFirst: workbox.NetworkFirst,
  CacheFirst: workbox.CacheFirst,
  StaleWhileRevalidate: workbox.StaleWhileRevalidate,
}));
vi.mock('workbox-expiration', () => ({ ExpirationPlugin: workbox.ExpirationPlugin }));
vi.mock('workbox-cacheable-response', () => ({
  CacheableResponsePlugin: workbox.CacheableResponsePlugin,
}));

type RouteMatcher = (context: { url: URL }) => boolean;
type ServiceWorkerListener = (event: Record<string, unknown>) => void;

const listeners = new Map<string, ServiceWorkerListener>();
const skipWaiting = vi.fn();
const deleteCache = vi.fn(() => Promise.resolve(true));
const showNotification = vi.fn();
const openWindow = vi.fn();
let openClients: Array<{ url: string; focus: ReturnType<typeof vi.fn> }> = [];

const origin = () => window.location.origin;

function pending(): { waitUntil: ReturnType<typeof vi.fn>; settled: () => Promise<unknown> } {
  const waitUntil = vi.fn();
  return {
    waitUntil,
    settled: async () => {
      const [promise] = waitUntil.mock.calls.at(-1) ?? [];
      return await promise;
    },
  };
}

type RegisteredRoute = { matches: RouteMatcher; strategy: unknown };

const installation = {
  routes: [] as RegisteredRoute[],
  precacheCalls: 0,
  cleanupCalls: 0,
  networkFirstCalls: 0,
};

function showcaseRouteMatcher(): RouteMatcher {
  return installation.routes[0]!.matches;
}

function tmdbRouteMatcher(): RouteMatcher {
  return installation.routes[1]!.matches;
}

function registeredRouteMatchers(): RouteMatcher[] {
  return installation.routes.map((route) => route.matches);
}

beforeAll(async () => {
  Object.assign(globalThis, {
    __WB_MANIFEST: [],
    skipWaiting,
    caches: { delete: deleteCache },
    registration: { showNotification },
    clients: {
      claim: vi.fn(() => Promise.resolve()),
      matchAll: vi.fn(() => Promise.resolve(openClients)),
      openWindow,
    },
  });
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
    listeners.set(type as string, listener as unknown as ServiceWorkerListener);
  });

  await import('@/sw');
  installation.routes = workbox.registerRoute.mock.calls.map((call) => ({
    matches: call[0] as RouteMatcher,
    strategy: call[1],
  }));
  installation.precacheCalls = workbox.precacheAndRoute.mock.calls.length;
  installation.cleanupCalls = workbox.cleanupOutdatedCaches.mock.calls.length;
  installation.networkFirstCalls = workbox.NetworkFirst.mock.calls.length;
});

beforeEach(() => {
  skipWaiting.mockClear();
  deleteCache.mockClear();
  showNotification.mockClear();
  openWindow.mockClear();
  openClients = [];
});

describe('service worker — mise en cache', () => {
  it('precaches the manifest and purges the stale caches', () => {
    expect(installation.precacheCalls).toBe(1);
    expect(installation.cleanupCalls).toBe(1);
  });

  it('serves the public selections from the cache then refreshes them behind', () => {
    const matches = showcaseRouteMatcher();
    expect(matches({ url: new URL(`${origin()}/api/v1/movies/showcase?section=trending`) })).toBe(
      true
    );
    expect(matches({ url: new URL(`${origin()}/api/v1/movies/collections`) })).toBe(true);
    expect(matches({ url: new URL(`${origin()}/api/v1/movies/search?q=heat`) })).toBe(false);
    expect(matches({ url: new URL(`${origin()}/api/v1/events`) })).toBe(false);
    expect(installation.routes[0]!.strategy).toBeInstanceOf(workbox.StaleWhileRevalidate);
  });

  it('never stores an authenticated API response in Cache Storage', () => {
    const matchers = registeredRouteMatchers();
    const privatePaths = [
      '/api/v1/auth/me',
      '/api/v1/auth/me/export',
      '/api/v1/events/mine',
      '/api/v1/events/slug/soiree',
      '/api/v1/notifications/inbox',
      '/api/v1/posters/550',
    ];
    for (const path of privatePaths) {
      const url = new URL(`${origin()}${path}`);
      expect(matchers.some((matches) => matches({ url }))).toBe(false);
    }
    expect(installation.networkFirstCalls).toBe(0);
  });

  it('met en cache les images TMDB', () => {
    const matches = tmdbRouteMatcher();
    expect(matches({ url: new URL('https://image.tmdb.org/t/p/w500/a.jpg') })).toBe(true);
    expect(matches({ url: new URL('https://evil.test/t/p/w500/a.jpg') })).toBe(false);
  });
});

describe('service worker — cycle de vie', () => {
  it('takes over the open tabs at activation', () => {
    const event = pending();
    listeners.get('activate')!(event as unknown as Record<string, unknown>);
    expect(event.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('purges the API cache left behind by earlier versions at activation', async () => {
    const event = pending();
    listeners.get('activate')!(event as unknown as Record<string, unknown>);
    await event.settled();
    expect(deleteCache).toHaveBeenCalledWith('api-cache-v2');
  });

  it('applies the update on explicit request', () => {
    listeners.get('message')!({ data: { type: 'SKIP_WAITING' } });
    expect(skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('ignore les autres messages', () => {
    listeners.get('message')!({ data: { type: 'AUTRE' } });
    listeners.get('message')!({ data: null });
    expect(skipWaiting).not.toHaveBeenCalled();
  });
});

describe('service worker — notifications', () => {
  it('shows the pushed notification', async () => {
    const event = {
      ...pending(),
      data: { json: () => ({ title: 'Soirée ce soir', body: '20h30', tag: 'evt-1', url: '/e/x' }) },
    };
    listeners.get('push')!(event as unknown as Record<string, unknown>);
    await event.settled();

    expect(showNotification).toHaveBeenCalledWith(
      'Soirée ce soir',
      expect.objectContaining({ body: '20h30', tag: 'evt-1', data: { url: '/e/x' } })
    );
  });

  it('ignores a push without payload', () => {
    const event = { ...pending(), data: null };
    listeners.get('push')!(event as unknown as Record<string, unknown>);
    expect(event.waitUntil).not.toHaveBeenCalled();
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('focuses a tab already open on the same page', async () => {
    const focus = vi.fn();
    openClients = [
      { url: `${origin()}/watchlist`, focus: vi.fn() },
      { url: `${origin()}/e/soiree`, focus },
    ];
    const event = { ...pending(), notification: { close: vi.fn(), data: { url: '/e/soiree' } } };

    listeners.get('notificationclick')!(event as unknown as Record<string, unknown>);
    await event.settled();

    expect(focus).toHaveBeenCalledTimes(1);
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('sends an already open tab to the destination when the link carries an intent', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined);
    const focus = vi.fn().mockResolvedValue({ url: `${origin()}/e/soiree`, navigate });
    openClients = [{ url: `${origin()}/e/soiree`, focus }];
    const event = {
      ...pending(),
      notification: { close: vi.fn(), data: { url: '/e/soiree?rate' } },
    };

    listeners.get('notificationclick')!(event as unknown as Record<string, unknown>);
    await event.settled();

    expect(focus).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/e/soiree?rate');
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('leaves a tab already on the exact destination alone', async () => {
    const navigate = vi.fn();
    const focus = vi.fn().mockResolvedValue({ url: `${origin()}/e/soiree?rate`, navigate });
    openClients = [{ url: `${origin()}/e/soiree?rate`, focus }];
    const event = {
      ...pending(),
      notification: { close: vi.fn(), data: { url: '/e/soiree?rate' } },
    };

    listeners.get('notificationclick')!(event as unknown as Record<string, unknown>);
    await event.settled();

    expect(focus).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ouvre un onglet quand aucun ne correspond', async () => {
    openClients = [{ url: `${origin()}/watchlist`, focus: vi.fn() }];
    const event = { ...pending(), notification: { close: vi.fn(), data: { url: '/e/soiree' } } };

    listeners.get('notificationclick')!(event as unknown as Record<string, unknown>);
    await event.settled();

    expect(openWindow).toHaveBeenCalledWith('/e/soiree');
  });

  it("refuse d'ouvrir une destination hors du domaine", async () => {
    const event = {
      ...pending(),
      notification: { close: vi.fn(), data: { url: 'https://evil.test/phishing' } },
    };

    listeners.get('notificationclick')!(event as unknown as Record<string, unknown>);

    expect(event.waitUntil).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('ferme la notification sans destination et ne navigue pas', () => {
    const close = vi.fn();
    const event = { ...pending(), notification: { close, data: undefined } };

    listeners.get('notificationclick')!(event as unknown as Record<string, unknown>);

    expect(close).toHaveBeenCalledTimes(1);
    expect(event.waitUntil).not.toHaveBeenCalled();
  });
});
