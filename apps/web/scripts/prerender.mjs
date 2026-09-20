/**
 * Prerender of the static public routes, to run **after** `vite build`.
 *
 * What it produces: one complete HTML file per route, identical to `dist/index.html` but with
 * the page content already inside `#root` and the splash screen removed. The client calls
 * `createRoot().render()`, not `hydrateRoot()`, so React replaces this content at boot: there is
 * no hydration, hence no markup mismatch risk. What is gained is what a client without JavaScript
 * sees: search engines, link previews, crawlers.
 *
 * Why the splash screen is removed on these routes, and only on them: it is
 * `position: fixed; inset: 0` and would hide the prerendered content until boot. The home page is
 * **not** prerendered precisely to leave it alone, its title painted in the shell being its LCP
 * element (see C2 in docs/technical-debt.md).
 *
 * Rendered in French, the default language of `<html lang>` and of the canonical URL. An
 * English-speaking visitor therefore briefly sees French before React takes over: that is the
 * accepted price of a prerender without per-language routes.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(webRoot, 'dist');
const ssrOut = join(webRoot, 'dist-prerender');
const outDir = join(dist, 'prerendered');

const indexHtmlPath = join(dist, 'index.html');
let indexHtml;
try {
  indexHtml = readFileSync(indexHtmlPath, 'utf8');
} catch {
  console.error(`[prerender] ${indexHtmlPath} is missing, run \`vite build\` first.`);
  process.exit(1);
}

console.log('[prerender] SSR build of src/prerender.tsx');
rmSync(ssrOut, { recursive: true, force: true });
execFileSync(
  'pnpm',
  ['exec', 'vite', 'build', '--ssr', 'src/prerender.tsx', '--outDir', 'dist-prerender'],
  { cwd: webRoot, stdio: 'inherit', shell: true }
);

// The entry chunk name is hashed by the build configuration shared with the client: it is found
// by pattern rather than by duplicating a naming convention that is not ours.
const ssrEntries = readdirSync(join(ssrOut, 'assets')).filter(
  (name) => name.startsWith('prerender-') && name.endsWith('.js')
);
if (ssrEntries.length !== 1) {
  console.error(
    `[prerender] ${ssrEntries.length} entry chunk(s) found in dist-prerender/assets, exactly one expected: ${ssrEntries.join(', ')}`
  );
  process.exit(1);
}
const ssrEntry = pathToFileURL(join(ssrOut, 'assets', ssrEntries[0])).href;

const dom = new JSDOM('<!doctype html><html lang="fr"><head></head><body></body></html>', {
  url: 'https://www.movie-picker.fr/',
  pretendToBeVisual: true,
});
// jsdom does not implement `matchMedia` and several components call it unguarded, including
// `usePwaInstall` through the footer. Same shape as the polyfill in `src/test-setup.ts`: every
// query answers `false`, which gives the default render (light theme, not standalone).
Object.defineProperty(dom.window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }),
});

const browserGlobals = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'HTMLElement',
  'Element',
  'Node',
  'CustomEvent',
  'Event',
  'MutationObserver',
  'IntersectionObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'matchMedia',
];
// `defineProperty` rather than an assignment: Node 22 exposes `navigator` as a getter without a
// setter, so `globalThis.navigator = …` throws instead of replacing the value.
for (const name of browserGlobals) {
  const value = dom.window[name];
  if (value === undefined) continue;
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}
if (!globalThis.matchMedia)
  globalThis.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
// The stored language is the only one read at boot, the prerender pins it to the site language.
globalThis.localStorage.setItem('moviepicker-locale', 'fr');

// The film lists query the API at mount. The prerender never reaches a network: their request
// stays pending and the document carries the page head, its heading and its loading state,
// the same for every build wherever it runs. The client fetches the real list at boot.
globalThis.fetch = () => new Promise(() => {});

// The route list comes out of the SSR bundle, not from a copy here: it derives from `ROUTES` in
// `src/app/prerenderRoutes.ts`, so a route rename breaks the build instead of silently producing
// a file nobody serves.
const {
  renderRoute,
  PRERENDERED_ROUTES: routes,
  PRERENDERED_ROUTE_CHUNKS: chunkByRoute,
  PRERENDERED_FOR_FIRST_PAINT_ONLY: firstPaintOnly,
} = await import(ssrEntry);

if (!Array.isArray(routes) || routes.length === 0) {
  console.error('[prerender] the SSR bundle exposes no route to prerender.');
  process.exit(1);
}

// The splash screen is recognised by its id, not by a text pattern: the tag changes shape at
// build time (inline script minification) and a pattern would silently go stale, producing pages
// where the prerendered content is hidden by the shell.
function stripSplash(doc) {
  const splash = doc.getElementById('splash');
  if (!splash) return false;
  // The script right after the shell only paints the home title into it.
  const next = splash.nextElementSibling;
  if (next?.tagName === 'SCRIPT' && next.textContent.includes('startRoute')) next.remove();
  splash.remove();
  return true;
}

// The stylesheets of a lazily loaded page are attached by its JavaScript. A prerendered document
// that does not carry them paints its content unstyled, reflows when the chunk arrives, and
// Chrome records that second render as the LCP: the prerender then brings nothing. The
// `route-assets.json` manifest, written by the build plugin, gives the static import closure of
// each page; its styles are put in the document and its JavaScript preloaded, which is otherwise
// only discovered after the shell has been evaluated.
const routeAssetsPath = join(dist, 'route-assets.json');
let routeAssets = {};
try {
  routeAssets = JSON.parse(readFileSync(routeAssetsPath, 'utf8'));
} catch {
  console.error(
    `[prerender] ${routeAssetsPath} is missing: the build plugin no longer publishes the route manifest.`
  );
  process.exit(1);
}

function assetsForRoute(route, chunkByRoute) {
  const chunk = chunkByRoute[route];
  if (!chunk) {
    console.error(
      `[prerender] ${route} has no entry in PRERENDERED_ROUTE_CHUNKS: no way to know which stylesheets to put in its document.`
    );
    process.exit(1);
  }
  const assets = routeAssets.chunks?.[chunk];
  if (!assets) {
    console.error(
      `[prerender] chunk "${chunk}" of ${route} is missing from route-assets.json: stale name after a page rename?`
    );
    process.exit(1);
  }
  return assets;
}

// The route styles are inlined, not linked: a linked sheet blocks rendering and is only
// discovered after the document, so the prerendered content would wait a full network round trip
// before its first pixel, cancelling much of the prerender. Inlined, the first render depends on
// the document only. They are concatenated from the deepest to the shallowest, the shell first
// and the page next, as the JavaScript loading does: the reverse order would give a cascade where
// the page loses against the shell on rules of equal specificity.
function appendRouteAssets(doc, assets) {
  const inlined = new Set(routeAssets.inlinedCss ?? []);
  for (const file of assets.js) {
    if (doc.head.innerHTML.includes(`/${file}`)) continue;
    const link = doc.createElement('link');
    link.rel = 'modulepreload';
    link.setAttribute('crossorigin', '');
    link.href = `/${file}`;
    doc.head.appendChild(link);
  }
  const css = [...assets.css]
    .reverse()
    .filter((file) => !inlined.has(file))
    .map((file) => readFileSync(join(dist, file), 'utf8'))
    .join('\n');
  if (css.length === 0) return;
  const style = doc.createElement('style');
  style.textContent = css;
  doc.head.appendChild(style);
}

// Uniqueness key of a head tag, aligned with `upsertMeta` in `usePageSeo`: this is what allows
// replacing the template description or `og:title` instead of adding a second one, a duplicate
// leaving the engine to choose which one it keeps.
function headKey(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'title') return 'title';
  if (tag === 'meta') {
    const name = el.getAttribute('name');
    if (name) return `meta[name=${name}]`;
    const property = el.getAttribute('property');
    if (property) return `meta[property=${property}]`;
    return null;
  }
  if (tag === 'link' && el.getAttribute('rel') === 'canonical') return 'link[canonical]';
  if (tag === 'script' && el.hasAttribute('data-page-seo')) return 'script[page-seo]';
  return null;
}

function documentFor(route, page, assets) {
  const out = new JSDOM(indexHtml);
  const doc = out.window.document;

  if (!stripSplash(doc)) {
    console.error(
      '[prerender] no #splash in dist/index.html: the template changed, check that the prerendered content would not be hidden before removing this guard.'
    );
    process.exit(1);
  }

  const rendered = new JSDOM(`<head>${page.head}</head>`).window.document.head;
  const existing = new Map();
  for (const el of [...doc.head.children]) {
    const key = headKey(el);
    if (key) existing.set(key, el);
  }
  for (const el of [...rendered.children]) {
    const key = headKey(el);
    const imported = doc.importNode(el, true);
    const previous = key && existing.get(key);
    if (previous) previous.replaceWith(imported);
    else doc.head.appendChild(imported);
  }

  // The prerender serves two distinct purposes, and a `noindex` page only gets the second one:
  // indexing, and the first paint. A page that engines are asked to ignore must therefore declare
  // it in `PRERENDERED_FOR_FIRST_PAINT_ONLY`, otherwise the build fails: a `noindex` added later
  // on a page prerendered for its SEO stays an error, and it is caught here rather than found in
  // an engine's logs. The prerender also **reinforces** the `noindex`: without it, a robot that
  // does not run JavaScript receives the SPA shell, which carries no `robots` tag.
  const robots = doc.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
  if (robots.includes('noindex') && !firstPaintOnly.includes(route)) {
    console.error(
      `[prerender] ${route} renders "robots: ${robots}" without being listed in PRERENDERED_FOR_FIRST_PAINT_ONLY: either prerender it for its first paint and declare it there, or remove it from PRERENDERED_ROUTES, or remove its noindex.`
    );
    process.exit(1);
  }

  appendRouteAssets(doc, assets);

  const root = doc.getElementById('root');
  if (!root) {
    console.error('[prerender] no #root in dist/index.html.');
    process.exit(1);
  }
  root.innerHTML = page.body;

  return `<!doctype html>
${doc.documentElement.outerHTML}
`;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const manifest = [];
for (const route of routes) {
  const page = await renderRoute(route);
  if (page.body.trim().length === 0) {
    console.error(`[prerender] ${route} rendered an empty body.`);
    process.exit(1);
  }
  const html = documentFor(route, page, assetsForRoute(route, chunkByRoute));
  const file = `${route.replace(/^\//, '').replaceAll('/', '__')}.html`;
  writeFileSync(join(outDir, file), html, 'utf8');
  manifest.push({ route, file });
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '(untitled)';
  console.log(`[prerender] ${route} → prerendered/${file}, "${title}", ${html.length} bytes`);
}

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
rmSync(ssrOut, { recursive: true, force: true });
console.log(`[prerender] ${manifest.length} routes prerendered.`);

// `pretendToBeVisual` runs a requestAnimationFrame loop that keeps the event loop open: without
// these two lines the script finishes its work then never returns, and the build stays stuck on a
// script that has nevertheless written everything.
dom.window.close();
process.exit(0);
