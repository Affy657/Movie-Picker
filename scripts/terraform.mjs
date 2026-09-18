/**
 * Runs the pinned Terraform through Docker, from the repository root. Nothing installed on the
 * machine decides which Terraform runs: the image below does, and `scripts/check-tool-versions.mjs`
 * keeps its tag aligned with `TERRAFORM_VERSION` in `.github/workflows/ci-cd.yml` and with
 * `required_version` in every root module of `infra/terraform/environments/`.
 *
 *   pnpm run terraform -- init
 *   pnpm run terraform -- plan
 *   pnpm run terraform -- --root staging plan        (default root: production)
 *   pnpm run terraform -- fmt -recursive             (fmt runs on the whole infra/terraform tree)
 *   pnpm run terraform -- providers lock             (after a provider bump in versions.tf)
 *
 * Every command but `fmt` runs with `-chdir=environments/<root>`. What the wrapper adds:
 *   - on `providers lock` without any `-platform`, the five platforms of `LOCK_PLATFORMS`: a lock
 *     file written from the container alone would only carry the `h1:` checksum of linux_amd64,
 *     and `init -lockfile=readonly` refuses to install from the plugin cache on any other
 *     platform, the CI runner included when the image is pulled for arm64;
 *   - on `init`, the state bucket as `-backend-config=bucket=…`, read from `TF_STATE_BUCKET`
 *     (environment, else `.env`): the repository is public and names no bucket. `-backend=false`
 *     skips it, that is what the local gate and the CI use;
 *   - `TF_VAR_project_id`, from `GCP_PROJECT_ID` (environment, else `.env`), else the active
 *     gcloud project;
 *   - `GOOGLE_OAUTH_ACCESS_TOKEN`, from `gcloud auth print-access-token`, for every command that
 *     reaches GCP. No key file and no application-default credentials on the machine; the token
 *     is passed by name to Docker, never on its command line.
 *
 * The providers are cached in the `movie-picker-terraform-plugins` Docker volume, and the
 * `.terraform/` working directory of each root lives in `movie-picker-terraform-data`
 * (`TF_DATA_DIR`): a bind mount on Windows cannot hold the symbolic links Terraform creates into
 * its plugin cache, and nothing of it belongs in the working tree. Only `.terraform.lock.hcl` is
 * written next to the configuration, and committed. Two volumes rather than one because
 * Terraform opens the cache directory without creating it: a volume root always exists.
 *
 * `isolatedDataDir` (the gate) uses a second working directory in that volume, `gate/<root>`
 * instead of `roots/<root>`: once a real `init` has configured the remote state in the first one,
 * `init -backend=false` there reuses that backend and asks GCP for credentials, which a gate must
 * never need.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TERRAFORM_IMAGE =
  'hashicorp/terraform:1.16.3@sha256:c9a9d991c113f3bda5269de1506983d45ce1409dfe702df433acf10a5ea9f6bc';
export const TERRAFORM_DIR = 'infra/terraform';
export const ENVIRONMENTS_DIR = `${TERRAFORM_DIR}/environments`;
export const LOCK_PLATFORMS = [
  'linux_amd64',
  'linux_arm64',
  'darwin_amd64',
  'darwin_arm64',
  'windows_amd64',
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_CACHE_VOLUME = 'movie-picker-terraform-plugins';
const DATA_VOLUME = 'movie-picker-terraform-data';
const COMMANDS_WITHOUT_GCP = new Set(['fmt', 'validate', 'version', 'providers', 'graph', 'get']);

export function fail(message) {
  console.error(`\x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}

function readDotEnv() {
  const file = join(root, '.env');
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trimStart().startsWith('#')) continue;
    values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return values;
}

function setting(name) {
  return process.env[name] || readDotEnv()[name] || '';
}

function gcloud(args) {
  const result = spawnSync('gcloud', args, { encoding: 'utf8', shell: true });
  return result.status === 0 ? result.stdout.trim() : '';
}

export function listRoots() {
  const dir = join(root, ENVIRONMENTS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => readdirSync(join(dir, name)).some((file) => file.endsWith('.tf')))
    .sort();
}

export function dockerAvailable() {
  const probe = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    stdio: 'ignore',
    shell: true,
  });
  return probe.status === 0;
}

export function terraform(args, { rootName = 'production', isolatedDataDir = false } = {}) {
  const subcommand = args.find((arg) => !arg.startsWith('-')) ?? '';
  const skipsBackend = args.includes('-backend=false');
  const env = { ...process.env };
  const dockerEnv = ['-e', 'TF_PLUGIN_CACHE_DIR=/terraform/plugin-cache'];

  if (subcommand !== 'fmt') {
    if (!listRoots().includes(rootName)) {
      fail(
        `Unknown root "${rootName}", expected a directory of ${ENVIRONMENTS_DIR}/ holding .tf files (found: ${listRoots().join(', ') || 'none'}).`
      );
    }
    const dataDir = isolatedDataDir ? '/terraform/data/gate' : '/terraform/data/roots';
    dockerEnv.push('-e', `TF_DATA_DIR=${dataDir}/${rootName}`);
    args = [`-chdir=environments/${rootName}`, ...args];
  }

  if (
    subcommand === 'providers' &&
    args.includes('lock') &&
    !args.some((arg) => arg.startsWith('-platform'))
  ) {
    args = [...args, ...LOCK_PLATFORMS.map((platform) => `-platform=${platform}`)];
  }

  if (subcommand === 'init' && !skipsBackend) {
    const bucket = setting('TF_STATE_BUCKET');
    if (!bucket) {
      fail(
        'TF_STATE_BUCKET is not set (environment or .env): the repository names no bucket, see infra/README.md. Pass -backend=false to initialise without the remote state.'
      );
    }
    args = [...args, `-backend-config=bucket=${bucket}`];
  }

  const reachesGcp =
    !COMMANDS_WITHOUT_GCP.has(subcommand) && !(subcommand === 'init' && skipsBackend);
  if (reachesGcp) {
    if (!env.TF_VAR_project_id) {
      env.TF_VAR_project_id =
        setting('GCP_PROJECT_ID') || gcloud(['config', 'get-value', 'project']);
      if (!env.TF_VAR_project_id) {
        fail('GCP_PROJECT_ID is not set (environment or .env) and gcloud has no active project.');
      }
    }
    if (!env.GOOGLE_OAUTH_ACCESS_TOKEN) {
      env.GOOGLE_OAUTH_ACCESS_TOKEN = gcloud(['auth', 'print-access-token']);
      if (!env.GOOGLE_OAUTH_ACCESS_TOKEN) {
        fail('gcloud auth print-access-token returned nothing: run `gcloud auth login` first.');
      }
    }
    dockerEnv.push('-e', 'TF_VAR_project_id', '-e', 'GOOGLE_OAUTH_ACCESS_TOKEN');
  }

  const tty = process.stdin.isTTY && process.stdout.isTTY ? ['-t'] : [];
  return spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '-i',
      ...tty,
      '-v',
      '.:/repo',
      '-v',
      `${PLUGIN_CACHE_VOLUME}:/terraform/plugin-cache`,
      '-v',
      `${DATA_VOLUME}:/terraform/data`,
      '-w',
      `/repo/${TERRAFORM_DIR}`,
      ...dockerEnv,
      TERRAFORM_IMAGE,
      ...args,
    ],
    { stdio: 'inherit', shell: true, cwd: root, env }
  );
}

const invokedAsScript =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedAsScript) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--') argv.shift();
  let rootName = 'production';
  if (argv[0] === '--root') {
    rootName = argv[1] ?? '';
    argv.splice(0, 2);
  }
  if (argv.length === 0) fail('No Terraform command given. Example: pnpm run terraform -- plan');
  if (!dockerAvailable())
    fail(
      'Docker is required: Terraform runs from its pinned image. Start Docker Desktop and run again.'
    );
  const result = terraform(argv, { rootName });
  if (result.error) fail(`docker could not start: ${result.error.message}`);
  process.exit(result.status ?? 1);
}
