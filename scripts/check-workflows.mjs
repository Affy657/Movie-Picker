/**
 * The `lint-workflows` gate: the CI job and `verify:local` both run this script.
 *
 * Both tools run through Docker, pinned by digest, for one precise reason: actionlint delegates
 * `run:` blocks to shellcheck and **silently skips** that half of its work when shellcheck is not
 * in the PATH. A dev machine without shellcheck would have a green gate checking half of what the
 * CI checks. The `rhysd/actionlint` image ships its own shellcheck, so the workstation and the
 * runner check the same thing with the same version, and each tool is pinned once, here.
 *
 * The file list is discovered, never hardcoded: a workflow added later and forgotten in a list
 * would escape the gate without anything saying so.
 *
 * No third YAML parsing gate: actionlint returns `could not parse as YAML` on a badly indented
 * file, checked on a test file. It would be redundant.
 *
 * zizmor reads `.github/` whole, composite actions and `dependabot.yml` included, at the `medium`
 * threshold, `--offline` so that the gate does not depend on the GitHub API.
 *
 * The images carry their version tag next to the digest: the digest is what Docker resolves,
 * the tag is what `scripts/check-tool-versions.mjs` compares with the latest release.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dockerRun, fail, requireDocker } from './docker-gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDir = join(root, '.github', 'workflows');

const ACTIONLINT_IMAGE =
  'rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667';
const ZIZMOR_IMAGE =
  'ghcr.io/zizmorcore/zizmor:1.33.1@sha256:ecd3ffe6158de1322e05a044ed43749bee12b1dccb7e1a7859bc6ac4b2a1c516';

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

requireDocker('actionlint ships shellcheck, without it half of the run: blocks would go unchecked');

const mount = ['-v', './.github:/repo/.github:ro', '-w', '/repo'];

console.log(`actionlint + shellcheck on ${workflows.length} workflows`);
const actionlint = dockerRun([...mount, ACTIONLINT_IMAGE, '-color', ...workflows]);
if (actionlint.status !== 0) {
  fail('actionlint reported findings.');
}

console.log('zizmor (security audit, medium threshold, workflows and composite actions)');
const zizmor = dockerRun([
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
