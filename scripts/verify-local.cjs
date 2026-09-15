/**
 * Local verification aligned with the CI **lint** + **test-web** + **test-api** jobs
 * (.github/workflows/ci-cd.yml). Run from the repository root after `pnpm install`, with the
 * .NET SDK installed. Docker (running daemon) is required for the npm audit step (Trivy
 * filesystem scan, see commit 26c9163).
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const envMongoEmpty = { ...process.env, MONGODB_URI: '' };

function run(title, command, args, options = {}) {
  process.stdout.write(`\n\x1b[36m▶\x1b[0m ${title}\n\n`);
  const r = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    cwd: options.cwd || root,
    env: options.env || process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

run('Architecture rules', 'node', ['scripts/check-architecture.mjs']);
run('Workflows (actionlint + shellcheck + zizmor)', 'node', ['scripts/check-workflows.mjs']);
// Same image and same `dir` mode as the CI `gitleaks` job: this gate scans the working tree, not
// the history. Without it locally, a secret-shaped string is only discovered in CI, and that
// happened on 2026-09-10: the `curl-auth-user` rule fires on `curl -u "$TOKEN:"` even when the
// value is a variable name. Keep the digest aligned with `.github/workflows/ci-cd.yml`.
run('Secrets (Gitleaks, working tree)', 'docker', [
  'run',
  '--rm',
  '-v',
  '.:/repo:ro',
  'ghcr.io/gitleaks/gitleaks@sha256:e1b35e12a8c6fa8901f060459cfb6b2fc4c484d3afbe3b029733a3bbfab07055',
  'dir',
  '--no-banner',
  '--redact',
  '--verbose',
  '--exit-code',
  '1',
  '/repo',
]);

run('pnpm lint (turbo)', 'pnpm', ['run', 'lint']);
run('ESLint', 'pnpm', ['run', 'lint:eslint']);
run('Prettier check', 'pnpm', ['run', 'format:check']);

run('dotnet restore', 'dotnet', ['restore', 'apps/api-dotnet/MoviePicker.slnx']);
run('dotnet format (verify)', 'dotnet', [
  'format',
  'apps/api-dotnet/MoviePicker.slnx',
  '--verify-no-changes',
  '--verbosity',
  'minimal',
]);
run('dotnet build Release (warnings → errors)', 'dotnet', [
  'build',
  'apps/api-dotnet/MoviePicker.slnx',
  '-c',
  'Release',
  '--no-restore',
  '-warnaserror',
]);

run('OpenAPI export (SKIP_OPENAPI_BUILD)', 'node', ['scripts/export-openapi.cjs'], {
  env: {
    ...process.env,
    SKIP_OPENAPI_BUILD: '1',
    ASPNETCORE_ENVIRONMENT: 'Development',
  },
});

run('OpenAPI types (contract drift)', 'node', ['scripts/check-openapi-types.mjs']);

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
    'aquasec/trivy@sha256:be1190afcb28352bfddc4ddeb71470835d16462af68d310f9f4bca710961a41e',
    'fs',
    '--scanners',
    'vuln',
    '--severity',
    'HIGH,CRITICAL',
    '--exit-code',
    '1',
    '--ignore-unfixed',
    '/repo/pnpm-lock.yaml',
  ]
);
run('Web tests (Vitest + coverage thresholds)', 'pnpm', ['run', 'test:coverage', '--filter=web']);

run(
  'API unit tests',
  'dotnet',
  [
    'test',
    'apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj',
    '-c',
    'Debug',
    '--verbosity',
    'normal',
  ],
  { env: envMongoEmpty }
);

run(
  'API integration tests',
  'dotnet',
  [
    'test',
    'apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj',
    '-c',
    'Debug',
    '--verbosity',
    'normal',
  ],
  { env: envMongoEmpty }
);

process.stdout.write('\n\x1b[32m✓ verify:local: everything passed.\x1b[0m\n\n');
