import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const DEPLOY_WORKFLOW = '.github/workflows/deploy.yml';
export const PRODUCTION_ROOT = 'infra/terraform/environments/production/main.tf';
export const STAGING_ROOT = 'infra/terraform/environments/staging/main.tf';
export const STAGING_SECRET_PREFIX = 'STAGING_';

const PRODUCTION_BRANCH = 'if [ "$STAGE" = "production" ]; then';
const SECRETS_ASSIGNMENT = /^SECRETS="(\$SECRETS,)?([^"]*)"$/;

export const ALLOWED_GAPS = [
  {
    stage: 'production',
    secret: 'AUTH_DATAPROTECTION_KEYRING',
    kind: 'described-not-mounted',
    reason:
      'DEBT-045: unused since MongoDB holds the data protection keys, no longer mounted; the secret is destroyed by an apply once a deployment without the mount is promoted.',
  },
  {
    stage: 'production',
    secret: 'SCHEDULER_TOKEN',
    kind: 'described-not-mounted',
    reason:
      'DEBT-037: a revision older than 2026-09-21 brought back by rollback.yml still mounts it; it is destroyed once no such revision is left in the image repository.',
  },
  {
    stage: 'production',
    secret: 'TMDB_READ_ACCESS_TOKEN',
    kind: 'mounted-not-described',
    reason:
      'DEBT-039: created by hand, mounted only once it exists (deploy.yml asks Secret Manager first), described in Terraform when that debt is closed.',
  },
];

function indentOf(line) {
  return line.length - line.trimStart().length;
}

function parseMountList(list, conditional) {
  return list
    .split(',')
    .filter(Boolean)
    .map((entry) => {
      const match = /^([A-Z0-9_]+)=([A-Za-z0-9_-]+):([A-Za-z0-9]+)$/.exec(entry);
      if (!match) throw new Error(`${DEPLOY_WORKFLOW}: unreadable secret mount "${entry}"`);
      return { env: match[1], secret: match[2], version: match[3], conditional };
    });
}

function mountsBetween(lines, from, to) {
  const mounts = [];
  for (const line of lines.slice(from, to)) {
    const match = SECRETS_ASSIGNMENT.exec(line.trim());
    if (match) mounts.push(...parseMountList(match[2], Boolean(match[1])));
  }
  return mounts;
}

export function parseDeployMounts(workflow) {
  const lines = workflow.split(/\r?\n/);
  const branches = lines.flatMap((line, index) =>
    line.trim() === PRODUCTION_BRANCH ? [index] : []
  );
  if (branches.length !== 1) {
    throw new Error(
      `${DEPLOY_WORKFLOW}: expected one \`${PRODUCTION_BRANCH}\` choosing the mounted secrets, found ${branches.length}`
    );
  }
  const start = branches[0];
  const indent = indentOf(lines[start]);
  const sameLevel = (keyword) =>
    lines.findIndex(
      (line, index) => index > start && indentOf(line) === indent && line.trim() === keyword
    );
  const elseLine = sameLevel('else');
  const fiLine = sameLevel('fi');
  if (elseLine < 0 || fiLine < elseLine) {
    throw new Error(
      `${DEPLOY_WORKFLOW}: the production branch has no \`else\` for the staging before its \`fi\``
    );
  }
  const production = mountsBetween(lines, start + 1, elseLine);
  const staging = mountsBetween(lines, elseLine + 1, fiLine);
  if (production.length === 0 || staging.length === 0) {
    throw new Error(
      `${DEPLOY_WORKFLOW}: no SECRETS="..." assignment found in the ${production.length === 0 ? 'production' : 'staging'} branch`
    );
  }
  return { production, staging };
}

export function parseTerraformSet(source, name, file) {
  const match = new RegExp(String.raw`\b${name}\s*=\s*toset\(\[([^\]]*)\]\)`).exec(source);
  if (!match) throw new Error(`${file}: no \`${name} = toset([...])\` found`);
  const names = [...match[1].matchAll(/"([A-Z0-9_]+)"/g)].map(([, value]) => value);
  if (names.length === 0) throw new Error(`${file}: \`${name}\` lists no secret`);
  return names;
}

function gap(stage, secret, kind, detail) {
  return { stage, secret, kind, detail };
}

function productionGaps(mounts, described) {
  const gaps = [];
  const mounted = new Set(mounts.map((mount) => mount.secret));
  for (const mount of mounts) {
    if (mount.env !== mount.secret) {
      gaps.push(
        gap(
          'production',
          mount.secret,
          'renamed-mount',
          `mounted as ${mount.env}, not under its own name`
        )
      );
    }
    if (!described.includes(mount.secret)) {
      gaps.push(
        gap(
          'production',
          mount.secret,
          'mounted-not-described',
          'mounted by deploy.yml, absent from api_secret_names: the runtime identity cannot read it'
        )
      );
    }
  }
  for (const secret of described) {
    if (!mounted.has(secret)) {
      gaps.push(
        gap(
          'production',
          secret,
          'described-not-mounted',
          'in api_secret_names, mounted by no production revision'
        )
      );
    }
  }
  return gaps;
}

