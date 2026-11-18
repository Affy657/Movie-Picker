import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FOUNDATION } from './cssSyntax.mjs';
import {
  backdropTokenViolations,
  browserSupportViolations,
  jsApiViolations,
  readSafariFloor,
  safariFloorOf,
} from './browserSupport.mjs';
import { root } from './sources.mjs';

const MODULE = 'apps/web/src/features/events/components/Probe.module.css';
const FLOOR = 15.4;

describe('safari floor', () => {
  it('keeps the oldest Safari the browserslist resolves to', () => {
    assert.equal(
      safariFloorOf(['chrome 111', 'ios_saf 15.6-15.8', 'ios_saf 15.4', 'safari 16.0']),
      15.4
    );
  });

  it('refuses a browserslist without Safari', () => {
    assert.throws(() => safariFloorOf(['chrome 111']));
  });

  it('reads the floor of the web app from its package.json', () => {
    assert.equal(readSafariFloor(root), 15.4);
  });
});

describe('CSS newer than the oldest supported iPhone', () => {
  it('refuses a feature the floor does not know', () => {
    for (const css of [
      '@container card (min-width: 20rem) { .a { display: none; } }',
      '.a { transition-timing-function: linear(0, 1); }',
      '.a { color: light-dark(var(--a), var(--b)); }',
      '@starting-style { .a { opacity: 0; } }',
      '.a { anchor-name: --menu; }',
      '.a { field-sizing: content; }',
    ])
      assert.equal(browserSupportViolations(MODULE, css, FLOOR).length, 1, css);
  });

  it('accepts what the floor knows or the build lowers', () => {
    const css =
      '.a:has(.b) { height: 100dvh; inset: 0; } @media (width >= 48rem) { .a { gap: var(--space-2); } }';
    assert.deepEqual(browserSupportViolations(MODULE, css, FLOOR), []);
  });

  it('lets a higher floor use the feature', () => {
    assert.deepEqual(browserSupportViolations(MODULE, '@container (min-width: 1rem) {}', 16), []);
  });

  it('ignores a feature named in a comment', () => {
    assert.deepEqual(browserSupportViolations(MODULE, '/* @container */ .a {}', FLOOR), []);
  });
});

describe('color-mix() outside the tokens', () => {
  it('needs a fallback of the same property just before', () => {
    assert.equal(
      browserSupportViolations(
        MODULE,
        '.a { background: color-mix(in srgb, currentColor 10%, transparent); }',
        FLOOR
      ).length,
      1
    );
    assert.deepEqual(
      browserSupportViolations(
        MODULE,
        '.a { background: var(--color-surface-hover); background: color-mix(in srgb, currentColor 10%, transparent); }',
        FLOOR
      ),
      []
    );
  });

  it('refuses a literal fallback, which the minifier drops', () => {
    assert.equal(
      browserSupportViolations(
        MODULE,
        '.a { color: #777; color: color-mix(in srgb, currentColor 60%, transparent); }',
        FLOOR
      ).length,
      1
    );
  });

  it('refuses a mix of a token, which old Safari keeps and then drops', () => {
    assert.equal(
      browserSupportViolations(
        MODULE,
        '.a { background: var(--color-surface-hover); background: color-mix(in srgb, var(--color-text) 10%, transparent); }',
        FLOOR
      ).length,
      1
    );
  });

  it('leaves the foundation to its generated fallback', () => {
    assert.deepEqual(
      browserSupportViolations(
        FOUNDATION,
        ':root { --a: color-mix(in srgb, var(--b) 10%, transparent); }',
        FLOOR
      ),
      []
    );
  });
});

describe('tokens read by ::backdrop', () => {
  const foundation = ':root,\n::backdrop {\n  --color-overlay-backdrop: rgba(0, 0, 0, 0.5);\n}\n';

  it('accepts a token declared on ::backdrop or a var() with a fallback', () => {
    const sheets = new Map([
      [
        MODULE,
        '.d::backdrop { background: var(--color-overlay-backdrop); opacity: var(--progress, 1); }',
      ],
    ]);
    assert.deepEqual(backdropTokenViolations(sheets, foundation), []);
  });

  it('refuses a token old Safari cannot see from ::backdrop', () => {
    const sheets = new Map([[MODULE, '.d::backdrop { background: var(--color-bg-scrim); }']]);
    assert.equal(backdropTokenViolations(sheets, foundation).length, 1);
  });
});

describe('browser APIs newer than the oldest supported iPhone', () => {
  const SOURCE = 'apps/web/src/features/events/components/Probe.tsx';

  it('refuses a call the floor does not know', () => {
    for (const code of [
      'dialog.showPopover();',
      'fetch(url, { signal: AbortSignal.any([a, b]) });',
      'const groups = Object.groupBy(items, (item) => item.kind);',
      'const firsts = map.values().map((value) => value[0]);',
      'element.checkVisibility();',
    ])
      assert.equal(jsApiViolations(SOURCE, code, FLOOR).length, 1, code);
  });

  it('accepts a call detected just before', () => {
    const code =
      "if (typeof overlay.showPopover === 'function') overlay.showPopover(); overlay.hidePopover();";
    assert.deepEqual(jsApiViolations(SOURCE, code, FLOOR), []);
  });

  it('leaves alone a name that only looks like one', () => {
    assert.deepEqual(
      jsApiViolations(SOURCE, 'isWellFormedEventSlug(slug); Object.entries(map).map(f);', FLOOR),
      []
    );
  });
});
