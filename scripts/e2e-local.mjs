/**
 * Usage: `pnpm run test:e2e:local [--in-memory] [playwright arguments]`, from the root.
 *
 * Plays the Playwright suite on the workstation while the development servers keep running: the
 * API is built and started in Release on its own port (5010), so it never fights the Debug build
 * the development server holds open, and the web app is built against it. Playwright then reuses
 * that API (no `CI=1`, `reuseExistingServer`) and serves the build itself with `vite preview`.
 * The API runs in test context (`MOVIEPICKER_TEST_CONTEXT=1`), which never reads `.env`.
 *
 * The API runs on MongoDB, as the CI `e2e` job does: by default the workstation test container of
 * `scripts/mongo-replica-set.mjs` (27018), started if needed, whose `moviepicker_e2e` database is
 * dropped first so every run starts as empty as the CI one; `E2E_MONGODB_URI` points elsewhere,
 * and nothing is dropped there. `--in-memory` keeps the in-memory store instead.
 * The web build rewrites the versioned `techMetrics.ts`; it is put back as it was.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_API_PROJECT, E2E_API_URL, e2eApiEnvironment } from '../e2e/apiServer.ts';
import {
  WORKSTATION_CONTAINER,
  WORKSTATION_PORT,
  mongosh,
  startWorkstationMongo,
} from './mongo-replica-set.mjs';

const require = createRequire(import.meta.url);
const { snapshotFile } = require('./file-snapshot.cjs');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const E2E_DATABASE = 'moviepicker_e2e';
const HEALTH_TIMEOUT_MS = 120_000;

const args = process.argv.slice(2);
const inMemory = args.includes('--in-memory');
const playwrightArgs = args.filter((arg) => arg !== '--in-memory');

async function resolveMongoUri() {
  if (inMemory) return '';
  if (process.env.E2E_MONGODB_URI) return process.env.E2E_MONGODB_URI;
  console.log(`▶ MongoDB test container ${WORKSTATION_CONTAINER} on ${WORKSTATION_PORT}`);
  await startWorkstationMongo();
  const dropped = mongosh(
    WORKSTATION_CONTAINER,
    `db.getSiblingDB("${E2E_DATABASE}").dropDatabase()`
  );
  if (!dropped.ok) throw new Error(`could not empty ${E2E_DATABASE}: ${dropped.output}`);
  return `mongodb://127.0.0.1:${WORKSTATION_PORT}/${E2E_DATABASE}?directConnection=true`;
}

function run(title, command, commandArgs, env = process.env) {
  console.log(`▶ ${title}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: root, env, shell: true, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (status) =>
      status === 0 ? resolve() : reject(new Error(`${title} failed (exit ${status})`))
    );
  });
}

function killTree(child) {
  if (!child?.pid) return;
  if (isWindows) {
    spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {}
  }
}

async function apiAnswers() {
  try {
    const response = await fetch(`${E2E_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApi(api) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (api.exitCode !== null) throw new Error(`the API stopped (exit ${api.exitCode})`);
    if (await apiAnswers()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`the API did not answer ${E2E_API_URL}/health within 2 minutes`);
}

const restoreTechMetrics = snapshotFile(
  path.join(root, 'apps/web/src/app/pages/tech/generated/techMetrics.ts')
);
let api = null;
let exitCode = 1;

try {
  if (await apiAnswers()) {
    throw new Error(
      `something already answers on ${E2E_API_URL}: stop it, this script starts its own test API`
    );
  }
  const mongoUri = await resolveMongoUri();
  await Promise.all([
    run('Web build against the test API', 'pnpm', ['--filter', './apps/web', 'run', 'build'], {
      ...process.env,
      VITE_API_URL: E2E_API_URL,
    }),
    run('API build (Release)', 'dotnet', ['build', E2E_API_PROJECT, '-c', 'Release']),
  ]);
  console.log(`▶ Test API on ${E2E_API_URL} (${mongoUri ? 'MongoDB' : 'in memory'})`);
  api = spawn(
    'dotnet',
    ['run', '--project', E2E_API_PROJECT, '-c', 'Release', '--no-build', '--no-launch-profile'],
    {
      cwd: root,
      env: { ...process.env, ...e2eApiEnvironment(mongoUri) },
      shell: true,
      stdio: 'ignore',
      detached: !isWindows,
    }
  );
  await waitForApi(api);
  const playwrightEnv = { ...process.env, E2E_MONGODB_URI: mongoUri };
  delete playwrightEnv.CI;
  await run('Playwright', 'pnpm', ['exec', 'playwright', 'test', ...playwrightArgs], playwrightEnv);
  exitCode = 0;
} catch (error) {
  console.error(`\n✗ ${error.message}`);
} finally {
  killTree(api);
  restoreTechMetrics();
}

process.exit(exitCode);
