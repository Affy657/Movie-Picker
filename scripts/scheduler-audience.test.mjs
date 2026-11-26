import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const deploy = read('.github/workflows/deploy.yml');
const production = read('infra/terraform/environments/production/main.tf');

describe('the audience of the scheduled passes', () => {
  it('is the public API URL in both the jobs Terraform signs and the API deploy.yml configures', () => {
    const apiDomain = /^\s*api_domain\s*=\s*"([^"]+)"/m.exec(production)?.[1];
    const tokenAudience = /^\s*scheduler_oidc_audience\s*=\s*"([^"]+)"/m.exec(production)?.[1];
    const productionApiUrl = /^\s*PRODUCTION_API_URL:\s*(\S+)\s*$/m.exec(deploy)?.[1];

    assert.equal(tokenAudience, 'https://${local.api_domain}');
    assert.equal(productionApiUrl, `https://${apiDomain}`);
    assert.match(deploy, /SCHEDULER_OIDC_AUDIENCE=\$\{PRODUCTION_API_URL\}##/);
  });
});
