import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = join(root, 'apps', 'api-dotnet', 'MoviePicker.Api');
const policies = readFileSync(
  join(root, 'infra', 'terraform', 'modules', 'monitoring', 'main.tf'),
  'utf8'
);

const apiSources = readdirSync(apiDir, { recursive: true })
  .filter((file) => file.endsWith('.cs') && !/[\\/](bin|obj)[\\/]/.test(file))
  .map((file) => readFileSync(join(apiDir, file), 'utf8'));

const alertedTemplates = [...policies.matchAll(/OriginalFormat\}\\"=\\"([^"\\]+)\\"/g)].map(
  ([, template]) => template
);

const declaredTemplates = apiSources.flatMap((source) =>
  [...source.matchAll(/const string \w+LogTemplate = "([^"]+)";/g)].map(([, template]) => template)
);

describe('log-based alert policies', () => {
  it('only match log templates the API still writes', () => {
    assert.notEqual(alertedTemplates.length, 0);
    for (const template of alertedTemplates) {
      assert.ok(
        apiSources.some((source) => source.includes(`"${template}"`)),
        `no API source logs "${template}" any more: its alert policy can never fire`
      );
    }
  });

  it('cover every log template the API declares for an alert', () => {
    assert.notEqual(declaredTemplates.length, 0);
    for (const template of declaredTemplates) {
      assert.ok(
        alertedTemplates.includes(template),
        `"${template}" is declared as an alert template but no policy matches it`
      );
    }
  });
});
