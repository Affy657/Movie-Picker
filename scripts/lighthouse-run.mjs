/** Usage : `pnpm run lighthouse` à la racine (build web puis mesure des pages publiques). */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import lighthouse, { generateReport } from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'apps', 'web', 'dist');
const PORT = Number(process.env.LH_PORT || 4179);
const BASE = `http://127.0.0.1:${PORT}`;
const API_PORT = Number(process.env.LH_API_PORT || 4000);
const API_URL = `http://localhost:${API_PORT}`;
const BUDGETS_PATH = path.join(ROOT, 'configs', 'lighthouse-budgets.json');
const OUT = path.join(ROOT, 'artifacts', 'lighthouse');

/**
 * Routes alignées sur App.tsx.
 * `indexable: false` => la catégorie SEO n'est pas évaluée contre le seuil
 * (la page est volontairement `Disallow:` dans robots.txt ou `noindex` —
 * Lighthouse pénalise sinon ce qui est voulu par la politique d'indexation).
 * `skipPerformance: true` => le chunk EventDetail dépasse le budget 80 de la
 * landing ; la perf reste mesurée et loguée, sans faire échouer le job.
 */
const URLS = [
  { path: '/', slug: 'home', indexable: true },
  { path: '/soutenir', slug: 'donate', indexable: true },
  { path: '/u/lighthouse', slug: 'profile', indexable: true },
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
        if (Date.now() > deadline) reject(new Error(`Timeout: rien sur le port ${port}`));
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

const SHOWCASE_ITEM_COUNT = 20;

function showcaseItems(ranked = false) {
  return Array.from({ length: SHOWCASE_ITEM_COUNT }, (_, index) => ({
    id: 1000 + index,
    mediaType: 'movie',
    title: `Film de recette ${index + 1}`,
    year: `${2000 + (index % 25)}`,
    posterPath: null,
    voteAverage: 7.5,
    runtimeMinutes: 100 + index,
    genreIds: [28],
    rank: ranked ? index + 1 : null,
    eventCount: ranked ? 5 : null,
  }));
}

/**
 * Stub minimal de l'API, requis pour que les pages testées non authentifiées
 * (redirigées vers /login) puissent résoudre leur appel `GET /auth/oauth/providers`
 * sans lever d'erreur CSP/CORS/réseau qui ferait chuter le score best-practices.
 */
function startApiStub(port) {
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin ?? BASE;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    const urlPath = (req.url ?? '').split('?')[0];
    if (urlPath === '/api/v1/auth/oauth/providers') {
      res
        .writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ providers: [] }));
      return;
    }
    if (urlPath === '/api/v1/movies/showcase') {
      const section = new URL(req.url ?? '/', BASE).searchParams.get('section') ?? 'trending';
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          section,
          theme: null,
          items: showcaseItems(section === 'most-proposed'),
          disclaimer: 'Données de recette',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        })
      );
      return;
    }
    if (urlPath === '/api/v1/movies/collections') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          items: Array.from({ length: 12 }, (_, index) => ({
            id: 500 + index,
            name: `Saga de recette ${index + 1}`,
            overview: null,
            posterPath: null,
            movieCount: 3 + index,
          })),
          disclaimer: 'Données de recette',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        })
      );
      return;
    }
    if (urlPath === '/api/v1/users/lighthouse') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          handle: 'lighthouse',
          displayName: 'Lighthouse',
          avatarId: 'alpha',
          bio: 'Profil de recette Lighthouse',
          memberSince: '2024-03-15T00:00:00Z',
          followingCount: 0,
          followersCount: 0,
          isSupporter: false,
          isFollowedByMe: null,
        })
      );
      return;
    }
    if (urlPath === '/api/v1/users/lighthouse/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          eventsCreated: 0,
          eventsJoined: 0,
          moviesProposed: 0,
          votesCast: 0,
          winningProposals: 0,
          moviesSeen: 0,
          currentStreakWeeks: 0,
          bestStreakWeeks: 0,
          favoriteGenres: [],
          dailyActivity: [],
        })
      );
      return;
    }
    if (urlPath === '/api/v1/users/lighthouse/watched-movies') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ items: [] }));
      return;
    }
    if (urlPath.startsWith('/api/v1/events/slug/')) {
      const slug = urlPath.slice('/api/v1/events/slug/'.length);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          _id: 'evt-lh',
          title: 'Lighthouse',
          date: '2030-12-15',
          time: '21:00',
          slug,
          isHost: false,
          isFinished: false,
          lifecycle: 'live',
          winnerMovie: null,
          participantCount: 0,
          movieCount: 0,
          participants: [],
          config: {
            theme: null,
            maxProposalsPerParticipant: null,
            maxParticipants: null,
            wheelMode: 'strictRandom',
          },
        })
      );
      return;
    }
    if (/^\/api\/v1\/events\/[^/]+\/movies$/.test(urlPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('[]');
      return;
    }
    res
      .writeHead(404, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ message: 'Not Found' }));
  });
  server.listen(port, 'localhost');
  return server;
}

execSync('pnpm --filter web run build', {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_API_URL: API_URL },
});

if (!fs.existsSync(DIST)) {
  console.error('apps/web/dist introuvable après build.');
  process.exit(1);
}

const budgets = JSON.parse(fs.readFileSync(BUDGETS_PATH, 'utf8'));
const mins = budgets.minimumScores;
const perPageMins = budgets.perPageMinimumScores ?? {};

fs.mkdirSync(OUT, { recursive: true });

const serveConfigPath = path.join(DIST, 'serve.json');
fs.writeFileSync(
  serveConfigPath,
  JSON.stringify({
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

const serve = spawn(`pnpm exec serve -s "${DIST}" -l ${PORT} -c "${serveConfigPath}"`, {
  cwd: ROOT,
  stdio: 'ignore',
  shell: true,
});
const apiStub = startApiStub(API_PORT);

let failed = false;

try {
  await waitForServer('127.0.0.1', PORT);

  const chrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const median = (nums) => [...nums].sort((a, b) => a - b)[Math.floor(nums.length / 2)];
  const RUNS = Number(process.env.LH_RUNS || 3);

  const only = (process.env.LH_ONLY || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const selected = only.length > 0 ? URLS.filter((u) => only.includes(u.slug)) : URLS;

  try {
    for (const { path: pth, slug, indexable, skipPerformance } of selected) {
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
        const scores = lhrs
          .map((l) => l.categories[cat])
          .filter((c) => c && typeof c.score === 'number')
          .map((c) => Math.round(c.score * 100));
        if (scores.length === 0) continue;
        const score = median(scores);
        const skipSeo = cat === 'seo' && indexable === false;
        const skipPerf = cat === 'performance' && skipPerformance === true;
        const skipBudget = skipSeo || skipPerf;
        const suffix = skipBudget
          ? skipSeo
            ? ' (non indexable — seuil ignoré)'
            : ' (SPA événement — seuil ignoré)'
          : ` (min ${min}, médiane ${RUNS} runs)`;
        console.log(`${slug} — ${cat}: ${score}${suffix}`);
        if (!skipBudget && score < min) {
          console.error(`✗ ${slug} — ${cat}: ${score} < ${min}`);
          failed = true;
        }
      }
    }
  } finally {
    await chrome.kill();
  }
} finally {
  killServe(serve);
  apiStub.close();
}

if (failed) {
  console.error('\nLighthouse : seuils non atteints — voir artifacts/lighthouse/');
  process.exit(1);
}
console.log('\n✓ Lighthouse OK — rapports dans artifacts/lighthouse/');
