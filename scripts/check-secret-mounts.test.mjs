import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_GAPS,
  parseDeployMounts,
  parseTerraformSet,
  reviewGaps,
  secretMountGaps,
} from './check-secret-mounts.mjs';

function deployStep({ production, optional = [], staging }) {
  const list = (mounts) => mounts.map(([env, secret]) => `${env}=${secret}:latest`).join(',');
  return [
    '      - name: Deploy without traffic',
    '        run: |',
    '          SCHEDULER_ENV=""',
    '          if [ "$STAGE" = "production" ]; then',
    `            SECRETS="${list(production)}"`,
    ...optional.flatMap(([env, secret]) => [
      `            if gcloud secrets describe ${secret} >/dev/null 2>&1; then`,
      `              SECRETS="$SECRETS,${env}=${secret}:latest"`,
      '            fi',
    ]),
    '          else',
    `            SECRETS="${list(staging)}"`,
    '          fi',
    '          gcloud run deploy api --set-secrets "$SECRETS"',
  ].join('\n');
}

const ALIGNED = {
  production: [
    ['MONGODB_URI', 'MONGODB_URI'],
    ['TMDB_API_KEY', 'TMDB_API_KEY'],
  ],
  staging: [
    ['MONGODB_URI', 'STAGING_MONGODB_URI'],
    ['TMDB_API_KEY', 'TMDB_API_KEY'],
  ],
};

function gapsOf(deploy, overrides = {}) {
  return secretMountGaps({
    deploy: parseDeployMounts(deployStep(deploy)),
    productionSecrets: ['MONGODB_URI', 'TMDB_API_KEY'],
    stagingOwn: ['MONGODB_URI'],
    stagingShared: ['TMDB_API_KEY'],
    ...overrides,
  });
}

function summary(gaps) {
  return gaps.map(({ stage, secret, kind }) => `${stage} ${secret} ${kind}`).sort();
}

