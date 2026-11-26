import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_FRONT_ROUTES,
  FRONT_ROUTER,
  FRONT_ROUTES,
  HOSTING_CONFIG,
  NOT_FOUND_PAGE,
  PRERENDERED_ROUTES,
  apiFrontPaths,
  frontRouteTable,
  prerenderedRoutes,
  publishedFiles,
  readRepositoryFile,
  resolveHostingPath,
  routerPatterns,
  samplePaths,
} from './firebase-hosting-routes.mjs';

const config = JSON.parse(readRepositoryFile(HOSTING_CONFIG));
const routes = frontRouteTable(readRepositoryFile(FRONT_ROUTES));
const patterns = routerPatterns(readRepositoryFile(FRONT_ROUTER), routes);
const prerendered = prerenderedRoutes(readRepositoryFile(PRERENDERED_ROUTES), routes);
const build = publishedFiles({ prerendered });
const withoutPrerender = publishedFiles({ prerendered: [] });
const textFiles = ['/llms.txt', '/.well-known/security.txt'];

function served(path, files = build) {
  return resolveHostingPath(config, files, path);
}

function assertServed(path, files = build) {
  const { status } = served(path, files);
  assert.ok(status === 200 || status === 'api', `${path} answers ${status}`);
}

describe('firebase-hosting.json routes', () => {
  it('serves every route of the router, by its own rewrite and not by a prerendered file', () => {
    assert.ok(patterns.length > 40, `${patterns.length} routes read from ${FRONT_ROUTER}`);
    for (const pattern of patterns) {
      for (const path of samplePaths(pattern)) assertServed(path, withoutPrerender);
    }
  });

  it('serves every front path the API writes in e-mails, notifications and redirects', () => {
    const paths = apiFrontPaths(readRepositoryFile(API_FRONT_ROUTES));
    assert.ok(paths.length > 10, `${paths.length} paths read from ${API_FRONT_ROUTES}`);
    for (const path of paths.flatMap(samplePaths)) assertServed(path);
  });

  it('serves every page the static sitemap and llms.txt announce', () => {
    const announced = [
      ...readRepositoryFile('apps/web/public/sitemap.xml').matchAll(
        /<loc>https:\/\/[^/]+(\/[^<]*)<\/loc>/g
      ),
      ...readRepositoryFile('apps/web/public/llms.txt').matchAll(
        /https:\/\/www\.movie-picker\.fr(\/[^\s)]*)/g
      ),
    ].map(([, path]) => path);
    assert.ok(announced.length > 5);
    for (const path of announced) assertServed(path, new Set([...build, ...textFiles]));
  });

  it('keeps the share documents on Cloud Run and the invitations on their own documents', () => {
    assert.deepEqual(served('/e/probe-slug').status, 'api');
    assert.deepEqual(served('/r/probe-slug').status, 'api');
    assert.deepEqual(served('/film/27205-inception').status, 'api');
    assert.deepEqual(served('/serie/1399-game-of-thrones').status, 'api');
    assert.deepEqual(served('/u/probe-handle').status, 'api');
    assert.equal(served('/l/probe-token/rejoindre').served, '/invitations/list.html');
    assert.equal(served('/g/probe-token/rejoindre').served, '/invitations/group.html');
  });

  it('serves a prerendered route from its own file, the home page from the shell', () => {
    assert.equal(served('/').served, '/index.html');
    for (const route of prerendered) assert.equal(served(route).served, `${route}/index.html`);
  });

  it('answers 404 with the application shell on every path no route knows', () => {
    for (const path of [
      '/page-inexistante',
      '/films',
      '/films/inconnu',
      '/films/theme/annees-80/plus',
      '/listes/probe/plus',
      '/groupes/probe/plus',
      '/settingsx',
      '/u/probe/inconnu',
      '/u/probe/listes/probe/plus',
      '/e/probe/plus',
      '/film',
      '/index',
    ]) {
      assert.deepEqual(served(path), { status: 404, served: NOT_FOUND_PAGE }, path);
    }
  });

  it('answers 404 on a missing hashed asset, so a stale tab reloads instead of running the shell', () => {
    assert.equal(served('/assets/missing-asset-probe.js').status, 404);
    assert.equal(served('/assets/index-AbC12345.js').status, 200);
  });

  it('redirects a trailing slash to the route rather than serving it twice', () => {
    assert.deepEqual(served('/films/recherche/'), { status: 301, served: '/films/recherche' });
  });

  it('keeps no rewrite that no route reaches', () => {
    const samples = patterns.flatMap(samplePaths);
    for (const rewrite of config.rewrites) {
      const reached = samples.some((path) => served(path, withoutPrerender).rewrite === rewrite);
      assert.ok(
        reached,
        `rewrite ${rewrite.glob ?? rewrite.regex} serves no route of ${FRONT_ROUTER}`
      );
    }
  });
});

describe('route reading', () => {
  it('reads the ROUTES table, prefixes resolved', () => {
    const table = frontRouteTable(
      [
        "const EVENT_PREFIX = '/e';",
        "const MOVIE_PAGE_PREFIX: Record<MovieMediaType, string> = { movie: '/film', tv: '/serie' };",
        'export const ROUTES = {',
        "  home: '/',",
        '  eventDetailPattern: `${EVENT_PREFIX}/:slug`,',
        '  showPagePattern: `${MOVIE_PAGE_PREFIX.tv}/:movieRef`,',
        '} as const;',
      ].join('\n')
    );
    assert.deepEqual(table, {
      home: '/',
      eventDetailPattern: '/e/:slug',
      showPagePattern: '/serie/:movieRef',
    });
  });

  it('refuses a route path written outside ROUTES, which no rewrite would follow', () => {
    assert.throws(
      () => routerPatterns('<Route path={ROUTES.home} /><Route path="/nouvelle" />', { home: '/' }),
      /route path "\/nouvelle" written outside ROUTES/
    );
    assert.throws(
      () =>
        routerPatterns('<Route path={ROUTES.home} /><Route path={base + "/x"} />', { home: '/' }),
      /1 route path\(s\) this check cannot read/
    );
  });

  it('turns a pattern into the concrete paths a visitor would type', () => {
    assert.deepEqual(samplePaths('/u/:handle/listes/:listId'), [
      '/u/probe-handle/listes/probe-listId',
    ]);
    assert.deepEqual(samplePaths('/settings/*'), [
      '/settings',
      '/settings/probe',
      '/settings/probe/deeper',
    ]);
    assert.deepEqual(samplePaths('/settings/profil#favoris'), ['/settings/profil']);
  });
});
