/**
 * Vulnerability audit of the npm lockfile with Trivy, the CI `audit` job and `verify:local` both
 * run this script (`pnpm audit` is unavailable since the npm endpoint was removed on 2026-07-15,
 * see pnpm/pnpm#11265). Two passes, because `--ignore-unfixed` applies to every severity of a run:
 * a HIGH blocks once a fix is published, a CRITICAL blocks with or without one. Same split as the
 * image gate of `deploy.yml`.
 *
 * The image is pinned by digest and the database lives in a Docker volume, never in the GHA
 * cache, which the jobs running the code of the lockfile can write: a poisoned entry would blind
 * this gate. `--timeout 15m` only widens Trivy's internal deadline, the 113 MB database download
 * died on `context deadline exceeded` after the default 5 minutes on a slow link (2026-09-14).
 * The second pass reads the database the first one left in the volume.
 *
 * `deploy.yml` scans the API image with the Trivy binary of `.github/actions/install-trivy`:
 * `scripts/check-tool-versions.mjs` keeps that binary and this image on the same version.
 */
import { dockerRun, fail, requireDocker } from './docker-gate.mjs';

const TRIVY_IMAGE =
  'aquasec/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb';

const PASSES = [
  { label: 'HIGH with a published fix', severity: ['--severity', 'HIGH', '--ignore-unfixed'] },
  { label: 'every CRITICAL', severity: ['--severity', 'CRITICAL'] },
];

requireDocker('Trivy runs from its pinned image');

const failed = [];
for (const pass of PASSES) {
  console.log(`Trivy on pnpm-lock.yaml: ${pass.label}`);
  const scan = dockerRun([
    '-v',
    './pnpm-lock.yaml:/repo/pnpm-lock.yaml:ro',
    '-v',
    'trivy-cache:/root/.cache/trivy',
    TRIVY_IMAGE,
    'fs',
    '--scanners',
    'vuln',
    ...pass.severity,
    '--exit-code',
    '1',
    '--timeout',
    '15m',
    '/repo/pnpm-lock.yaml',
  ]);
  if (scan.status !== 0) failed.push(pass.label);
}

if (failed.length > 0) {
  fail(`Trivy reported vulnerabilities in pnpm-lock.yaml (${failed.join(', ')}, findings above).`);
}

console.log('\x1b[32m✓\x1b[0m npm audit: no HIGH with a fix, no CRITICAL in pnpm-lock.yaml.');
