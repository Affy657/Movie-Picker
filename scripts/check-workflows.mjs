/**
 * Replays the CI `lint-workflows` job locally, at the same versions.
 *
 * Both tools run through Docker, pinned by digest, for one precise reason: actionlint delegates
 * `run:` blocks to shellcheck and **silently skips** that half of its work when shellcheck is not
 * in the PATH. A dev machine without shellcheck would have a green gate checking half of what the
 * CI checks. The `rhysd/actionlint` image ships shellcheck 0.10.0, exactly the version the CI uses.
 *
 * The file list is discovered, never hardcoded: a workflow added later and forgotten in a list
 * would escape the gate without anything saying so.
 *
 * No third YAML parsing gate: actionlint returns `could not parse as YAML` on a badly indented
 * file, checked on a test file. It would be redundant.
 *
 * The images carry their version tag next to the digest: the digest is what Docker resolves,
 * the tag is what `scripts/check-tool-versions.mjs` compares with `ACTIONLINT_VERSION` and
 * `ZIZMOR_VERSION` in `.github/workflows/ci-cd.yml`.
 */
import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDir = join(root, '.github', 'workflows');

const ACTIONLINT_IMAGE =
  'rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667';
const ZIZMOR_IMAGE =
  'ghcr.io/zizmorcore/zizmor:1.30.1@sha256:a2eb396d886c053073405c7a980f2139ba2248ec172243cfa3841e57196e8101';

function fail(message) {
  console.error(`\x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}

if (!existsSync(workflowsDir)) {
  fail('.github/workflows not found.');
}

const workflows = readdirSync(workflowsDir)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort()
  .map((name) => `.github/workflows/${name}`);

if (workflows.length === 0) {
  fail('No workflow found in .github/workflows.');
}

function docker(args) {
  return spawnSync('docker', args, { stdio: 'inherit', shell: true, cwd: root });
}

const dockerAvailable = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
  stdio: 'ignore',
  shell: true,
});
if (dockerAvailable.status !== 0) {
  fail(
    'Docker is required for this gate (actionlint ships shellcheck, without it half of the run: blocks would go unchecked). Start Docker Desktop and run again.'
  );
}

const mount = ['-v', './.github:/repo/.github:ro', '-w', '/repo'];

console.log(`actionlint + shellcheck on ${workflows.length} workflows`);
const actionlint = docker(['run', '--rm', ...mount, ACTIONLINT_IMAGE, '-color', ...workflows]);
if (actionlint.status !== 0) {
  fail('actionlint reported findings.');
}

console.log('zizmor (security audit, medium threshold, workflows and composite actions)');
const zizmor = docker([
  'run',
  '--rm',
  ...mount,
  ZIZMOR_IMAGE,
  '--offline',
  '--no-progress',
  '--min-severity',
  'medium',
  '--format',
  'plain',
  '.github/',
]);
if (zizmor.status !== 0) {
  fail('zizmor reported findings of medium severity or higher.');
}

console.log(`\x1b[32m✓\x1b[0m Workflows: actionlint and zizmor report nothing.`);
