import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reviewBindings, terraformBindings } from './check-iam.mjs';

const PROJECT = 'demo-project';
const CI = `serviceAccount:movie-picker-ci@${PROJECT}.iam.gserviceaccount.com`;
const BACKUP = `serviceAccount:movie-picker-backup@${PROJECT}.iam.gserviceaccount.com`;
const OWNER = 'user:owner@example.com';
const SUBJECT =
  'principal://iam.googleapis.com/projects/1/locations/global/workloadIdentityPools/github/subject/repo:owner/repo:environment:';
const PENDING_ONLY = 'resource.name.startsWith("projects/_/buckets/backups/objects/pending/")';

function member(type, attributes) {
  return { mode: 'managed', type, instances: [{ attributes: { condition: [], ...attributes } }] };
}

const state = {
  resources: [
    member('google_project_iam_member', {
      project: PROJECT,
      role: 'roles/run.developer',
      member: CI,
    }),
    member('google_storage_bucket_iam_member', {
      bucket: 'b/backups',
      role: 'roles/storage.objectUser',
      member: BACKUP,
      condition: [{ expression: PENDING_ONLY, title: 'pending only' }],
    }),
    member('google_service_account_iam_member', {
      service_account_id: `projects/${PROJECT}/serviceAccounts/movie-picker-ci@${PROJECT}.iam.gserviceaccount.com`,
      role: 'roles/iam.workloadIdentityUser',
      member: `${SUBJECT}production`,
    }),
    member('google_secret_manager_secret_iam_member', {
      secret_id: `projects/${PROJECT}/secrets/MONGODB_URI`,
      role: 'roles/secretmanager.secretAccessor',
      member: BACKUP,
    }),
    { mode: 'data', type: 'google_project_iam_member', instances: [] },
  ],
};

const context = {
  projectId: PROJECT,
  described: terraformBindings([state]),
  owners: new Set([OWNER]),
};

describe('check-iam review', () => {
  it('accepts every binding a Terraform state records', () => {
    const findings = [
      ...reviewBindings('project', [{ role: 'roles/run.developer', members: [CI] }], context),
      ...reviewBindings(
        'bucket backups',
        [
          {
            role: 'roles/storage.objectUser',
            members: [BACKUP],
            condition: { expression: PENDING_ONLY },
          },
        ],
        context
      ),
      ...reviewBindings(
        `service account movie-picker-ci@${PROJECT}.iam.gserviceaccount.com`,
        [{ role: 'roles/iam.workloadIdentityUser', members: [`${SUBJECT}production`] }],
        context
      ),
      ...reviewBindings(
        'secret MONGODB_URI',
        [{ role: 'roles/secretmanager.secretAccessor', members: [BACKUP] }],
        context
      ),
    ];

    assert.deepEqual(findings, []);
  });

  it('reports a role granted by hand to a described service account', () => {
    const findings = reviewBindings('project', [{ role: 'roles/editor', members: [CI] }], context);

    assert.deepEqual(findings, [`project: roles/editor -> ${CI}`]);
  });

  it('reports a described role granted on a resource Terraform does not bind', () => {
    const findings = reviewBindings(
      'secret SENTRY_DSN',
      [{ role: 'roles/secretmanager.secretAccessor', members: [BACKUP] }],
      context
    );

    assert.equal(findings.length, 1);
  });

  it('reports a described binding stripped of its condition', () => {
    const findings = reviewBindings(
      'bucket backups',
      [{ role: 'roles/storage.objectUser', members: [BACKUP] }],
      context
    );

    assert.deepEqual(findings, [`bucket backups: roles/storage.objectUser -> ${BACKUP}`]);
  });

  it('reports a GitHub environment allowed to assume another identity', () => {
    const findings = reviewBindings(
      `service account movie-picker-ci@${PROJECT}.iam.gserviceaccount.com`,
      [{ role: 'roles/iam.workloadIdentityUser', members: [`${SUBJECT}staging`] }],
      context
    );

    assert.equal(findings.length, 1);
  });

  it('keeps accepting the owner, the Google service agents and the public invoker', () => {
    const findings = [
      ...reviewBindings('project', [{ role: 'roles/owner', members: [OWNER] }], context),
      ...reviewBindings(
        'project',
        [
          {
            role: 'roles/run.serviceAgent',
            members: ['serviceAccount:service-1@serverless-robot-prod.iam.gserviceaccount.com'],
          },
        ],
        context
      ),
      ...reviewBindings('run service api', [{ role: 'roles/run.invoker', members: ['allUsers'] }], {
        ...context,
        allowAllUsersAs: 'roles/run.invoker',
      }),
    ];

    assert.deepEqual(findings, []);
  });

  it('reports allUsers anywhere but as the invoker of a public service', () => {
    const findings = reviewBindings(
      'bucket backups',
      [{ role: 'roles/storage.objectViewer', members: ['allUsers'] }],
      context
    );

    assert.equal(findings.length, 1);
  });
});
