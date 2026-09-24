/**
 * Local verification aligned with the CI **lint** + **test-web** + **test-api** jobs
 * (.github/workflows/ci-cd.yml). Run from the repository root after `pnpm install`, with the
 * .NET SDK installed. Docker (running daemon) is required for the workflows, Terraform, gitleaks
 * and npm audit steps (Trivy filesystem scan, see commit 26c9163).
 *
 * Every gate but the Vitest suite runs in three concurrent lanes (node, dotnet, docker): the
 * gates are independent and the sequential chain cost 11 minutes at rest, 17 under load
 * (measured 2026-09-15). The Vitest suite then runs alone: under CPU contention it fails on
 * timeouts that have nothing to do with the code (see docs/technical-debt.md, Contraintes).
 * Only the docker lane may still be running at that point, its longest step being the Trivy
 * database download, pure network. The first failure kills everything else.
 *
 * Buffered lanes print each step's output when the step ends, so the log stays readable; the
 * Vitest suite streams live as before. A per-step timing table closes the run.
 */
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const envMongoEmpty = { ...process.env, MONGODB_URI: '' };
const isWindows = process.platform === 'win32';

const running = new Set();
const timings = [];
const startedAt = Date.now();
let aborting = false;

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
  sequence([
    () => run('Architecture rules', 'node', ['scripts/check-architecture.mjs']),
    () => run('Script tests', 'node', ['--test', 'scripts/*.test.mjs']),
    () => run('pnpm lint (turbo)', 'pnpm', ['run', 'lint']),
    () => run('ESLint', 'pnpm', ['run', 'lint:eslint']),
    () => run('Prettier check', 'pnpm', ['run', 'format:check']),
  ]);

// Format, tests and the OpenAPI export all read the Release build: they only start once it is
// done, then run side by side. Tests reuse that build (`--no-build`): the API has no
// `#if DEBUG` nor `Debug.Assert`, so the Debug configuration the CI uses would only rebuild the
// same code a second time.
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
        run('dotnet format (verify)', 'dotnet', [
          'format',
          'apps/api-dotnet/MoviePicker.slnx',
          '--verify-no-changes',
          '--no-restore',
          '--verbosity',
          'minimal',
        ]),
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
            run(
              'API integration tests',
              'dotnet',
              [
                'test',
                'apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj',
                '-c',
                'Release',
                '--no-build',
                '--verbosity',
                'normal',
              ],
              { env: envMongoEmpty }
            ),
        ]),
        sequence([
          () =>
            run('OpenAPI export (SKIP_OPENAPI_BUILD)', 'node', ['scripts/export-openapi.cjs'], {
              env: {
                ...process.env,
                SKIP_OPENAPI_BUILD: '1',
                ASPNETCORE_ENVIRONMENT: 'Development',
              },
            }),
          () => run('OpenAPI types (contract drift)', 'node', ['scripts/check-openapi-types.mjs']),
        ]),
      ]),
  ]);

// Same image and same `dir` mode as the CI `gitleaks` job: this gate scans the working tree, not
// the history. Without it locally, a secret-shaped string is only discovered in CI, and that
// happened on 2026-09-10: the `curl-auth-user` rule fires on `curl -u "$TOKEN:"` even when the
// value is a variable name. Keep the digest aligned with `.github/workflows/ci-cd.yml`.
const dockerLane = () =>
  sequence([
    () =>
      run('Workflows (actionlint + shellcheck + zizmor)', 'node', ['scripts/check-workflows.mjs']),
    () => run('Terraform (fmt + validate)', 'node', ['scripts/check-terraform.mjs']),
    () =>
      run('Secrets (Gitleaks, working tree)', 'docker', [
        'run',
        '--rm',
        '-v',
        '.:/repo:ro',
        'ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f',
        'dir',
        '--no-banner',
        '--redact',
        '--verbose',
        '--exit-code',
        '1',
        '/repo',
      ]),
    // `--timeout 15m` only widens Trivy's internal deadline: the 113 MB database download dies on
    // `context deadline exceeded` after the default 5 minutes on a slow link (2026-09-14).
    () =>
      run(
        'npm audit (Trivy fs; pnpm audit unavailable since 2026-07-15, see pnpm/pnpm#11265)',
        'docker',
        [
          'run',
          '--rm',
          '-v',
          './pnpm-lock.yaml:/repo/pnpm-lock.yaml:ro',
          '-v',
          'trivy-cache:/root/.cache/trivy',
          'aquasec/trivy:0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969',
          'fs',
          '--scanners',
          'vuln',
          '--severity',
          'HIGH,CRITICAL',
          '--exit-code',
          '1',
          '--ignore-unfixed',
          '--timeout',
          '15m',
          '/repo/pnpm-lock.yaml',
        ]
      ),
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
  printTimings();
  process.stdout.write('\n\x1b[32m✓ verify:local: everything passed.\x1b[0m\n\n');
}

main();