function stagingGaps(mounts, own, shared, productionSecrets) {
  const gaps = [];
  const mounted = new Set(mounts.map((mount) => mount.secret));
  for (const mount of mounts) {
    const isOwn = mount.secret.startsWith(STAGING_SECRET_PREFIX);
    const expectedEnv = isOwn ? mount.secret.slice(STAGING_SECRET_PREFIX.length) : mount.secret;
    if (mount.env !== expectedEnv) {
      gaps.push(
        gap(
          'staging',
          mount.secret,
          'renamed-mount',
          `mounted as ${mount.env}, expected ${expectedEnv}`
        )
      );
    }
    const describedHere = isOwn ? own.includes(expectedEnv) : shared.includes(mount.secret);
    if (!describedHere) {
      gaps.push(
        gap(
          'staging',
          mount.secret,
          'mounted-not-described',
          `mounted by deploy.yml, absent from ${isOwn ? 'own_secret_names' : 'shared_secret_names'}: the staging runtime identity cannot read it`
        )
      );
    }
  }
  for (const name of own) {
    const secret = `${STAGING_SECRET_PREFIX}${name}`;
    if (!mounted.has(secret)) {
      gaps.push(
        gap(
          'staging',
          secret,
          'described-not-mounted',
          'in own_secret_names, mounted by no staging revision'
        )
      );
    }
  }
  for (const secret of shared) {
    if (!mounted.has(secret)) {
      gaps.push(
        gap(
          'staging',
          secret,
          'described-not-mounted',
          'in shared_secret_names, mounted by no staging revision'
        )
      );
    }
    if (!productionSecrets.includes(secret)) {
      gaps.push(
        gap(
          'staging',
          secret,
          'shared-not-in-production',
          'in shared_secret_names, absent from the api_secret_names of production that creates it'
        )
      );
    }
  }
  return gaps;
}

export function secretMountGaps({ deploy, productionSecrets, stagingOwn, stagingShared }) {
  return [
    ...productionGaps(deploy.production, productionSecrets),
    ...stagingGaps(deploy.staging, stagingOwn, stagingShared, productionSecrets),
  ];
}

function sameGap(a, b) {
  return a.stage === b.stage && a.secret === b.secret && a.kind === b.kind;
}

export function reviewGaps(gaps, allowed = ALLOWED_GAPS) {
  return {
    allowed: gaps.filter((found) => allowed.some((entry) => sameGap(entry, found))),
    unexpected: gaps.filter((found) => !allowed.some((entry) => sameGap(entry, found))),
    stale: allowed.filter((entry) => !gaps.some((found) => sameGap(entry, found))),
  };
}

export function readRepositoryGaps(directory = root) {
  const read = (file) => readFileSync(join(directory, file), 'utf8');
  const staging = read(STAGING_ROOT);
  return secretMountGaps({
    deploy: parseDeployMounts(read(DEPLOY_WORKFLOW)),
    productionSecrets: parseTerraformSet(
      read(PRODUCTION_ROOT),
      'api_secret_names',
      PRODUCTION_ROOT
    ),
    stagingOwn: parseTerraformSet(staging, 'own_secret_names', STAGING_ROOT),
    stagingShared: parseTerraformSet(staging, 'shared_secret_names', STAGING_ROOT),
  });
}

function describeGap({ stage, secret, kind, detail }) {
  return `${stage} ${secret} (${kind}): ${detail}`;
}

const invokedAsScript =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedAsScript) {
  let review;
  try {
    review = reviewGaps(readRepositoryGaps());
  } catch (error) {
    console.error(`\x1b[31m✗\x1b[0m ${error.message}`);
    process.exit(1);
  }
  for (const found of review.unexpected) {
    console.error(`\x1b[31m✗\x1b[0m ${describeGap(found)}`);
  }
  for (const entry of review.stale) {
    console.error(
      `\x1b[31m✗\x1b[0m ${entry.stage} ${entry.secret} (${entry.kind}) is allowed in ALLOWED_GAPS but no longer differs: remove the allowance from scripts/check-secret-mounts.mjs.`
    );
  }
  if (review.unexpected.length > 0 || review.stale.length > 0) {
    console.error(
      `Mount a secret in ${DEPLOY_WORKFLOW} only once ${PRODUCTION_ROOT} or ${STAGING_ROOT} describes it, and the reverse; a deliberate gap goes to ALLOWED_GAPS with its reason.`
    );
    process.exit(1);
  }
  for (const found of review.allowed) {
    const { reason } = ALLOWED_GAPS.find((entry) => sameGap(entry, found));
    console.log(`  allowed: ${found.stage} ${found.secret} (${found.kind}), ${reason}`);
  }
  console.log(
    `\x1b[32m✓\x1b[0m Secret mounts: ${DEPLOY_WORKFLOW} and Terraform agree for production and staging, ${review.allowed.length} allowed gap(s).`
  );
}
