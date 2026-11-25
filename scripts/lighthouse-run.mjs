/** Usage: `pnpm run lighthouse` from the root (web build, then measurement of the public pages). */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import lighthouse, { generateReport } from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';

import { median, reviewCategory, selectPages } from './lighthouse-budget.mjs';
import {
  STUB_ACTIVE_HANDLE,
  STUB_HANDLE,
  STUB_MOVIE_ID,
  startApiStub,
} from './lighthouse-stub.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'apps', 'web', 'dist');
const PORT = Number(process.env.LH_PORT || 4179);
const BASE = `http://127.0.0.1:${PORT}`;
const API_PORT = Number(process.env.LH_API_PORT || 4000);
const API_URL = `http://localhost:${API_PORT}`;
/**
 * Dummy DSN pointed at the stub: production loads the Sentry SDK, so the measurement must load
 * it too, otherwise the gate measures a startup path nobody receives.
 */
const SENTRY_STUB_DSN = `http://lighthouse@localhost:${API_PORT}/1`;
const BUDGETS_PATH = path.join(ROOT, 'configs', 'lighthouse-budgets.json');
const OUT = path.join(ROOT, 'artifacts', 'lighthouse');

/**
 * Routes aligned with App.tsx.
 * `indexable: false` => the SEO category is not checked against the threshold
 * (the page is deliberately `Disallow:` in robots.txt or `noindex`; Lighthouse would
 * otherwise penalise what the indexing policy wants).
 * `skipPerformance: true` => the EventDetail chunk exceeds the landing budget of 80;
 * performance is still measured and logged, without failing the job.
 *
 * In production `/u/*`, `/film/*` and `/e/*` are not served by Hosting but by the API on Cloud Run
 * (rewrites of `infra/firebase-hosting.json`): `SharePreviewHead.IntoShell` takes this same
 * `index.html` and only rewrites its head (title, description, canonical, Open Graph, `noindex` for
 * a profile with nothing to show and no bio), served with `Cache-Control: public, max-age=60`. The
 * body, the scripts and the styles are the ones measured here, so the performance score follows the
 * same startup, and the SEO score reads the tags `usePageSeo` sets once the page has rendered. What
 * the run does not see is the response time of Cloud Run when Hosting's cache is cold.
 */
const URLS = [
  { path: '/', slug: 'home', indexable: true },
  { path: '/soutenir', slug: 'donate', indexable: true },
  { path: `/u/${STUB_HANDLE}`, slug: 'profile', indexable: true },
  { path: '/my-events', slug: 'my-events', indexable: false },
  { path: '/new', slug: 'new', indexable: false },
  { path: '/watchlist', slug: 'watchlist', indexable: false },
  { path: '/notifications', slug: 'notifications', indexable: false },
  { path: '/settings', slug: 'settings', indexable: false },
  { path: '/login', slug: 'login', indexable: false },
  { path: '/register', slug: 'register', indexable: false },
  { path: '/forgot-password', slug: 'forgot-password', indexable: false },
  { path: '/mentions-legales', slug: 'legal', indexable: false },
  { path: '/politique-de-confidentialite', slug: 'privacy', indexable: false },
  { path: '/e/lighthouse-smoke', slug: 'event-slug', indexable: false, skipPerformance: true },
];

/**
 * Pages measured with real posters and real data that do not reach the performance floor yet
 * (audit of 2026-11-23, M03). `LH_CANDIDATES=1` adds them to a local run, threshold ignored; one
 * moves into `URLS` once its median reaches the floor, never the other way round (I4).
 */
const CANDIDATE_URLS = [
  { path: `/u/${STUB_ACTIVE_HANDLE}`, slug: 'profile-active', indexable: true },
  { path: `/film/${STUB_MOVIE_ID}-film-de-demonstration-1`, slug: 'movie', indexable: false },
  { path: '/films/tendances', slug: 'trending', indexable: true },
].map((page) => ({ ...page, skipPerformance: true }));

const MEASURED_URLS = process.env.LH_CANDIDATES === '1' ? [...URLS, ...CANDIDATE_URLS] : URLS;

function waitForServer(hostname, port, maxMs = 60000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + maxMs;
    const tick = () => {
      const req = http.request(
        { hostname, port, path: '/', method: 'GET', timeout: 2000 },
        (res) => {
          res.resume();
          resolve();
        }
      );
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error(`Timeout: nothing on port ${port}`));
        else setTimeout(tick, 300);
      });
      req.end();
    };
    tick();
  });
}

function killServe(proc) {
  if (!proc || proc.killed) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-proc.pid, 'SIGTERM');
    }
  } catch {
    proc.kill('SIGKILL');
  }
}

if (process.env.LH_SKIP_BUILD !== '1') {
  execSync('pnpm --filter web run build', {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_API_URL: API_URL, VITE_SENTRY_DSN: SENTRY_STUB_DSN },
  });
}

if (!fs.existsSync(DIST)) {
  console.error('apps/web/dist not found after the build.');
  process.exit(1);
}

const budgets = JSON.parse(fs.readFileSync(BUDGETS_PATH, 'utf8'));
const mins = budgets.minimumScores;
const perPageMins = budgets.perPageMinimumScores ?? {};

fs.mkdirSync(OUT, { recursive: true });

