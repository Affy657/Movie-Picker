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
 */
import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDir = join(root, '.github', 'workflows');

const ACTIONLINT_IMAGE =
  'rhysd/actionlint@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9';
const ZIZMOR_IMAGE =
  'ghcr.io/zizmorcore/zizmor@sha256:1ba0035c343f50e85fde29beb0d78e4db448eaa0c762a11a09805d241424ee03';

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
