/**
 * Publishes a web build to Firebase Hosting through its REST API, the way `firebase deploy`
 * does, without the CLI: one version created with the config of `infra/firebase-hosting.json`,
 * the files hashed and uploaded, the version finalized, then released. Any bearer token that can
 * write Hosting does (`GOOGLE_OAUTH_ACCESS_TOKEN`, else `gcloud auth print-access-token`), so the
 * same script runs from a workstation and from the pipeline behind Workload Identity Federation,
 * with no key file and no npm package holding cloud credentials.
 *
 *   node scripts/publish-front-firebase.mjs --site <site-id> [--dist apps/web/dist] [--dry-run]
 *
 * The quota project (`x-goog-user-project`) is `GCP_PROJECT_ID`, else the active gcloud project:
 * with a user token the Hosting API refuses every call without it, as the Firebase APIs do under
 * Terraform (`user_project_override` in providers.tf).
 *
 * What is published is what `.github/actions/publish-front` sends to S3, laid out for Hosting:
 *   - every file of the build but the source maps, `route-assets.json` and the prerender manifest;
 *   - each prerendered route as `<route>/index.html`: Hosting serves that file for the route
 *     itself (`trailingSlashBehavior: REMOVE` in the config redirects the slashed form to it), where the S3
 *     origin needed an extensionless key. The generic shell keeps answering every other path
 *     through the `**` rewrite.
 * The cache tiers and the security headers are the config's, not the script's: they live next to
 * the CloudFront policy they mirror, and a change there is reviewed as infrastructure.
 *
 * Nothing here is deleted or overwritten: a version is immutable, a release points the site at
 * it, and the previous release stays listed, which is what `rollback-front-firebase.mjs` uses.
 * In the pipeline the version is labelled with the commit and the run that built it
 * (`GITHUB_SHA`, `GITHUB_RUN_ID`): that is how a rollback names a version by commit, and how the
 * provenance of what is served stays readable in the Hosting console.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, posix, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://firebasehosting.googleapis.com/v1beta1';
const HASHES_PER_POPULATE_CALL = 1000;

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
const dist = join(root, option('--dist', 'apps/web/dist'));
const configPath = join(root, option('--config', 'infra/firebase-hosting.json'));
const dryRun = process.argv.includes('--dry-run');
if (!site) fail('--site <site-id> is required.');

function quotaProject() {
  if (process.env.GCP_PROJECT_ID) return process.env.GCP_PROJECT_ID;
  const result = spawnSync('gcloud', ['config', 'get-value', 'project'], {
    encoding: 'utf8',
    shell: true,
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function accessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  const result = spawnSync('gcloud', ['auth', 'print-access-token'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0 || !result.stdout.trim()) {
    fail('No token: set GOOGLE_OAUTH_ACCESS_TOKEN or authenticate gcloud first.');
  }
  return result.stdout.trim();
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const EXCLUDED = new Set(['route-assets.json', 'prerendered/manifest.json']);

function hostingPath(file) {
  const rel = relative(dist, file).split(sep).join(posix.sep);
  if (rel.endsWith('.map') || EXCLUDED.has(rel)) return null;
  if (rel.startsWith('prerendered/')) return null;
  return `/${rel}`;
}

function prerenderedFiles() {
  const manifest = JSON.parse(readFileSync(join(dist, 'prerendered', 'manifest.json'), 'utf8'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    fail('The prerender manifest is missing or empty: the build produced no prerendered route.');
  }
  return manifest.map(({ route, file }) => ({
    path: posix.join(route, 'index.html'),
    file: join(dist, 'prerendered', file),
  }));
}

function collect() {
  const files = [];
  for (const file of walk(dist)) {
    const path = hostingPath(file);
    if (path) files.push({ path, file });
  }
  files.push(...prerenderedFiles());
  return files.map(({ path, file }) => {
    const gzipped = gzipSync(readFileSync(file), { level: 9 });
    return { path, gzipped, hash: createHash('sha256').update(gzipped).digest('hex') };
  });
}

async function call(method, url, body, token, contentType = 'application/json') {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'x-goog-user-project': project,
    },
    body: contentType === 'application/json' ? JSON.stringify(body) : body,
  });
  const text = await response.text();
  if (!response.ok) fail(`${method} ${url} -> HTTP ${response.status}\n${text.slice(0, 1500)}`);
  return text ? JSON.parse(text) : {};
}

function summary(files) {
  const bytes = files.reduce((total, f) => total + f.gzipped.length, 0);
  return `${files.length} files, ${(bytes / 1024).toFixed(0)} KiB gzipped`;
}

if (!statSync(dist, { throwIfNoEntry: false })?.isDirectory()) fail(`${dist} is not a directory.`);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const files = collect();
console.log(`Hosting site ${site}: ${summary(files)}`);

if (dryRun) {
  for (const f of files) console.log(`  ${f.path}`);
  console.log(JSON.stringify(config, null, 2));
  process.exit(0);
}

const token = accessToken();
const project = quotaProject();
if (!project) fail('No quota project: set GCP_PROJECT_ID or configure a gcloud project.');
const labels = Object.fromEntries(
  [
    ['commit', process.env.GITHUB_SHA],
    ['run_id', process.env.GITHUB_RUN_ID],
  ].filter(([, value]) => value)
);
const version = await call('POST', `${API}/sites/${site}/versions`, { config, labels }, token);
console.log(`Version ${version.name}`);

const uploadRequired = new Set();
let uploadUrl = '';
for (let i = 0; i < files.length; i += HASHES_PER_POPULATE_CALL) {
  const batch = Object.fromEntries(
    files.slice(i, i + HASHES_PER_POPULATE_CALL).map((f) => [f.path, f.hash])
  );
  const populated = await call(
    `POST`,
    `${API}/${version.name}:populateFiles`,
    { files: batch },
    token
  );
  for (const hash of populated.uploadRequiredHashes ?? []) uploadRequired.add(hash);
  uploadUrl = populated.uploadUrl ?? uploadUrl;
}

const byHash = new Map(files.map((f) => [f.hash, f]));
let uploaded = 0;
for (const hash of uploadRequired) {
  await call(
    'PUT',
    `${uploadUrl}/${hash}`,
    byHash.get(hash).gzipped,
    token,
    'application/octet-stream'
  );
  uploaded += 1;
}
console.log(`${uploaded} uploaded, ${files.length - uploaded} already known to Hosting`);

const finalized = await call(
  'PATCH',
  `${API}/${version.name}?update_mask=status`,
  { status: 'FINALIZED' },
  token
);
if (finalized.status !== 'FINALIZED') fail(`Version not finalized: ${JSON.stringify(finalized)}`);

const release = await call(
  'POST',
  `${API}/sites/${site}/releases?versionName=${encodeURIComponent(version.name)}`,
  {},
  token
);
console.log(`Released ${release.name} at https://${site}.web.app`);
