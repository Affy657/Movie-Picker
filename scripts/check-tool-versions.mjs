/**
 * Compares the tools pinned by hand in the workflows and the local gates with their latest
 * published version. Dependabot follows the actions, the npm, NuGet and Docker manifests, and
 * nothing else: a `docker run` image, a binary fetched by `curl`, a `dotnet tool install` or a
 * MongoDB tools archive drifts for months without any pull request saying so. gitleaks was six
 * versions of detection rules behind on 2026-09-17, and its gate was green all along.
 *
 * Run by the weekly maintenance pass (`pnpm run check:tools`). Read-only: it reports, the bump
 * is a commit that touches the files named on each line, digest or checksum included.
 *
 * Every pin is read from the file that uses it, never from a list kept here: a pin moved or
 * added without this script knowing shows up as `unreadable`, not as a silent pass.
 *
 * `behind`: a newer version exists. `mismatch`: two files pin different versions of the same
 * tool, the local gate and the CI no longer check the same thing. Exit code 1 on either.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVIRONMENTS_DIR, listRoots } from './terraform.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function capture(path, pattern) {
  const match = read(path).match(pattern);
  return match ? match[1] : null;
}

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'movie-picker-check-tools',
};
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (token) githubHeaders.Authorization = `Bearer ${token}`;

async function json(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
}

async function latestGithubRelease(repo) {
  const release = await json(`https://api.github.com/repos/${repo}/releases/latest`, githubHeaders);
  return String(release.tag_name).replace(/^v/, '');
}

const STABLE = /^\d+\.\d+\.\d+$/;

function newest(versions) {
  return versions
    .filter((v) => STABLE.test(v))
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return pa[i] - pb[i];
      return 0;
    })
    .at(-1);
}

async function latestNuget(packageId) {
  const index = await json(`https://api.nuget.org/v3-flatcontainer/${packageId}/index.json`);
  return newest(index.versions);
}

async function latestMongoTools() {
  const manifest = await json('https://downloads.mongodb.org/tools/db/full.json');
  return newest(manifest.versions.map((v) => v.version));
}

async function dockerHubDigest(repository, tag) {
  const data = await json(`https://hub.docker.com/v2/repositories/${repository}/tags/${tag}`);
  return data.digest;
}

const tools = [
  {
    name: 'actionlint',
    pins: [
      { file: '.github/workflows/ci-cd.yml', pattern: /ACTIONLINT_VERSION: "([^"]+)"/ },
      { file: 'scripts/check-workflows.mjs', pattern: /rhysd\/actionlint:([^@']+)@/ },
    ],
    latest: () => latestGithubRelease('rhysd/actionlint'),
  },
  {
    name: 'zizmor',
    pins: [
      { file: '.github/workflows/ci-cd.yml', pattern: /ZIZMOR_VERSION: "([^"]+)"/ },
      { file: 'scripts/check-workflows.mjs', pattern: /zizmorcore\/zizmor:([^@']+)@/ },
    ],
    latest: () => latestGithubRelease('zizmorcore/zizmor'),
  },
  {
    name: 'gitleaks',
    pins: [
      { file: '.github/workflows/ci-cd.yml', pattern: /gitleaks\/gitleaks:v([^@"]+)@/ },
      { file: 'scripts/verify-local.cjs', pattern: /gitleaks\/gitleaks:v([^@']+)@/ },
    ],
    latest: () => latestGithubRelease('gitleaks/gitleaks'),
  },
  {
    name: 'sentry-cli',
    // The lockfile version is what Dependabot moves; the workflow pins must follow it, and the
    // latest release is only information until `@sentry/vite-plugin` pulls it in.
    pins: [
      { file: '.github/workflows/deploy.yml', pattern: /SENTRY_CLI_VERSION: "([^"]+)"/ },
      { file: '.github/workflows/rollback-front.yml', pattern: /SENTRY_CLI_VERSION: "([^"]+)"/ },
      { file: 'pnpm-lock.yaml', pattern: /'@sentry\/cli@([^']+)'/ },
    ],
    latest: () => latestGithubRelease('getsentry/sentry-cli'),
    informationalLatest: true,
  },
  {
    name: 'dotnet-sonarscanner',
    pins: [{ file: '.github/workflows/ci-cd.yml', pattern: /SONARSCANNER_VERSION: "([^"]+)"/ }],
    latest: () => latestNuget('dotnet-sonarscanner'),
  },
  {
    name: 'mongodb-database-tools',
    pins: [{ file: '.github/workflows/backup-mongo.yml', pattern: /MDB_TOOLS_VERSION: "([^"]+)"/ }],
    latest: latestMongoTools,
  },
  {
    name: 'mongo image (tag 8)',
    pins: [
      { file: '.github/workflows/ci-cd.yml', pattern: /MONGO_IMAGE: "mongo:8@(sha256:[0-9a-f]+)"/ },
      {
        file: '.github/workflows/backup-mongo.yml',
        pattern: /MONGO_IMAGE: "mongo:8@(sha256:[0-9a-f]+)"/,
      },
    ],
    latest: () => dockerHubDigest('library/mongo', '8'),
  },
  {
    name: 'trivy (local gate)',
    pins: [{ file: 'scripts/verify-local.cjs', pattern: /aquasec\/trivy:([^@']+)@/ }],
    latest: () => latestGithubRelease('aquasecurity/trivy'),
  },
  // The providers are Dependabot's (terraform ecosystem); the binary is pinned in three places,
  // the CI, the local image and every root module, which must agree.
  {
    name: 'terraform',
    pins: [
      { file: '.github/workflows/ci-cd.yml', pattern: /TERRAFORM_VERSION: "([^"]+)"/ },
      { file: 'scripts/terraform.mjs', pattern: /hashicorp\/terraform:([^@']+)@/ },
      ...listRoots().map((rootName) => ({
        file: `${ENVIRONMENTS_DIR}/${rootName}/versions.tf`,
        pattern: /required_version = "([^"]+)"/,
      })),
    ],
    latest: () => latestGithubRelease('hashicorp/terraform'),
  },
];

function short(value) {
  return value.startsWith('sha256:') ? value.slice(0, 19) : value;
}

let failures = 0;
for (const tool of tools) {
  const pinned = tool.pins.map((pin) => ({ ...pin, value: capture(pin.file, pin.pattern) }));
  const files = pinned.map((pin) => pin.file).join(', ');
  const unreadable = pinned.filter((pin) => pin.value === null);
  if (unreadable.length > 0) {
    failures += 1;
    console.log(
      `unreadable  ${tool.name}: pin not found in ${unreadable.map((p) => p.file).join(', ')}`
    );
    continue;
  }
  const values = [...new Set(pinned.map((pin) => pin.value))];
  if (values.length > 1) {
    failures += 1;
    console.log(
      `mismatch    ${tool.name}: ${pinned.map((pin) => `${pin.file} pins ${short(pin.value)}`).join(', ')}`
    );
    continue;
  }
  const current = values[0];
  let latest;
  try {
    latest = await tool.latest();
  } catch (error) {
    failures += 1;
    console.log(`unreachable ${tool.name} ${short(current)} (${files}): ${error.message}`);
    continue;
  }
  if (latest === current) {
    console.log(`ok          ${tool.name} ${short(current)} (${files})`);
  } else if (tool.informationalLatest) {
    console.log(
      `ok          ${tool.name} ${current} (${files}), latest release ${latest}, follows the lockfile`
    );
  } else {
    failures += 1;
    console.log(`behind      ${tool.name} ${short(current)} -> ${short(latest)} (${files})`);
  }
}

if (failures > 0) {
  console.log(
    `\n${failures} tool(s) to bring up to date: edit the files named above, digest or checksum included.`
  );
  process.exit(1);
}
console.log('\nEvery hand-pinned tool is at its latest published version.');
