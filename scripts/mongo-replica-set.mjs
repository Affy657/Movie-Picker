#!/usr/bin/env node
/**
 * Starts the pinned MongoDB image as a single-member replica set, the only topology where the
 * `IUnitOfWork` transactions run, and waits until it accepts writes. The one implementation of
 * that start: `pnpm run test:api:mongo` imports it, and the
 * `.github/actions/start-mongo-replica-set` composite action runs it for the CI jobs and the
 * nightly backup verification. It used to be copied four times, and each copy needed the same two
 * fixes one after the other.
 *
 *   node scripts/mongo-replica-set.mjs --container <name> [--port 27017] [--image <reference>]
 *
 * Two settings that look optional and are not:
 *   - `GLIBC_TUNABLES=glibc.pthread.rseq=1`: MongoDB 8 refuses to start on the Linux 6.19+ kernels
 *     of the runners while TCMalloc owns rseq (SERVER-121912); glibc takes rseq back until a fixed
 *     TCMalloc ships. Harmless on Docker Desktop.
 *   - `HOME=/tmp` on every `mongosh` probe: the image has `HOME=/data/db`, and a probe writing
 *     `.mongodb/mongosh/` there while the entrypoint runs its recursive `chown` kills the container
 *     (constraint C17 of docs/technical-debt.md).
 *
 * The image is pinned by digest: a floating `mongo:8` would let a MongoDB release change what the
 * transaction and index tests run against without any commit saying so, and the backup restores a
 * full copy of the production database into it. `scripts/check-tool-versions.mjs` reads the pin
 * below. An existing container is reused only when it runs this very image on the requested port;
 * otherwise it is recreated, so a bumped pin reaches the workstation container on its next run.
 */
import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const MONGO_IMAGE =
  'mongo:8@sha256:0f64db83d5926400d1cbcbaf35fbf2b0dfa6a4eaa71e04a26481a38cd803b27b';
export const WORKSTATION_CONTAINER = 'movie-picker-mongo-test';
export const WORKSTATION_PORT = process.env.MONGO_TEST_PORT ?? '27018';

const ATTEMPTS = 30;
const DELAY_MS = 2000;
const dockerBin = process.platform === 'win32' ? 'docker.exe' : 'docker';

function docker(args, { inherit = false } = {}) {
  const result = spawnSync(dockerBin, args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  });
  if (result.error) throw result.error;
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() };
}

export function mongosh(container, script) {
  return docker(['exec', '-e', 'HOME=/tmp', container, 'mongosh', '--quiet', '--eval', script]);
}

function runningContainer(container) {
  const inspect = docker(['inspect', '-f', '{{.State.Running}} {{.Config.Image}}', container]);
  if (!inspect.ok) return null;
  const [running, image] = inspect.output.split(' ');
  if (running !== 'true') return null;
  const ports = docker(['port', container, '27017/tcp']).output.split(/\r?\n/);
  return { image, ports };
}

function reusable(container, image, port) {
  const current = runningContainer(container);
  return (
    current !== null &&
    current.image === image &&
    current.ports.some((line) => line.endsWith(`:${port}`))
  );
}

function printDiagnostics(container) {
  if (process.platform === 'linux') spawnSync('uname', ['-r'], { stdio: 'inherit' });
  docker(['version', '--format', '{{.Server.Version}}'], { inherit: true });
  docker(
    [
      'inspect',
      '-f',
      '{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}',
      container,
    ],
    { inherit: true }
  );
  docker(['logs', '--tail', '80', container], { inherit: true });
}

async function waitUntil(container, probe, failure) {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (probe()) return;
    if (runningContainer(container) === null) break;
    await sleep(DELAY_MS);
  }
  printDiagnostics(container);
  throw new Error(failure);
}

const INITIATE_REPLICA_SET = `try {
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] });
} catch (error) {
  if (error.codeName !== "AlreadyInitialized") throw error;
}`;

export async function startMongoReplicaSet({ container, port = '27017', image = MONGO_IMAGE }) {
  if (!reusable(container, image, port)) {
    docker(['rm', '-f', container]);
    const started = docker(
      [
        'run',
        '-d',
        '--name',
        container,
        '-p',
        `${port}:27017`,
        '-e',
        'GLIBC_TUNABLES=glibc.pthread.rseq=1',
        image,
        '--replSet',
        'rs0',
        '--bind_ip_all',
      ],
      { inherit: true }
    );
    if (!started.ok) throw new Error(`docker run ${image} failed for container ${container}`);
  }
  await waitUntil(
    container,
    () => mongosh(container, 'db.runCommand({ ping: 1 }).ok').ok,
    `MongoDB in ${container} never answered a ping`
  );
  const initiated = mongosh(container, INITIATE_REPLICA_SET);
  if (!initiated.ok) {
    console.error(initiated.output);
    printDiagnostics(container);
    throw new Error(`rs.initiate failed in ${container}`);
  }
  await waitUntil(
    container,
    () => mongosh(container, 'db.hello().isWritablePrimary').output === 'true',
    `The replica set in ${container} never became writable primary`
  );
  return `mongodb://127.0.0.1:${port}/?directConnection=true`;
}

export function startWorkstationMongo() {
  return startMongoReplicaSet({ container: WORKSTATION_CONTAINER, port: WORKSTATION_PORT });
}

const invokedAsScript =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedAsScript) {
  const { values } = parseArgs({
    options: {
      container: { type: 'string' },
      port: { type: 'string', default: '27017' },
      image: { type: 'string', default: '' },
    },
  });
  if (!values.container) {
    console.error('::error::--container is required');
    process.exit(1);
  }
  try {
    const uri = await startMongoReplicaSet({
      container: values.container,
      port: values.port,
      image: values.image || MONGO_IMAGE,
    });
    console.log(`MongoDB replica set rs0 ready in ${values.container}: ${uri}`);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
