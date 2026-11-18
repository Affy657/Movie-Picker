import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { FOUNDATION } from './cssSyntax.mjs';
import { undeclaredTokenViolations } from './tokenDeclarations.mjs';
import { root, webSrc } from './sources.mjs';

const foundationFile = join(root, FOUNDATION);
const moduleFile = join(webSrc, 'features/events/components/Probe.module.css');
const componentFile = join(webSrc, 'features/events/components/Probe.tsx');

function check({ foundation, module = '', component = '' }) {
  return undeclaredTokenViolations(
    new Map([
      [foundationFile, foundation],
      [moduleFile, module],
    ]),
    new Map([[componentFile, component]]),
    ''
  );
}

describe('token declarations', () => {
  it('refuses a token declared nowhere, in CSS as in TypeScript', () => {
    const found = check({
      foundation: ':root { --space-3: 0.75rem; }',
      module: '.a { padding: var(--space-3); margin: var(--space-9); }',
      component: "const value = element.style.getPropertyValue('--ghost');",
    });

    assert.deepEqual(found, [
      'apps/web/src/features/events/components/Probe.module.css: var(--space-9) is declared nowhere, renamed or removed token?',
      "apps/web/src/features/events/components/Probe.tsx: '--ghost' is read from TypeScript and declared nowhere, renamed or removed token?",
    ]);
  });

  it('refuses a fallback on a foundation token', () => {
    const found = check({
      foundation: ':root { --space-3: 0.75rem; }',
      module: '.a { padding: var(--space-3, 12px); margin: var(--space-3); }',
    });

    assert.equal(found.length, 1);
  });

  it('refuses a foundation token that nothing consumes', () => {
    const found = check({
      foundation: ':root { --space-3: 0.75rem; --unused: 1px; }',
      module: '.a { padding: var(--space-3); }',
    });

    assert.deepEqual(found, [
      `${FOUNDATION}: --unused is declared and consumed nowhere, delete the token`,
    ]);
  });

  it('accepts a token declared by a module, by a style object or consumed indirectly', () => {
    const found = check({
      foundation: ':root { --space-3: 0.75rem; --blue-600: #2563eb; }',
      module: '.a { --local: var(--space-3); padding: var(--local); width: var(--progress); }',
      component: "<div style={{ '--progress': `${value}%` }} />",
    });

    assert.deepEqual(found, []);
  });
});
