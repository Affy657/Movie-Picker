/**
 * Serves a previous Firebase Hosting version again: one release created on a version the
 * deployment already built, no file uploaded, no gate replayed. That only holds for versions
 * `deploy.yml` created, which `publish-front-firebase.mjs` labels with their commit and run: any
 * unlabelled version (published from a workstation) is ignored, as the archive-based rollback
 * ignored the artifacts of pull request runs.
 *
 *   node scripts/rollback-front-firebase.mjs --site <site-id> [--commit <sha>]
 *
 * Without `--commit`, the target is the version released before the one currently served. The
 * chosen commit is written to `GITHUB_OUTPUT` (`sha`) when the pipeline runs it, so that the
 * Sentry deploy is recorded on the release of origin.
 */
import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const API = 'https://firebasehosting.googleapis.com/v1beta1';

function fail(message) {
  console.error(`\x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) fail(`${name} expects a value.`);
  return value;
}

const site = option('--site', '');
const commit = option('--commit', '');
if (!site) fail('--site <site-id> is required.');
if (commit && !/^[0-9a-f]{7,40}$/.test(commit)) {
  fail(`'${commit}' is not a commit SHA (7 to 40 hexadecimal characters).`);
}

function gcloud(args) {
  const result = spawnSync('gcloud', args, { encoding: 'utf8', shell: true });
  return result.status === 0 ? result.stdout.trim() : '';
}

const token = process.env.GOOGLE_OAUTH_ACCESS_TOKEN || gcloud(['auth', 'print-access-token']);
if (!token) fail('No token: set GOOGLE_OAUTH_ACCESS_TOKEN or authenticate gcloud first.');
const project = process.env.GCP_PROJECT_ID || gcloud(['config', 'get-value', 'project']);
if (!project) fail('No quota project: set GCP_PROJECT_ID or configure a gcloud project.');

async function call(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': project,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) fail(`${method} ${url} -> HTTP ${response.status}\n${text.slice(0, 1500)}`);
  return text ? JSON.parse(text) : {};
}

const { releases = [] } = await call('GET', `${API}/sites/${site}/releases?pageSize=50`);
const deployed = releases
  .filter((release) => release.version?.labels?.commit)
  .map((release) => ({
    time: release.releaseTime,
    version: release.version.name,
    commit: release.version.labels.commit,
    run: release.version.labels.run_id ?? '',
  }));
if (deployed.length === 0)
  fail('No release of a version labelled by deploy.yml: nothing to serve again.');

console.log('Releases of deployed versions (most recent first):');
for (const r of deployed)
  console.log(`  ${r.time}  ${r.commit.slice(0, 8)}  run ${r.run}  ${r.version}`);

let target;
if (commit) {
  const matches = deployed.filter((r) => r.commit.startsWith(commit));
  const versions = new Set(matches.map((r) => r.version));
  if (versions.size !== 1) {
    fail(
      `${versions.size} version(s) for commit '${commit}': exactly one is needed. Give a longer SHA or pick one from the list above.`
    );
  }
  target = matches[0];
} else {
  const current = releases[0]?.version?.name;
  target = deployed.find((r) => r.version !== current);
  if (!target)
    fail(
      'Only one deployed version has ever been released, the one being served: nothing older to serve. Give a commit or redeploy.'
    );
}

const release = await call(
  'POST',
  `${API}/sites/${site}/releases?versionName=${encodeURIComponent(target.version)}`,
  {
    message: `rollback to ${target.commit.slice(0, 8)}`,
  }
);
console.log(
  `Released ${release.name}: ${target.version} (commit ${target.commit}) is served again.`
);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `sha=${target.commit}\n`);
