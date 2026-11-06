import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import {
  apiLayerViolations,
  backdropViolations,
  featureLayerViolations,
  sharedLeafViolations,
} from './check-architecture.mjs';

const root = resolve(import.meta.dirname, '..');
const inRepo = (...segments) => join(root, 'apps/web/src', ...segments);

const moviesModule = readdirSync(inRepo('features/movies/api'))
  .find((name) => name.endsWith('.ts') && !name.includes('.test.'))
  .replace(/\.ts$/, '');
const moviesTarget = inRepo('features/movies/api', moviesModule);

function relativeSpec(from) {
  const spec = relative(join(from, '..'), moviesTarget).split(sep).join('/');
  return spec.startsWith('.') ? spec : `./${spec}`;
}

describe('feature layers', () => {
  const authFile = inRepo('features/auth/api/probe.ts');
  const eventsFile = inRepo('features/events/api/probe.ts');

  it('refuses a forbidden edge written with an alias', () => {
    const text = `import { x } from '@/features/movies/api/${moviesModule}';\n`;

    assert.equal(featureLayerViolations(authFile, text).length, 1);
  });

  it('refuses a forbidden edge written with a relative path', () => {
    const text = `import { x } from '${relativeSpec(authFile)}';\n`;

    assert.equal(featureLayerViolations(authFile, text).length, 1);
  });

  it('refuses a forbidden edge written as a relative dynamic import', () => {
    const text = `const load = () => import('${relativeSpec(authFile)}');\n`;

    assert.equal(featureLayerViolations(authFile, text).length, 1);
  });

  it('accepts a declared edge, whichever way it is written', () => {
    const text = [
      `import { x } from '@/features/movies/api/${moviesModule}';`,
      `import { y } from '${relativeSpec(eventsFile)}';`,
    ].join('\n');

    assert.deepEqual(featureLayerViolations(eventsFile, text), []);
  });

  it('accepts a relative import inside the same feature', () => {
    const text = `import { x } from './${moviesModule}';\n`;

    assert.deepEqual(featureLayerViolations(inRepo('features/movies/api/probe.ts'), text), []);
  });
});

describe('shared as a leaf', () => {
  const sharedFile = inRepo('shared/api/probe.ts');

  it('refuses a feature imported with an alias', () => {
    const text = `import { x } from '@/features/movies/api/${moviesModule}';\n`;

    assert.equal(sharedLeafViolations(sharedFile, text).length, 1);
  });

  it('refuses a feature imported with a relative path', () => {
    const text = `import { x } from '${relativeSpec(sharedFile)}';\n`;

    assert.equal(sharedLeafViolations(sharedFile, text).length, 1);
  });

  it('refuses a feature imported dynamically', () => {
    const text = `const load = () => import('${relativeSpec(sharedFile)}');\n`;

    assert.equal(sharedLeafViolations(sharedFile, text).length, 1);
  });
});

describe('API layers', () => {
  const file = 'apps/api-dotnet/MoviePicker.Api/Application/Probe.cs';

  it('refuses a plain, static and global using', () => {
    const text = [
      'using MongoDB.Driver;',
      'using static MongoDB.Driver.Builders;',
      'global using Microsoft.AspNetCore.Http;',
    ].join('\n');

    assert.equal(apiLayerViolations('Application', file, text).length, 3);
  });

  it('refuses a namespace or a closed generic reached through an alias', () => {
    const text = [
      'using Driver = MongoDB.Driver;',
      'using Movies = MongoDB.Driver.IMongoCollection<MovieDocument>;',
      'using Rooted = global::MongoDB.Driver.MongoClient;',
    ].join('\n');

    assert.equal(apiLayerViolations('Application', file, text).length, 3);
  });

  it('refuses a fully qualified name in the code', () => {
    const text = [
      'public sealed class Probe(MongoDB.Driver.IMongoDatabase database)',
      '{',
      '    private readonly global::MoviePicker.Api.Infrastructure.Tmdb.TmdbClient client = null!;',
      '}',
    ].join('\n');

    assert.equal(apiLayerViolations('Application', file, text).length, 2);
  });

  it('ignores a statement, a string and a member chain', () => {
    const text = [
      'using System.Linq;',
      'public sealed class Probe',
      '{',
      '    public void Run()',
      '    {',
      '        using var scope = factory.Create();',
      '        using Stream stream = File.OpenRead("MongoDB.Driver.dll");',
      '        logger.LogWarning("Microsoft.AspNetCore.Http is unreachable");',
      '        var name = settings.MongoDB.Database;',
      '    }',
      '}',
    ].join('\n');

    assert.deepEqual(apiLayerViolations('Application', file, text), []);
  });

  it('keeps the allow-list of the domain, aliases included', () => {
    const text = 'using Clock = NodaTime.IClock;\nusing System.Text;\n';

    assert.equal(apiLayerViolations('Domain', file, text).length, 1);
  });
});

describe('modal backdrop', () => {
  const css = 'apps/web/src/features/events/components/Probe.module.css';

  it('refuses a backdrop whatever the selector is called', () => {
    assert.equal(backdropViolations(css, '.overlay::backdrop { background: none; }').length, 1);
    assert.equal(backdropViolations(css, '::backdrop { background: none; }').length, 1);
    assert.equal(backdropViolations(css, '.a, .b::backdrop { background: none; }').length, 1);
  });

  it('leaves the backdrop to the modal primitive and its sheet', () => {
    const text = '.dialog::backdrop { background: none; }';

    assert.deepEqual(
      backdropViolations('apps/web/src/shared/components/Modal.module.css', text),
      []
    );
    assert.deepEqual(
      backdropViolations('apps/web/src/shared/components/SheetDrag.module.css', text),
      []
    );
  });

  it('accepts the transparent backdrop of the confetti popover', () => {
    assert.deepEqual(
      backdropViolations(
        'apps/web/src/features/events/components/WheelModal.module.css',
        '.confettiOverlay::backdrop { background: transparent; }'
      ),
      []
    );
  });
});
