/** Usage : `pnpm run lighthouse` à la racine (build web puis mesure /, /new, /e/…). */
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
const BUDGETS_PATH = path.join(ROOT, 'configs', 'lighthouse-budgets.json');
const OUT = path.join(ROOT, 'artifacts', 'lighthouse');

/**
 * Routes alignées sur App.tsx : /new (création), pas /create.
 * `indexable: false` => la catégorie SEO n'est pas évaluée contre le seuil
 * (la page est volontairement `Disallow:` dans robots.txt — /new derrière auth,
 * /e/:slug = soirée privée par lien ; Lighthouse pénalise sinon ce qui est
 * justement voulu par la politique d'indexation).
 */
const URLS = [
  { path: '/', slug: 'home', indexable: true },
  { path: '/new', slug: 'new', indexable: false },
  { path: '/e/lighthouse-smoke', slug: 'event-slug', indexable: false },
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

execSync('pnpm --filter web run build', { cwd: ROOT, stdio: 'inherit', shell: true });

if (!fs.existsSync(DIST)) {
  console.error('apps/web/dist introuvable après build.');
  process.exit(1);
}

const budgets = JSON.parse(fs.readFileSync(BUDGETS_PATH, 'utf8'));
const mins = budgets.minimumScores;

fs.mkdirSync(OUT, { recursive: true });

const serve = spawn(`pnpm exec serve -s "${DIST}" -l ${PORT}`, {
  cwd: ROOT,
  stdio: 'ignore',
  shell: true,
});

let failed = false;

try {
  await waitForServer('127.0.0.1', PORT);

  const chrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  try {
    for (const { path: pth, slug, indexable } of URLS) {
      const url = BASE + pth;
      const result = await lighthouse(url, {
        port: chrome.port,
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      });
      const lhr = result.lhr;

      fs.writeFileSync(path.join(OUT, `report-${slug}.json`), JSON.stringify(lhr, null, 2));
      fs.writeFileSync(path.join(OUT, `report-${slug}.html`), generateReport(lhr, 'html'));

      for (const [cat, min] of Object.entries(mins)) {
        const c = lhr.categories[cat];
        if (!c || typeof c.score !== 'number') continue;
        const score = Math.round(c.score * 100);
        const skipSeo = cat === 'seo' && indexable === false;
        const suffix = skipSeo ? ' (non indexable — seuil ignoré)' : ` (min ${min})`;
        console.log(`${slug} — ${cat}: ${score}${suffix}`);
        if (!skipSeo && score < min) {
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
}

if (failed) {
  console.error('\nLighthouse : seuils non atteints — voir artifacts/lighthouse/');
  process.exit(1);
}
console.log('\n✓ Lighthouse OK — rapports dans artifacts/lighthouse/');
