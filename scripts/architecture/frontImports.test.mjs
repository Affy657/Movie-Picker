import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  featureLayerViolations,
  importCycleViolations,
  sharedLeafViolations,
} from './frontImports.mjs';
import { createImportResolver, webSrc } from './sources.mjs';

const inRepo = (...segments) => join(webSrc, ...segments);

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

  it('refuses a feature missing from FEATURE_EDGES', () => {
    const text = `import { x } from '@/shared/i18n';\n`;

    assert.equal(featureLayerViolations(inRepo('features/undeclared/probe.ts'), text).length, 1);
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

  it('accepts shared/ importing shared/, and a test that renders a feature', () => {
    const text = `import { x } from '@/features/movies/api/${moviesModule}';\n`;

    assert.deepEqual(sharedLeafViolations(sharedFile, `import { t } from '@/shared/i18n';\n`), []);
    assert.deepEqual(sharedLeafViolations(inRepo('shared/api/probe.test.ts'), text), []);
  });
});

describe('import cycles', () => {
  const graph = (entries) => {
    const texts = new Map(entries.map(([path, text]) => [inRepo(path), text]));
    return { texts, resolve: createImportResolver((candidate) => texts.has(candidate)) };
  };

  it('refuses two modules that import each other', () => {
    const { texts, resolve } = graph([
      ['shared/probe/a.ts', "import { b } from './b';\nexport const a = 1;\n"],
      ['shared/probe/b.ts', "import { a } from './a';\nexport const b = 2;\n"],
    ]);

    assert.deepEqual(importCycleViolations(texts, resolve), [
      'import cycle: apps/web/src/shared/probe/a.ts -> apps/web/src/shared/probe/b.ts -> apps/web/src/shared/probe/a.ts',
    ]);
  });

  it('accepts a chain, and leaves a cycle through a test file aside', () => {
    const { texts, resolve } = graph([
      ['shared/probe/a.ts', "import { b } from './b';\nexport const a = 1;\n"],
      ['shared/probe/b.ts', "import { fixture } from './fixture.test';\nexport const b = 2;\n"],
      ['shared/probe/fixture.test.ts', "import { a } from './a';\nexport const fixture = a;\n"],
    ]);

    assert.deepEqual(importCycleViolations(texts, resolve), []);
  });
});
