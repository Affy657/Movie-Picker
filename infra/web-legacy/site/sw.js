const CANONICAL_HOST = 'www.movie-picker.fr';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(leave());
});

async function leave() {
  await self.clients.claim();
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  const windows = await self.clients.matchAll({ type: 'window' });
  await Promise.all(
    windows.map((client) => client.navigate(movedUrl(client.url)).catch(() => null))
  );
  await self.registration.unregister();
}

function movedUrl(clientUrl) {
  const url = new URL(clientUrl);
  url.host = CANONICAL_HOST;
  url.searchParams.set('movedFrom', 'web');
  return url.href;
}