describe('parseDeployMounts', () => {
  it('reads the production mounts, the optional ones included, and the staging mounts', () => {
    const mounts = parseDeployMounts(
      deployStep({ ...ALIGNED, optional: [['TMDB_READ_ACCESS_TOKEN', 'TMDB_READ_ACCESS_TOKEN']] })
    );
    assert.deepEqual(
      mounts.production.map(({ env, secret, conditional }) => [env, secret, conditional]),
      [
        ['MONGODB_URI', 'MONGODB_URI', false],
        ['TMDB_API_KEY', 'TMDB_API_KEY', false],
        ['TMDB_READ_ACCESS_TOKEN', 'TMDB_READ_ACCESS_TOKEN', true],
      ]
    );
    assert.deepEqual(
      mounts.staging.map(({ env, secret }) => [env, secret]),
      [
        ['MONGODB_URI', 'STAGING_MONGODB_URI'],
        ['TMDB_API_KEY', 'TMDB_API_KEY'],
      ]
    );
  });

  it('refuses a workflow whose stage branch it cannot find', () => {
    assert.throws(
      () => parseDeployMounts('SECRETS="MONGODB_URI=MONGODB_URI:latest"'),
      /expected one `if \[ "\$STAGE" = "production" \]; then`/
    );
  });

  it('refuses a stage branch without a staging list', () => {
    const workflow = deployStep(ALIGNED).replace(/ {12}SECRETS="MONGODB_URI=STAGING[^\n]*\n/, '');
    assert.throws(
      () => parseDeployMounts(workflow),
      /no SECRETS="\.\.\." assignment found in the staging branch/
    );
  });

  it('refuses a mount it cannot read rather than skipping it', () => {
    const workflow = deployStep(ALIGNED).replace(
      'TMDB_API_KEY=TMDB_API_KEY:latest"',
      'TMDB_API_KEY"'
    );
    assert.throws(() => parseDeployMounts(workflow), /unreadable secret mount "TMDB_API_KEY"/);
  });
});

describe('parseTerraformSet', () => {
  it('reads the names of a toset list', () => {
    const source =
      'locals {\n  own_secret_names = toset([\n    "MONGODB_URI",\n    "OAUTH_GOOGLE_CLIENT_ID",\n  ])\n}\n';
    assert.deepEqual(parseTerraformSet(source, 'own_secret_names', 'main.tf'), [
      'MONGODB_URI',
      'OAUTH_GOOGLE_CLIENT_ID',
    ]);
  });

  it('refuses a missing list', () => {
    assert.throws(
      () => parseTerraformSet('locals {}', 'api_secret_names', 'main.tf'),
      /main\.tf: no `api_secret_names = toset\(\[\.\.\.\]\)` found/
    );
  });
});

describe('secretMountGaps', () => {
  it('finds nothing when the workflow mounts exactly what Terraform describes', () => {
    assert.deepEqual(gapsOf(ALIGNED), []);
  });

  it('reports a production mount Terraform does not describe', () => {
    const gaps = gapsOf({
      ...ALIGNED,
      production: [...ALIGNED.production, ['NEW_KEY', 'NEW_KEY']],
    });
    assert.deepEqual(summary(gaps), ['production NEW_KEY mounted-not-described']);
  });

  it('reports a production secret described but never mounted', () => {
    const gaps = gapsOf(ALIGNED, { productionSecrets: ['MONGODB_URI', 'TMDB_API_KEY', 'OLD_KEY'] });
    assert.deepEqual(summary(gaps), ['production OLD_KEY described-not-mounted']);
  });

  it('reports a production secret mounted under another variable name', () => {
    const gaps = gapsOf({
      ...ALIGNED,
      production: [
        ['DATABASE_URI', 'MONGODB_URI'],
        ['TMDB_API_KEY', 'TMDB_API_KEY'],
      ],
    });
    assert.deepEqual(summary(gaps), ['production MONGODB_URI renamed-mount']);
  });

  it('reports the staging gaps against its own and shared lists', () => {
    const gaps = gapsOf(
      {
        ...ALIGNED,
        staging: [
          ['DATABASE_URI', 'STAGING_MONGODB_URI'],
          ['SENTRY_DSN', 'SENTRY_DSN'],
        ],
      },
      { stagingShared: ['TMDB_API_KEY', 'RESEND_API_KEY'] }
    );
    assert.deepEqual(summary(gaps), [
      'staging RESEND_API_KEY described-not-mounted',
      'staging RESEND_API_KEY shared-not-in-production',
      'staging SENTRY_DSN mounted-not-described',
      'staging STAGING_MONGODB_URI renamed-mount',
      'staging TMDB_API_KEY described-not-mounted',
    ]);
  });
});

describe('reviewGaps', () => {
  const allowed = [
    { stage: 'production', secret: 'OLD_KEY', kind: 'described-not-mounted', reason: 'DEBT-000' },
  ];

  it('fails on a gap the allowances do not list', () => {
    const gaps = gapsOf({
      ...ALIGNED,
      production: [...ALIGNED.production, ['NEW_KEY', 'NEW_KEY']],
    });
    const review = reviewGaps(gaps, allowed);
    assert.deepEqual(summary(review.unexpected), ['production NEW_KEY mounted-not-described']);
  });

  it('passes a gap the allowances list, and only for its stage and kind', () => {
    const gaps = gapsOf(ALIGNED, { productionSecrets: ['MONGODB_URI', 'TMDB_API_KEY', 'OLD_KEY'] });
    const review = reviewGaps(gaps, allowed);
    assert.deepEqual(review.unexpected, []);
    assert.deepEqual(review.stale, []);
    assert.deepEqual(summary(review.allowed), ['production OLD_KEY described-not-mounted']);
    const elsewhere = reviewGaps(gaps, [{ ...allowed[0], stage: 'staging' }]);
    assert.deepEqual(summary(elsewhere.unexpected), ['production OLD_KEY described-not-mounted']);
  });

  it('fails on an allowance whose gap is gone', () => {
    const review = reviewGaps(gapsOf(ALIGNED), allowed);
    assert.deepEqual(review.stale, allowed);
  });

  it('gives every allowance of the repository a reason that names its debt or its set-aside entry', () => {
    for (const entry of ALLOWED_GAPS) {
      assert.match(entry.reason, /^(DEBT-\d{3}|E\d+): \S/, `${entry.stage} ${entry.secret}`);
    }
  });
});
