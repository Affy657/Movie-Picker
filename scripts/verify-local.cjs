/**
 * Local verification aligned with the CI jobs of `.github/workflows/ci-cd.yml` but the E2E suite
 * and Sonar: every gate the CI shares with the workstation is called through the same
 * `pnpm run` entry point (`check:static`, `format:dotnet:check`, `test:api:mongo`,
 * `openapi:*`, `check:workflows`, `check:terraform`, `check:secrets`, `check:audit`), so the
 * list of what a gate runs lives in one place. Run from the repository root after
 * `pnpm install`, with the .NET SDK installed. Docker (running daemon) is required for the
 * MongoDB of the integration suite and for the whole docker lane.
 *
 * Every gate but the Vitest suite runs in three concurrent lanes (node, dotnet, docker): the
 * gates are independent and the sequential chain cost 11 minutes at rest, 17 under load
 * (measured 2026-09-15). The Vitest suite then runs alone: under CPU contention it fails on
 * timeouts that have nothing to do with the code (see docs/technical-debt.md, Contraintes).
 * Only the docker lane may still be running at that point, its longest step being the Trivy
 * database download, pure network. The first failure kills everything else.
 *
 * The web build closes the run, once the docker lane is over: it empties and rewrites `dist`
 * while Gitleaks would be reading it (see docs/technical-debt.md, C16), and it regenerates the
 * versioned `techMetrics.ts`, put back as it was whatever the outcome.
 *
 * Buffered lanes print each step's output when the step ends, so the log stays readable; the
 * Vitest suite streams live as before. A per-step timing table closes the run.
 */
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const { snapshotFile } = require('./file-snapshot.cjs');

const root = path.join(__dirname, '..');
const envMongoEmpty = { ...process.env, MONGODB_URI: '' };
const isWindows = process.platform === 'win32';
const generatedTechMetrics = path.join(
  root,
  'apps',
  'web',
  'src',
  'app',
  'pages',
  'tech',
  'generated',
  'techMetrics.ts'
);

const running = new Set();
const timings = [];
const startedAt = Date.now();
let aborting = false;
let restoreGeneratedFiles = () => {};

function seconds(ms) {
  return `${(ms / 1000).toFixed(1)} s`;
}

function killTree(child) {
  if (isWindows) {
    spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {}
  }
}

function abort(title, status, output) {
  if (aborting) return;
  aborting = true;
  for (const child of running) killTree(child);
  restoreGeneratedFiles();
  if (output) process.stdout.write(output);
  process.stdout.write(`\n\x1b[31m✗ ${title} failed (exit ${status}).\x1b[0m\n\n`);
  process.exit(typeof status === 'number' && status !== 0 ? status : 1);
}

process.on('SIGINT', () => abort('verify:local', 130));

function run(title, command, args, options = {}) {
  const live = options.live === true;
  process.stdout.write(`\x1b[36m▶\x1b[0m ${title}${live ? '\n\n' : ' …\n'}`);
  const t0 = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: live ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: !isWindows,
      cwd: options.cwd || root,
      env: options.env || process.env,
    });
    running.add(child);
    const chunks = [];
    if (!live) {
      child.stdout.on('data', (d) => chunks.push(d));
      child.stderr.on('data', (d) => chunks.push(d));
    }
    child.on('error', (error) => {
      running.delete(child);
      abort(title, 1, `${error}\n`);
    });
    child.on('close', (status) => {
      running.delete(child);
      const elapsed = Date.now() - t0;
      timings.push({ title, elapsed });
      const output = live ? '' : Buffer.concat(chunks).toString();
      if (status !== 0) {
        abort(title, status, live ? '' : `\n\x1b[36m▶\x1b[0m ${title}\n\n${output}`);
        return;
      }
      if (!live) process.stdout.write(`\n\x1b[36m▶\x1b[0m ${title}\n\n${output}`);
      process.stdout.write(`\x1b[32m✓\x1b[0m ${title} (${seconds(elapsed)})\n`);
      resolve();
    });
  });
}

async function sequence(steps) {
  for (const step of steps) await step();
}

