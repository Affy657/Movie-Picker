/**
 * Reads every IAM binding of the project and of the resources Terraform grants (the two buckets,
 * the secrets, the service accounts, the image repository, the Cloud Run services) and reports
 * any member that `infra/terraform` does not describe. Terraform binds members one by one
 * (`google_*_iam_member`), so a binding added by hand, or left over from before a resource was
 * described, is invisible to `terraform plan`: on 2026-09-20 the default Compute account still
 * read nine production secrets and a Firebase account could mint tokens for the Terraform
 * identity, with a plan empty on both roots. This is the check that plan cannot be.
 *
 * Also lists the secrets whose latest version is older than a year: nothing rotates them, and
 * the one that travels in a query string (DEBT-039) ages worst.
 *
 * Run by the weekly maintenance pass (`pnpm run check:iam`), as the project owner through gcloud.
 * Read-only: it reports, the removal is a gesture (`gcloud ... remove-iam-policy-binding`) or a
 * change of the described set. Exit code 1 on any finding.
 *
 * What is expected, and why nothing else is:
 *   - the described service accounts, `movie-picker-*@<project>`, on whatever Terraform grants;
 *   - the project owner (`roles/owner` on the project, and the `projectOwner:` convenience value
 *     the buckets keep for it);
 *   - the Google-managed service agents (`service-<number>@gcp-sa-*`, `*.iam.gserviceaccount.com`
 *     of Google's own projects), which the platform binds itself;
 *   - the GitHub environments of the repository, as `roles/iam.workloadIdentityUser` on a described
 *     service account: the federation subjects `infra/terraform` binds, and no other principal;
 *   - `allUsers` as `roles/run.invoker` on the Cloud Run services, the public API, and nowhere else.
 */
import { spawnSync } from 'node:child_process';

const PROJECT_ID = process.env.GCP_PROJECT_ID || gcloud(['config', 'get-value', 'project']);
const REGION = process.env.GCP_REGION || 'europe-west1';
const GITHUB_REPOSITORY = 'Affy657/Movie-Picker';
const WORKLOAD_IDENTITY_POOL = 'github';
const BUCKETS = ['movie-picker-tfstate', 'movie-picker-backups'];
const IMAGE_REPOSITORY = 'movie-picker';
const RUN_SERVICES = ['movie-picker-api', 'movie-picker-api-staging'];
const SECRET_VERSION_MAX_AGE_DAYS = 365;

function gcloud(args) {
  const result = spawnSync('gcloud', [...args, '--format=json'], { encoding: 'utf8', shell: true });
  if (result.status !== 0) {
    console.error(`gcloud ${args.join(' ')} failed:\n${result.stderr}`);
    process.exit(1);
  }
  const text = result.stdout.trim();
  if (args[0] === 'config') return text.replace(/^"|"$/g, '');
  return text ? JSON.parse(text) : null;
}

if (!PROJECT_ID) {
  console.error('No project: set GCP_PROJECT_ID or configure a gcloud project.');
  process.exit(1);
}

const OWNER_ROLE = 'roles/owner';
const PROJECT_NUMBER = gcloud(['projects', 'describe', PROJECT_ID]).projectNumber;
const GITHUB_SUBJECT_PREFIX = `principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}/subject/repo:${GITHUB_REPOSITORY}:environment:`;
const findings = [];

function isDescribedServiceAccount(member) {
  return (
    member.startsWith(`serviceAccount:movie-picker-`) &&
    member.endsWith(`@${PROJECT_ID}.iam.gserviceaccount.com`)
  );
}

function isGoogleServiceAgent(member) {
  return (
    /^serviceAccount:service-\d+@/.test(member) ||
    (member.startsWith('serviceAccount:') &&
      member.endsWith('.iam.gserviceaccount.com') &&
      !member.endsWith(`@${PROJECT_ID}.iam.gserviceaccount.com`) &&
      !member.endsWith('@developer.gserviceaccount.com'))
  );
}

function isGithubEnvironment(member, role, resource) {
  return (
    role === 'roles/iam.workloadIdentityUser' &&
    resource.startsWith('service account movie-picker-') &&
    member.startsWith(GITHUB_SUBJECT_PREFIX)
  );
}

