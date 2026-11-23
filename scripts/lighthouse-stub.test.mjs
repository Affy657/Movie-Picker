import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import {
  STUB_ACTIVE_HANDLE,
  STUB_HANDLE,
  STUB_IMAGE_SIZES,
  STUB_MOVIE_ID,
  blockImage,
  buildImageBank,
  startApiStub,
  stubImageFor,
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

test('the gated profile stays the minimal one until a filled profile passes the floor', async () => {
  await withStub(async (base) => {
    const profile = await (await fetch(`${base}/api/v1/users/${STUB_HANDLE}`)).json();
    assert.equal(profile.favorites, undefined);
    const watched = await (
      await fetch(`${base}/api/v1/users/${STUB_HANDLE}/watched-movies`)
    ).json();
    assert.deepEqual(watched.items, []);
  });
});

test('an unknown route answers 404 and is reported', async () => {
  await withStub(async (base, unknown) => {
    const response = await fetch(`${base}/api/v1/nothing-here`);
    assert.equal(response.status, 404);
    assert.deepEqual(unknown, ['GET /api/v1/nothing-here']);
  });
});