const nodeLane = () =>
  run('Static gates (architecture, script tests, tsc, ESLint, Prettier, knip)', 'pnpm', [
    'run',
    'check:static',
  ]);

// Format, unit tests and the OpenAPI export all read the Release build: they only start once it
// is done, then run side by side. Unit tests reuse that build (`--no-build`): the API has no
// `#if DEBUG` nor `Debug.Assert`, so the Debug configuration would only rebuild the same code a
// second time. The integration suite runs on MongoDB through `test:api:mongo`, as the CI
// `test-api` job does, Debug build, Mongo adapters coverage gate and the script queries of
// `scripts/mongo-tests/` included.
const dotnetLane = () =>
  sequence([
    () => run('dotnet restore', 'dotnet', ['restore', 'apps/api-dotnet/MoviePicker.slnx']),
    () =>
      run('dotnet build Release (warnings → errors)', 'dotnet', [
        'build',
        'apps/api-dotnet/MoviePicker.slnx',
        '-c',
        'Release',
        '--no-restore',
        '-warnaserror',
      ]),
    () =>
      Promise.all([
        run('dotnet format whitespace + style (verify)', 'pnpm', ['run', 'format:dotnet:check']),
        sequence([
          () =>
            run(
              'API unit tests',
              'dotnet',
              [
                'test',
                'apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj',
                '-c',
                'Release',
                '--no-build',
                '--verbosity',
                'normal',
              ],
              { env: envMongoEmpty }
            ),
          () =>
            run('API integration tests on MongoDB + coverage gate + script queries', 'pnpm', [
              'run',
              'test:api:mongo',
            ]),
        ]),
        sequence([
          () =>
            run('OpenAPI export (SKIP_OPENAPI_BUILD)', 'pnpm', ['run', 'openapi:export'], {
              env: {
                ...process.env,
                SKIP_OPENAPI_BUILD: '1',
                ASPNETCORE_ENVIRONMENT: 'Development',
              },
            }),
          () => run('OpenAPI types (contract drift)', 'pnpm', ['run', 'openapi:types:check']),
        ]),
      ]),
  ]);

// The same scripts as the CI `gitleaks`, `lint-workflows`, `lint-terraform` and `audit` jobs,
// each running its tool from an image pinned by digest. Gitleaks goes first: it reads the whole
// tree, and the dotnet lane only starts rewriting `coverage-mongo/` and the Debug build minutes
// later (docs/technical-debt.md, C16).
const dockerLane = () =>
  sequence([
    () => run('Secrets (Gitleaks, working tree)', 'pnpm', ['run', 'check:secrets']),
    () => run('Workflows (actionlint + shellcheck + zizmor)', 'pnpm', ['run', 'check:workflows']),
    () => run('Terraform (fmt + validate)', 'pnpm', ['run', 'check:terraform']),
    () =>
      run('npm audit (Trivy, HIGH with a fix, then every CRITICAL)', 'pnpm', [
        'run',
        'check:audit',
      ]),
  ]);

function printTimings() {
  const width = Math.max(...timings.map((t) => t.title.length));
  process.stdout.write('\n');
  for (const { title, elapsed } of timings) {
    process.stdout.write(`  ${title.padEnd(width)}  ${seconds(elapsed).padStart(8)}\n`);
  }
  process.stdout.write(
    `  ${'wall clock'.padEnd(width)}  ${seconds(Date.now() - startedAt).padStart(8)}\n`
  );
}

async function webBuild() {
  restoreGeneratedFiles = snapshotFile(generatedTechMetrics);
  await run('Web build (metrics, tsc, vite, bundle secrets, prerender)', 'pnpm', [
    '--filter',
    'web',
    'run',
    'build',
  ]);
  restoreGeneratedFiles();
}

async function main() {
  const docker = dockerLane();
  await Promise.all([nodeLane(), dotnetLane()]);
  await run(
    'Web tests (Vitest + coverage thresholds)',
    'pnpm',
    ['run', 'test:coverage', '--filter=web'],
    {
      live: true,
    }
  );
  await docker;
  await webBuild();
  printTimings();
  process.stdout.write('\n\x1b[32m✓ verify:local: everything passed.\x1b[0m\n\n');
}

main();
