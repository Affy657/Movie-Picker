import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { PRERENDERED_ROUTES } from '@/app/prerenderRoutes';

const workbox = vi.hoisted(() => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
  matchPrecache: vi.fn(),
  registerRoute: vi.fn(),
  NetworkFirst: vi.fn(),
  NetworkOnly: vi.fn(),
  CacheFirst: vi.fn(),
  StaleWhileRevalidate: vi.fn(),
  ExpirationPlugin: vi.fn(),
  CacheableResponsePlugin: vi.fn(),
}));

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: workbox.precacheAndRoute,
  cleanupOutdatedCaches: workbox.cleanupOutdatedCaches,
  matchPrecache: workbox.matchPrecache,
}));
vi.mock('workbox-routing', () => ({ registerRoute: workbox.registerRoute }));
vi.mock('workbox-strategies', () => ({
  NetworkFirst: workbox.NetworkFirst,
  NetworkOnly: workbox.NetworkOnly,
  CacheFirst: workbox.CacheFirst,
  StaleWhileRevalidate: workbox.StaleWhileRevalidate,
}));
vi.mock('workbox-expiration', () => ({ ExpirationPlugin: workbox.ExpirationPlugin }));
vi.mock('workbox-cacheable-response', () => ({
  CacheableResponsePlugin: workbox.CacheableResponsePlugin,
}));

type RouteMatcher = (context: { url: URL; request: { mode: string } }) => boolean;
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

type TmdbImagePlugin = {
  requestWillFetch?: (param: { request: Request }) => Promise<Request>;
  handlerDidError?: (param: { request: Request; error: Error }) => Promise<Response | undefined>;
};

type StrategyOptions = { cacheName?: string; plugins?: unknown[] };

const installation = {
  routes: [] as RegisteredRoute[],
  expirationOptions: [] as unknown[],
  cacheableResponseOptions: [] as unknown[],
  cacheFirstOptions: [] as StrategyOptions[],
  networkOnlyOptions: [] as StrategyOptions[],
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

function navigationRoute(): RegisteredRoute {
  return installation.routes[2]!;
}

function apiCall(path: string): { url: URL; request: { mode: string } } {
  return { url: new URL(`${origin()}${path}`), request: { mode: 'cors' } };
}

function navigationTo(path: string): { url: URL; request: { mode: string } } {
  return { url: new URL(`${origin()}${path}`), request: { mode: 'navigate' } };
}

type NavigationPlugin = { handlerDidError: () => Promise<Response | undefined> };

function offlineShell(): NavigationPlugin {
  const plugins = installation.networkOnlyOptions[0]?.plugins ?? [];
  return plugins[0] as NavigationPlugin;
}

function tmdbImagePlugin(): TmdbImagePlugin {
  const plugins = installation.cacheFirstOptions[0]?.plugins ?? [];
  const plugin = plugins.find(
    (candidate): candidate is TmdbImagePlugin =>
      typeof (candidate as TmdbImagePlugin).requestWillFetch === 'function'
  );
  if (!plugin) throw new Error('No requestWillFetch plugin on the TMDB image route');
  return plugin;
}

const TMDB_POSTER_URL = 'https://image.tmdb.org/t/p/w500/a.jpg';

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
  installation.expirationOptions = workbox.ExpirationPlugin.mock.calls.map((call) => call[0]);
  installation.cacheableResponseOptions = workbox.CacheableResponsePlugin.mock.calls.map(
    (call) => call[0]
  );
  installation.cacheFirstOptions = workbox.CacheFirst.mock.calls.map(
    (call) => call[0] as StrategyOptions
  );
  installation.networkOnlyOptions = workbox.NetworkOnly.mock.calls.map(
    (call) => call[0] as StrategyOptions
  );
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
    expect(matches(apiCall('/api/v1/movies/showcase?section=trending'))).toBe(true);
    expect(matches(apiCall('/api/v1/movies/collections'))).toBe(true);
    expect(matches(apiCall('/api/v1/movies/search?q=heat'))).toBe(false);
    expect(matches(apiCall('/api/v1/events'))).toBe(false);
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
      expect(matchers.some((matches) => matches(apiCall(path)))).toBe(false);
    }
    expect(installation.networkFirstCalls).toBe(0);
  });

  it('met en cache les images TMDB', () => {
    const matches = tmdbRouteMatcher();
    const imageAt = (href: string) => ({ url: new URL(href), request: { mode: 'no-cors' } });
    expect(matches(imageAt('https://image.tmdb.org/t/p/w500/a.jpg'))).toBe(true);
    expect(matches(imageAt('https://evil.test/t/p/w500/a.jpg'))).toBe(false);
  });

  it('serves a cached TMDB image straight from the cache, its content never changes under a URL', () => {
    expect(installation.routes[1]!.strategy).toBeInstanceOf(workbox.CacheFirst);
    expect(installation.cacheFirstOptions[0]).toMatchObject({ cacheName: 'tmdb-images-v3' });
  });

  it('fetches a TMDB image in CORS mode without credentials, so its real status is known', async () => {
    const original = new Request(TMDB_POSTER_URL, { mode: 'no-cors' });
    const corsRequest = await tmdbImagePlugin().requestWillFetch!({ request: original });
    expect(corsRequest.url).toBe(TMDB_POSTER_URL);
    expect(corsRequest.mode).toBe('cors');
    expect(corsRequest.credentials).toBe('omit');
  });

  it('stores only a successful TMDB image, never an opaque or failed response', () => {
    expect(installation.cacheableResponseOptions[1]).toEqual({ statuses: [200] });
  });

  it('falls back to a plain network fetch, left out of the cache, when the CORS fetch fails', async () => {
    const original = new Request(TMDB_POSTER_URL, { mode: 'no-cors' });
    const opaque = new Response(null, { status: 200 });
    const networkFetch = vi.fn(() => Promise.resolve(opaque));
    vi.stubGlobal('fetch', networkFetch);
    try {
      const fallback = await tmdbImagePlugin().handlerDidError!({
        request: original,
        error: new TypeError('Failed to fetch'),
      });
      expect(fallback).toBe(opaque);
      expect(networkFetch).toHaveBeenCalledWith(original);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps 300 TMDB images for 30 days and lets the browser drop them when the quota runs out', () => {
    expect(installation.expirationOptions[1]).toEqual({
      maxEntries: 300,
      maxAgeSeconds: 60 * 60 * 24 * 30,
      purgeOnQuotaError: true,
    });
  });
});

