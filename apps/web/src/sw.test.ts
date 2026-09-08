import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const workbox = vi.hoisted(() => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
  registerRoute: vi.fn(),
  NetworkFirst: vi.fn(),
  CacheFirst: vi.fn(),
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
}));
vi.mock('workbox-expiration', () => ({ ExpirationPlugin: workbox.ExpirationPlugin }));
vi.mock('workbox-cacheable-response', () => ({
  CacheableResponsePlugin: workbox.CacheableResponsePlugin,
}));

type RouteMatcher = (context: { url: URL }) => boolean;
type ServiceWorkerListener = (event: Record<string, unknown>) => void;

const listeners = new Map<string, ServiceWorkerListener>();
const skipWaiting = vi.fn();
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

function apiRouteMatcher(): RouteMatcher {
  return workbox.registerRoute.mock.calls[0]![0] as RouteMatcher;
}

function tmdbRouteMatcher(): RouteMatcher {
  return workbox.registerRoute.mock.calls[1]![0] as RouteMatcher;
}

beforeAll(async () => {
  Object.assign(globalThis, {
    __WB_MANIFEST: [],
    skipWaiting,
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
});

beforeEach(() => {
  skipWaiting.mockClear();
  showNotification.mockClear();
  openWindow.mockClear();
  openClients = [];
});

describe('service worker — mise en cache', () => {
  it('précharge le manifeste et purge les caches obsolètes', () => {
    expect(workbox.precacheAndRoute).toHaveBeenCalledTimes(1);
    expect(workbox.cleanupOutdatedCaches).toHaveBeenCalledTimes(1);
  });

  it('met en cache les appels API mais laisse passer les affiches', () => {
    const matches = apiRouteMatcher();
    expect(matches({ url: new URL(`${origin()}/api/v1/events`) })).toBe(true);
    expect(matches({ url: new URL(`${origin()}/api/v1/users/me`) })).toBe(true);
    expect(matches({ url: new URL(`${origin()}/api/v1/posters/550`) })).toBe(false);
    expect(matches({ url: new URL(`${origin()}/assets/app.js`) })).toBe(false);
  });

  it('met en cache les images TMDB', () => {
    const matches = tmdbRouteMatcher();
    expect(matches({ url: new URL('https://image.tmdb.org/t/p/w500/a.jpg') })).toBe(true);
    expect(matches({ url: new URL('https://evil.test/t/p/w500/a.jpg') })).toBe(false);
  });
});

describe('service worker — cycle de vie', () => {
  it('prend la main sur les onglets ouverts à l’activation', () => {
    const event = pending();
    listeners.get('activate')!(event as unknown as Record<string, unknown>);
    expect(event.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('applique la mise à jour sur demande explicite', () => {
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
  it('affiche la notification poussée', async () => {
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

  it('ignore une poussée sans charge utile', () => {
    const event = { ...pending(), data: null };
    listeners.get('push')!(event as unknown as Record<string, unknown>);
    expect(event.waitUntil).not.toHaveBeenCalled();
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('donne le focus à un onglet déjà ouvert sur la même page', async () => {
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
