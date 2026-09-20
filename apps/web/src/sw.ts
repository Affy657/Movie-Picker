/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

const RETIRED_CACHES = ['api-cache-v2'];

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([self.clients.claim(), ...RETIRED_CACHES.map((name) => caches.delete(name))])
  );
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const PUBLIC_SHOWCASE_PATHS = new Set(['/api/v1/movies/showcase', '/api/v1/movies/collections']);

registerRoute(
  ({ url }) => PUBLIC_SHOWCASE_PATHS.has(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'showcase-cache-v1',
    plugins: [
      new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 6 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ url }) => url.hostname === 'image.tmdb.org',
  new CacheFirst({
    cacheName: 'tmdb-images-v2',
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json() as {
    title: string;
    body: string;
    tag?: string;
    url?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/pwa-192x192.png',
      badge: '/icons/pwa-64x64.png',
      tag: data.tag,
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl: string | undefined = (event.notification.data as { url?: string } | undefined)?.url;
  if (!rawUrl) return;

  let safeUrl: string;
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) return;
    safeUrl = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const target = new URL(safeUrl, self.location.origin);
      const match = clientList.find((c) => new URL(c.url).pathname === target.pathname);
      if (!match) return self.clients.openWindow(safeUrl);
      return Promise.resolve(match.focus()).then((focused) => {
        const client = focused ?? match;
        const current = new URL(client.url);
        if (current.search === target.search && current.hash === target.hash) return client;
        return client.navigate(safeUrl).catch(() => client);
      });
    })
  );
});