function isOwner(member, role, owners) {
  return (
    (role === OWNER_ROLE && member.startsWith('user:')) ||
    owners.has(member) ||
    member === `projectOwner:${PROJECT_ID}`
  );
}

function review(resource, bindings, owners, { allowAllUsersAs = null } = {}) {
  for (const binding of bindings ?? []) {
    for (const member of binding.members ?? []) {
      if (isDescribedServiceAccount(member)) continue;
      if (isGoogleServiceAgent(member)) continue;
      if (isOwner(member, binding.role, owners)) continue;
      if (isGithubEnvironment(member, binding.role, resource)) continue;
      if (member === 'allUsers' && binding.role === allowAllUsersAs) continue;
      findings.push(`${resource}: ${binding.role} -> ${member}`);
    }
  }
}

const projectPolicy = gcloud(['projects', 'get-iam-policy', PROJECT_ID]);
const owners = new Set(
  (projectPolicy.bindings ?? [])
    .filter((binding) => binding.role === OWNER_ROLE)
    .flatMap((binding) => binding.members)
);
review('project', projectPolicy.bindings, owners);

for (const bucket of BUCKETS) {
  review(
    `bucket ${bucket}`,
    gcloud(['storage', 'buckets', 'get-iam-policy', `gs://${bucket}`]).bindings,
    owners
  );
}

const secrets = gcloud(['secrets', 'list', '--project', PROJECT_ID]) ?? [];
const now = Date.now();
for (const secret of secrets) {
  const id = secret.name.split('/').pop();
  review(
    `secret ${id}`,
    gcloud(['secrets', 'get-iam-policy', id, '--project', PROJECT_ID]).bindings,
    owners
  );
  const versions =
    gcloud([
      'secrets',
      'versions',
      'list',
      id,
      '--project',
      PROJECT_ID,
      '--filter=state:ENABLED',
    ]) ?? [];
  const newest = versions.map((v) => Date.parse(v.createTime)).sort((a, b) => b - a)[0];
  if (newest) {
    const ageDays = Math.floor((now - newest) / 86_400_000);
    if (ageDays > SECRET_VERSION_MAX_AGE_DAYS)
      findings.push(`secret ${id}: latest version is ${ageDays} days old, rotate it`);
  }
}

for (const account of gcloud(['iam', 'service-accounts', 'list', '--project', PROJECT_ID]) ?? []) {
  review(
    `service account ${account.email}`,
    gcloud(['iam', 'service-accounts', 'get-iam-policy', account.email]).bindings,
    owners
  );
  if (!account.email.startsWith('movie-picker-') && !account.disabled) {
    findings.push(`service account ${account.email}: not described and enabled`);
  }
  const keys =
    gcloud([
      'iam',
      'service-accounts',
      'keys',
      'list',
      `--iam-account=${account.email}`,
      '--managed-by=user',
    ]) ?? [];
  if (keys.length > 0)
    findings.push(`service account ${account.email}: ${keys.length} user-managed key(s)`);
}

review(
  `image repository ${IMAGE_REPOSITORY}`,
  gcloud([
    'artifacts',
    'repositories',
    'get-iam-policy',
    IMAGE_REPOSITORY,
    '--location',
    REGION,
    '--project',
    PROJECT_ID,
  ]).bindings,
  owners
);

for (const service of RUN_SERVICES) {
  review(
    `run service ${service}`,
    gcloud([
      'run',
      'services',
      'get-iam-policy',
      service,
      '--region',
      REGION,
      '--project',
      PROJECT_ID,
    ]).bindings,
    owners,
    { allowAllUsersAs: 'roles/run.invoker' }
  );
}

if (findings.length > 0) {
  console.log(`${findings.length} IAM finding(s) outside what infra/terraform describes:`);
  for (const finding of findings) console.log(`  ${finding}`);
  process.exit(1);
}
console.log(
  'Every IAM binding of the project belongs to a described identity, the owner or a Google service agent; no key, no stale secret.'
);
