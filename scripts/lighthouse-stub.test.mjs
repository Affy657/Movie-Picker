import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import { findPayloadMismatches, loadContract, responseType } from './contract-payload.mjs';
import {
  STUB_ACTIVE_HANDLE,
  STUB_HANDLE,
  STUB_IMAGE_SIZES,
  STUB_JSON_ROUTES,
  STUB_MOVIE_ID,
  blockImage,
  buildImageBank,
  startApiStub,
  stubImageFor,
  stubJsonRouteFor,
} from './lighthouse-stub.mjs';

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('blockImage encodes a PNG of the requested dimensions', () => {
  const png = blockImage({ width: 92, height: 138, cells: 400, seed: 3 });
  assert.deepEqual(pngDimensions(png), { width: 92, height: 138 });
});

test('each stub image weighs what TMDB serves at that size, within 15 %', () => {
  const bank = buildImageBank(STUB_IMAGE_SIZES, 2);
  for (const [size, { width, height, bytes }] of Object.entries(STUB_IMAGE_SIZES)) {
    for (const image of bank.get(size)) {
      assert.deepEqual(pngDimensions(image), { width, height }, size);
      assert.ok(Math.abs(image.length - bytes) / bytes < 0.15, `${size}: ${image.length} bytes`);
    }
  }
});

test('stubImageFor keeps one image per file and refuses an unknown size', () => {
  const bank = buildImageBank({ w92: STUB_IMAGE_SIZES.w92 }, 3);
  assert.equal(stubImageFor(bank, 'w92', 'lh-a.png'), stubImageFor(bank, 'w92', 'lh-a.png'));
  assert.equal(stubImageFor(bank, 'w9000', 'lh-a.png'), null);
});

async function withStub(run) {
  const unknown = [];
  const server = startApiStub({
    port: 0,
    webOrigin: 'http://127.0.0.1:1',
    onUnknownRequest: (method, path) => unknown.push(`${method} ${path}`),
  });
  await once(server, 'listening');
  const base = `http://localhost:${server.address().port}`;
  try {
    await run(base, unknown);
  } finally {
    server.close();
  }
}

test('the stub serves posters at the size named in the path', async () => {
  await withStub(async (base) => {
    const response = await fetch(`${base}/api/v1/posters/tmdb/w185/lh-showcase-1.png`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.deepEqual(pngDimensions(Buffer.from(await response.arrayBuffer())), {
      width: 185,
      height: 278,
    });
  });
});

test('the measured pages get posters, a filled profile and a film', async () => {
  await withStub(async (base) => {
    const trending = await (await fetch(`${base}/api/v1/movies/showcase?section=trending`)).json();
    assert.ok(trending.items.length > 20);
    assert.ok(trending.items.every((item) => item.posterPath?.startsWith('/api/v1/posters/')));

    const profile = await (await fetch(`${base}/api/v1/users/${STUB_ACTIVE_HANDLE}`)).json();
    assert.ok(profile.favorites.length > 0);
    assert.ok(profile.banner);
    const watched = await (
      await fetch(`${base}/api/v1/users/${STUB_ACTIVE_HANDLE}/watched-movies`)
    ).json();
    assert.ok(watched.items.length >= 8);

    const film = await (
      await fetch(`${base}/api/v1/movies/tmdb/${STUB_MOVIE_ID}/details?mediaType=movie`)
    ).json();
    assert.equal(film.tmdbId, STUB_MOVIE_ID);
    assert.ok(film.genres.length > 0 && film.watchProviders.length > 0 && film.voteAverage);
  });
});

test('the gated profile is the one a member with nothing to show receives', async () => {
  await withStub(async (base) => {
    const profile = await (await fetch(`${base}/api/v1/users/${STUB_HANDLE}`)).json();
    assert.deepEqual(profile.favorites, []);
    assert.equal(profile.banner, null);
    assert.equal(profile.watchlistCount, 0);
    const stats = await (await fetch(`${base}/api/v1/users/${STUB_HANDLE}/stats`)).json();
    assert.equal(stats.publicListCount, 0);
    assert.equal(stats.proposalsAverageRating, null);
    const watched = await (
      await fetch(`${base}/api/v1/users/${STUB_HANDLE}/watched-movies`)
    ).json();
    assert.deepEqual(watched.items, []);
  });
});

const PAGE_REQUESTS = [
  '/api/v1/auth/oauth/providers',
  '/api/v1/movies/showcase?section=trending',
  '/api/v1/movies/showcase?section=most-proposed',
  '/api/v1/movies/showcase?section=now-playing',
  '/api/v1/movies/showcase?section=provider&provider=netflix',
  `/api/v1/movies/showcase?section=recommendations&seedTmdbId=${STUB_MOVIE_ID}`,
  '/api/v1/movies/showcase?section=director&personId=2381985',
  '/api/v1/movies/showcase/themes',
  '/api/v1/movies/collections',
  `/api/v1/movies/tmdb/${STUB_MOVIE_ID}/details?mediaType=movie`,
  '/api/v1/events/slug/lighthouse-smoke',
  '/api/v1/events/lighthouse-smoke/movies',
  ...[STUB_HANDLE, STUB_ACTIVE_HANDLE].flatMap((handle) => [
    `/api/v1/users/${handle}`,
    `/api/v1/users/${handle}/stats`,
    `/api/v1/users/${handle}/watched-movies?take=24`,
    `/api/v1/users/${handle}/watchlist?skip=0&take=6`,
    `/api/v1/users/${handle}/lists`,
  ]),
];

test('every JSON payload of the stub is the response the contract declares', async () => {
  const contract = loadContract();
  const checked = new Set();
  await withStub(async (base, unknown) => {
    for (const request of PAGE_REQUESTS) {
      const response = await fetch(`${base}${request}`);
      assert.equal(response.status, 200, request);
      const route = stubJsonRouteFor(new URL(request, base).pathname);
      checked.add(route.path);
      const type = responseType(contract, 'GET', route.path);
      assert.deepEqual(findPayloadMismatches(contract, type, await response.json()), [], request);
    }
    assert.deepEqual(unknown, []);
  });
  assert.deepEqual(
    STUB_JSON_ROUTES.map((route) => route.path).filter((path) => !checked.has(path)),
    []
  );
});

test('a member the stub does not know is an unknown request, not an empty profile', async () => {
  await withStub(async (base, unknown) => {
    const response = await fetch(`${base}/api/v1/users/someone-else`);
    assert.equal(response.status, 404);
    assert.deepEqual(unknown, ['GET /api/v1/users/someone-else']);
  });
});

test('an unknown route answers 404 and is reported', async () => {
  await withStub(async (base, unknown) => {
    const response = await fetch(`${base}/api/v1/nothing-here`);
    assert.equal(response.status, 404);
    assert.deepEqual(unknown, ['GET /api/v1/nothing-here']);
  });
});
