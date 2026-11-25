import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(root, file), 'utf8');

const workflow = read('.github/workflows/deploy.yml');
const cloudRunModule = read('infra/terraform/modules/cloud-run-api/main.tf');
const healthController = read('apps/api-dotnet/MoviePicker.Api/Controllers/HealthController.cs');

function pipelineProbe() {
  const flags = [...workflow.matchAll(/--startup-probe "([^"]+)"/g)];
  assert.equal(
    flags.length,
    1,
    'deploy.yml sets the startup probe in exactly one gcloud run deploy'
  );
  return Object.fromEntries(flags[0][1].split(',').map((setting) => setting.split('=')));
}

function terraformProbe() {
  const block = /startup_probe \{([\s\S]*?)\n {6}\}/.exec(cloudRunModule);
  assert.ok(block, 'the cloud-run-api module describes a startup_probe block');
  const value = (name) => new RegExp(String.raw`\b${name}\s*=\s*"?([^"\s]+)"?`).exec(block[1])?.[1];
  return {
    'httpGet.path': value('path'),
    'httpGet.port': value('port'),
    periodSeconds: value('period_seconds'),
    failureThreshold: value('failure_threshold'),
  };
}

describe('Cloud Run startup probe', () => {
  it('is the same HTTP probe in deploy.yml and in the cloud-run-api module', () => {
    assert.deepEqual(terraformProbe(), pipelineProbe());
  });

  it('probes a route the API serves', () => {
    assert.equal(pipelineProbe()['httpGet.path'], '/health');
    assert.match(healthController, /\[Route\("health"\)\]/);
  });

  it('stays out of the Terraform updates of a service gcloud deployed', () => {
    const ignored = /ignore_changes = \[([\s\S]*?)\n\s*\]/.exec(cloudRunModule)?.[1] ?? '';
    assert.ok(
      ignored.split(/\s*,?\s*\n\s*/).includes('template[0].containers[0].startup_probe'),
      'a probe changed by Terraform on a service gcloud deployed is refused with a 409'
    );
  });
});
