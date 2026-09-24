/**
 * Reads every IAM binding of the project and of the resources Terraform grants (the two buckets,
 * the secrets, the service accounts, the image repository, the Cloud Run services) and reports
 * any binding that `infra/terraform` does not describe. Terraform binds members one by one
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
 * change of the described set. Exit code 1 on any finding. The review itself is pure and tested
 * by `scripts/check-iam.test.mjs`.
 *
 * What is expected, and why nothing else is:
 *   - every binding the Terraform states record (one state per root of
 *     `infra/terraform/environments/`, read from the state bucket), matched on resource, role,
 *     member and condition: a described service account or a GitHub environment granted one more
 *     role, on one more resource, or without the condition Terraform set, is a finding;
 *   - the project owner (`roles/owner` on the project, and the `projectOwner:` convenience value
 *     the buckets keep for it);
 *   - the Google-managed service agents (`service-<number>@gcp-sa-*`, `*.iam.gserviceaccount.com`
 *     of Google's own projects), which the platform binds itself;
 *   - `allUsers` as `roles/run.invoker` on the Cloud Run services, the public API, and nowhere else.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REGION = process.env.GCP_REGION || 'europe-west1';
const STATE_BUCKET = process.env.TF_STATE_BUCKET || 'movie-picker-tfstate';
const BUCKETS = [STATE_BUCKET, 'movie-picker-backups'];
const IMAGE_REPOSITORY = 'movie-picker';
const RUN_SERVICES = ['movie-picker-api', 'movie-picker-api-staging'];
const SECRET_VERSION_MAX_AGE_DAYS = 365;
const OWNER_ROLE = 'roles/owner';
const TERRAFORM_ROOTS = fileURLToPath(new URL('../infra/terraform/environments/', import.meta.url));

function lastSegment(path) {
  return String(path).split('/').pop();
}

const STATE_MEMBER_RESOURCES = {
  google_project_iam_member: () => 'project',
  google_storage_bucket_iam_member: (a) => `bucket ${String(a.bucket).replace(/^b\//, '')}`,
  google_secret_manager_secret_iam_member: (a) => `secret ${lastSegment(a.secret_id)}`,
  google_service_account_iam_member: (a) => `service account ${lastSegment(a.service_account_id)}`,
  google_artifact_registry_repository_iam_member: (a) =>
    `image repository ${lastSegment(a.repository)}`,
  google_cloud_run_v2_service_iam_member: (a) => `run service ${lastSegment(a.name)}`,
};

export function bindingKey(resource, role, member, conditionExpression) {
  return [resource, role, member, (conditionExpression ?? '').trim()].join('\n');
}

export function terraformBindings(states) {
  const described = new Set();
  for (const state of states) {
    for (const resource of state.resources ?? []) {
      const resourceOf = STATE_MEMBER_RESOURCES[resource.type];
      if (resource.mode !== 'managed' || !resourceOf) continue;
      for (const { attributes } of resource.instances ?? []) {
        described.add(
          bindingKey(
            resourceOf(attributes),
            attributes.role,
            attributes.member,
            attributes.condition?.[0]?.expression
          )
        );
      }
    }
  }
  return described;
}

function isGoogleServiceAgent(member, projectId) {
  return (
    /^serviceAccount:service-\d+@/.test(member) ||
    (member.startsWith('serviceAccount:') &&
      member.endsWith('.iam.gserviceaccount.com') &&
      !member.endsWith(`@${projectId}.iam.gserviceaccount.com`) &&
      !member.endsWith('@developer.gserviceaccount.com'))
  );
}

function isOwner(member, role, { owners, projectId }) {
  return (
    (role === OWNER_ROLE && member.startsWith('user:')) ||
    owners.has(member) ||
    member === `projectOwner:${projectId}`
  );
}

export function reviewBindings(resource, bindings, context) {
  const { described, projectId, allowAllUsersAs = null } = context;
  const findings = [];
  for (const binding of bindings ?? []) {
    const condition = binding.condition?.expression;
    for (const member of binding.members ?? []) {
      if (described.has(bindingKey(resource, binding.role, member, condition))) continue;
      if (isGoogleServiceAgent(member, projectId)) continue;
      if (isOwner(member, binding.role, context)) continue;
      if (member === 'allUsers' && binding.role === allowAllUsersAs) continue;
      const when = condition ? ` (when ${condition})` : '';
      findings.push(`${resource}: ${binding.role} -> ${member}${when}`);
    }
  }
  return findings;
}

function gcloud(args) {
  const result = spawnSync('gcloud', args, {
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    console.error(`gcloud ${args.join(' ')} failed:\n${result.stderr}`);
    process.exit(1);
  }
  return result.stdout.trim();
}

function gcloudJson(args) {
  const text = gcloud([...args, '--format=json']);
  return text ? JSON.parse(text) : null;
}

function readTerraformStates() {
  return readdirSync(TERRAFORM_ROOTS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const backend = readFileSync(`${TERRAFORM_ROOTS}${entry.name}/backend.tf`, 'utf8');
      const prefix = /prefix\s*=\s*"([^"]+)"/.exec(backend)?.[1];
      if (!prefix) {
        console.error(`No state prefix in infra/terraform/environments/${entry.name}/backend.tf.`);
        process.exit(1);
      }
      return JSON.parse(
        gcloud(['storage', 'cat', `gs://${STATE_BUCKET}/${prefix}/default.tfstate`])
      );
    });
}

function secretFindings(projectId, context) {
  const findings = [];
  const now = Date.now();
  for (const secret of gcloudJson(['secrets', 'list', '--project', projectId]) ?? []) {
    const id = lastSegment(secret.name);
    const policy = gcloudJson(['secrets', 'get-iam-policy', id, '--project', projectId]);
    findings.push(...reviewBindings(`secret ${id}`, policy.bindings, context));
    const versions =
      gcloudJson([
        'secrets',
        'versions',
        'list',
        id,
        '--project',
        projectId,
        '--filter=state:ENABLED',
      ]) ?? [];
    const newest = versions.map((v) => Date.parse(v.createTime)).sort((a, b) => b - a)[0];
    if (!newest) continue;
    const ageDays = Math.floor((now - newest) / 86_400_000);
    if (ageDays > SECRET_VERSION_MAX_AGE_DAYS)
      findings.push(`secret ${id}: latest version is ${ageDays} days old, rotate it`);
  }
  return findings;
}

function serviceAccountFindings(projectId, context) {
  const findings = [];
  for (const account of gcloudJson(['iam', 'service-accounts', 'list', '--project', projectId]) ??
    []) {
    const policy = gcloudJson(['iam', 'service-accounts', 'get-iam-policy', account.email]);
    findings.push(...reviewBindings(`service account ${account.email}`, policy.bindings, context));
    if (!account.email.startsWith('movie-picker-') && !account.disabled)
      findings.push(`service account ${account.email}: not described and enabled`);
    const keys =
      gcloudJson([
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
  return findings;
}

function main() {
  const projectId = process.env.GCP_PROJECT_ID || gcloud(['config', 'get-value', 'project']);
  if (!projectId) {
    console.error('No project: set GCP_PROJECT_ID or configure a gcloud project.');
    process.exit(1);
  }
  const projectPolicy = gcloudJson(['projects', 'get-iam-policy', projectId]);
  const context = {
    projectId,
    described: terraformBindings(readTerraformStates()),
    owners: new Set(
      (projectPolicy.bindings ?? [])
        .filter((binding) => binding.role === OWNER_ROLE)
        .flatMap((binding) => binding.members)
    ),
  };

  const findings = [
    ...reviewBindings('project', projectPolicy.bindings, context),
    ...BUCKETS.flatMap((bucket) =>
      reviewBindings(
        `bucket ${bucket}`,
        gcloudJson(['storage', 'buckets', 'get-iam-policy', `gs://${bucket}`]).bindings,
        context
      )
    ),
    ...secretFindings(projectId, context),
    ...serviceAccountFindings(projectId, context),
    ...reviewBindings(
      `image repository ${IMAGE_REPOSITORY}`,
      gcloudJson([
        'artifacts',
        'repositories',
        'get-iam-policy',
        IMAGE_REPOSITORY,
        '--location',
        REGION,
        '--project',
        projectId,
      ]).bindings,
      context
    ),
    ...RUN_SERVICES.flatMap((service) =>
      reviewBindings(
        `run service ${service}`,
        gcloudJson([
          'run',
          'services',
          'get-iam-policy',
          service,
          '--region',
          REGION,
          '--project',
          projectId,
        ]).bindings,
        { ...context, allowAllUsersAs: 'roles/run.invoker' }
      )
    ),
  ];

  if (findings.length > 0) {
    console.log(`${findings.length} IAM finding(s) outside what infra/terraform describes:`);
    for (const finding of findings) console.log(`  ${finding}`);
    process.exit(1);
  }
  console.log(
    'Every IAM binding of the project is recorded in a Terraform state, or belongs to the owner or a Google service agent; no key, no stale secret.'
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