describe('service worker: offline navigation', () => {
  it('always asks the network first: Hosting stays the source of a document', () => {
    expect(navigationRoute().strategy).toBeInstanceOf(workbox.NetworkOnly);
  });

  it('falls back on the precached shell once the network failed', async () => {
    const shell = new Response('<html></html>');
    workbox.matchPrecache.mockResolvedValueOnce(shell);

    await expect(offlineShell().handlerDidError()).resolves.toBe(shell);

    expect(workbox.matchPrecache).toHaveBeenCalledWith('/index.html');
  });

  it('covers the app routes, the start page of the installed app first', () => {
    const { matches } = navigationRoute();
    expect(matches(navigationTo('/my-events'))).toBe(true);
    expect(matches(navigationTo('/e/Ab3dE_9xYz'))).toBe(true);
    expect(matches(navigationTo('/settings/profile'))).toBe(true);
  });

  it('leaves the recap documents to the API, they carry their own preview tags', () => {
    expect(navigationRoute().matches(navigationTo('/r/Ab3dE_9xYz'))).toBe(false);
  });

  it.each(PRERENDERED_ROUTES)('leaves the prerendered document of %s to Hosting', (route) => {
    const { matches } = navigationRoute();
    expect(matches(navigationTo(route))).toBe(false);
    expect(matches(navigationTo(`${route}/`))).toBe(false);
  });

  it('never answers anything but a navigation', () => {
    expect(navigationRoute().matches(apiCall('/my-events'))).toBe(false);
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

  it('purges the TMDB image cache filled with opaque responses by earlier versions', async () => {
    const event = pending();
    listeners.get('activate')!(event as unknown as Record<string, unknown>);
    await event.settled();
    expect(deleteCache).toHaveBeenCalledWith('tmdb-images-v2');
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
