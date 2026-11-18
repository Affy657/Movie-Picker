/**
 * What the gates that run a pinned Docker image share: the probe that refuses to run without a
 * Docker daemon, and the `docker run --rm` from the repository root. The same scripts run on the
 * workstation, in `verify:local` and in the CI jobs, Docker being available on the Ubuntu
 * runners, so each tool is pinned once, by digest, in the script that runs it.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function fail(message) {
  console.error(`\x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}

export function requireDocker(reason) {
  const probe = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    stdio: 'ignore',
    shell: true,
  });
  if (probe.status !== 0) {
    fail(`Docker is required for this gate: ${reason}. Start Docker Desktop and run again.`);
  }
}

export function dockerRun(args) {
  return spawnSync('docker', ['run', '--rm', ...args], {
    stdio: 'inherit',
    shell: true,
    cwd: root,
  });
}