/**
 * Production serves the prerendered routes as files of their own (`soutenir/index.html` on
 * Hosting): `/soutenir` answers with `prerendered/soutenir.html`, not with the SPA shell. Without
 * these rewrites, `serve -s` returns `index.html` and the measurement covers a page nobody
 * receives: its LCP element is rendered by React while it sits in the document in production. The
 * SPA fallback stays last, like the `**` rewrite of Hosting.
 *
 * The fallback is written as a negation rather than `**` because `serve-handler` applies its rules
 * in cascade: it replays the remaining rules on the already rewritten path. A final `**` would
 * catch `/prerendered/soutenir.html` and send it back to `index.html`, cancelling the first
 * rewrite without any signal. That is also why `--single` is not passed to `serve`: it inserts
 * its own `**` at the head of the list.
 */
function prerenderRewrites() {
  const manifestPath = path.join(DIST, 'prerendered', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return [];
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifest.map(({ route, file }) => ({
    source: route.replace(/^\//, ''),
    destination: `/prerendered/${file}`,
  }));
}

const serveConfigPath = path.join(DIST, 'serve.json');
fs.writeFileSync(
  serveConfigPath,
  JSON.stringify({
    rewrites: [...prerenderRewrites(), { source: '!/prerendered/**', destination: '/index.html' }],
    headers: [
      {
        source: 'assets/**',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: 'icons/**',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '**/*.@(woff2|svg|png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ],
  })
);

const serve = spawn(`pnpm exec serve "${DIST}" -l ${PORT} -c "${serveConfigPath}"`, {
  cwd: ROOT,
  stdio: 'ignore',
  shell: true,
});
/**
 * A request the stub does not know used to answer a silent 404: the page then rendered an error or
 * an empty state nobody receives in production, and the score measured that page instead. The run
 * fails instead, naming the page and the request, so the stub follows the front.
 */
const unknownApiRequests = new Set();
let measuredSlug = '';
const apiStub = startApiStub({
  port: API_PORT,
  webOrigin: BASE,
  onUnknownRequest: (method, url) => unknownApiRequests.add(`${measuredSlug}: ${method} ${url}`),
});

let failed = false;

/**
 * `serve` exits quietly when its port is taken, and `waitForServer` then accepts whoever holds it:
 * on a machine where another checkout measures too, the run scored that checkout's build, wired to
 * its own API. The shell this port answers with must be the one just built.
 */
function readServedShell() {
  return new Promise((resolve, reject) => {
    http
      .get(`${BASE}/`, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
}

try {
  await waitForServer('127.0.0.1', PORT);
  if ((await readServedShell()) !== fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')) {
    throw new Error(
      `Port ${PORT} serves another build than ${DIST}: another server holds it. Pick free ports with LH_PORT and LH_API_PORT.`
    );
  }

  const chrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const RUNS = Number(process.env.LH_RUNS || 3);

  const selected = selectPages(MEASURED_URLS, {
    only: process.env.LH_ONLY ?? '',
    shard: process.env.LH_SHARD ?? '',
  });
  if (selected.length === 0) {
    throw new Error('No page selected: check LH_ONLY and LH_SHARD, an empty shard proves nothing.');
  }
  console.log(`Pages measured: ${selected.map((u) => u.slug).join(', ')}`);

  try {
    for (const { path: pth, slug, indexable, skipPerformance } of selected) {
      measuredSlug = slug;
      const url = BASE + pth;
      const lhrs = [];
      for (let i = 0; i < RUNS; i++) {
        const result = await lighthouse(url, {
          port: chrome.port,
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        });
        lhrs.push(result.lhr);
      }

      const perfList = lhrs.map((l) => l.categories.performance?.score ?? 0);
      const medPerf = median(perfList);
      const repLhr =
        lhrs.find((l) => (l.categories.performance?.score ?? 0) === medPerf) ?? lhrs[0];

      fs.writeFileSync(path.join(OUT, `report-${slug}.json`), JSON.stringify(repLhr, null, 2));
      fs.writeFileSync(path.join(OUT, `report-${slug}.html`), generateReport(repLhr, 'html'));

      for (const cat of Object.keys(mins)) {
        const min = perPageMins[slug]?.[cat] ?? mins[cat];
        const skipSeo = cat === 'seo' && indexable === false;
        const skipPerf = cat === 'performance' && skipPerformance === true;
        const skipBudget = skipSeo || skipPerf;
        const { score, failure } = reviewCategory(lhrs, cat, { min, ignoreThreshold: skipBudget });
        const suffix = skipBudget
          ? skipSeo
            ? ' (not indexable, threshold ignored)'
            : ' (threshold ignored)'
          : ` (min ${min}, median of ${RUNS} runs)`;
        if (score !== null) console.log(`${slug} ${cat}: ${score}${suffix}`);
        if (failure) {
          console.error(`✗ ${slug} ${cat}: ${failure}`);
          failed = true;
        }
      }
    }
  } finally {
    await chrome.kill();
  }

  if (unknownApiRequests.size > 0) {
    console.error(
      `✗ The API stub does not serve ${unknownApiRequests.size} request(s) the pages made:\n` +
        [...unknownApiRequests].map((line) => `  - ${line}`).join('\n') +
        '\nServe them from scripts/lighthouse-stub.mjs with the payload the API returns.'
    );
    failed = true;
  }
} finally {
  killServe(serve);
  apiStub.close();
}

if (failed) {
  console.error('\nLighthouse: thresholds not met, see artifacts/lighthouse/');
  process.exit(1);
}
console.log('\n✓ Lighthouse OK, reports in artifacts/lighthouse/');
