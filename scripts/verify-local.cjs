/**
 * Vérification locale alignée sur le job **lint** + **test-web** + **test-api** de la CI
 * (.github/workflows/ci-cd.yml). À lancer à la racine après `pnpm install` et avec .NET SDK installé.
 * Docker requis (daemon actif) pour l'étape d'audit npm (scan Trivy filesystem, cf. commit 26c9163).
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

run('Export OpenAPI (SKIP_OPENAPI_BUILD)', 'node', ['scripts/export-openapi.cjs'], {
  env: {
    ...process.env,
    SKIP_OPENAPI_BUILD: '1',
    ASPNETCORE_ENVIRONMENT: 'Development',
  },
});

run('Audit npm (Trivy fs — pnpm audit indisponible depuis le 2026-07-15, cf. pnpm/pnpm#11265)', 'docker', [
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
]);
run('Tests front (Vitest + seuils couverture)', 'pnpm', ['run', 'test:coverage', '--filter=web']);

run('Tests API unitaires', 'dotnet', [
  'test',
  'apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj',
  '-c',
  'Debug',
  '--verbosity',
  'normal',
], { env: envMongoEmpty });

run('Tests API intégration', 'dotnet', [
  'test',
  'apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj',
  '-c',
  'Debug',
  '--verbosity',
  'normal',
], { env: envMongoEmpty });

process.stdout.write('\n\x1b[32m✓ verify:local — tout est passé.\x1b[0m\n\n');
