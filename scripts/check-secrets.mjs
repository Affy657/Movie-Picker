/**
 * Gitleaks on the working tree, in `dir` mode: it scans the files as they are, never the history.
 * The CI `gitleaks` job and `verify:local` both run this script. Without the local run, a
 * secret-shaped string was only discovered in CI, and that happened on 2026-09-10: the
 * `curl-auth-user` rule fires on `curl -u "$TOKEN:"` even when the value is a variable name
 * (AGENTS.md lists the other traps). `.gitleaks.toml` allowlists the local `.env` only.
 */
import { dockerRun, fail, requireDocker } from './docker-gate.mjs';

const GITLEAKS_IMAGE =
  'ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f';

requireDocker('Gitleaks runs from its pinned image');

const scan = dockerRun([
  '-v',
  '.:/repo:ro',
  GITLEAKS_IMAGE,
  'dir',
  '--no-banner',
  '--redact',
  '--verbose',
  '--exit-code',
  '1',
  '/repo',
]);
if (scan.status !== 0) {
  fail('Gitleaks reported a secret-shaped string in the working tree (findings above).');
}

console.log('\x1b[32m✓\x1b[0m Secrets: Gitleaks reports nothing in the working tree.');
