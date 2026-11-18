import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FOUNDATION } from './cssSyntax.mjs';
import { designTokenViolations } from './cssValues.mjs';

const MODULE = 'apps/web/src/features/events/components/Probe.module.css';
const GLOBAL_SHEET = 'apps/web/src/styles/02-probe.css';

const RULES = [
  [
    'breakpoint outside the scale',
    '@media (max-width: 600px) { .a { display: none; } }',
    '@media (max-width: 47.9375rem) { .a { display: none; } }',
  ],
  ['literal spacing', '.a { padding: 12px; }', '.a { padding: var(--space-3); }'],
  [
    'literal spacing mixed with a token',
    '.a { margin: calc(var(--space-2) + 4px); }',
    '.a { margin: calc(var(--space-2) + var(--space-1)); }',
  ],
  [
    'size under 96 px',
    '.a { width: 40px; }',
    '.a { width: var(--icon-lg); max-width: 120px; height: 1px; }',
  ],
  [
    'grid track under 96 px',
    '.a { grid-template-columns: 48px 1fr; }',
    '.a { grid-template-columns: var(--avatar-md) 1fr; }',
  ],
  [
    'local custom property laundering a literal',
    '.a { --gap: 12px; }',
    '.a { --gap: var(--space-3); }',
  ],
  [
    'local custom property holding a named colour',
    '.a { --tint: white; }',
    '.a { --tint: var(--color-surface); }',
  ],
  [
    'literal translate',
    '.a { transform: translateY(4px); }',
    '.a { transform: translateY(var(--lift-sm)); }',
  ],
  [
    'literal opacity outside keyframes',
    '.a { opacity: 0.6; }',
    '.a { opacity: var(--opacity-muted); } @keyframes fade { from { opacity: 0.2; } }',
  ],
  [
    'literal font-size',
    '.a { font-size: 14px; }',
    '.a { font-size: clamp(var(--font-size-lg), 4vw, var(--font-size-2xl)); }',
  ],
  ['font shorthand', '.a { font: 600 1rem sans-serif; }', '.a { font: inherit; }'],
  ['literal z-index', '.a { z-index: 10; }', '.a { z-index: var(--z-overlay); }'],
  ['literal colour', '.a { color: #fff; }', '.a { color: var(--color-text); }'],
  [
    'named colour',
    '.a { background: white; }',
    '.a { background: url("white.svg") var(--color-surface); }',
  ],
  [
    'primary as a text colour',
    '.a { color: var(--color-primary); }',
    '.a { color: var(--color-primary-text); }',
  ],
  [
    'colour primitive in a module',
    '.a { background: var(--blue-600); }',
    '.a { background: var(--color-primary); }',
  ],
  [
    'color-mix() on a role in a module',
    '.a { background: color-mix(in srgb, var(--color-text) 8%, transparent); }',
    '.a { background: var(--color-surface-hover); }',
  ],
  ['literal line-height', '.a { line-height: 1.4; }', '.a { line-height: var(--leading-tight); }'],
  [
    'literal letter-spacing',
    '.a { letter-spacing: 0.02em; }',
    '.a { letter-spacing: var(--tracking-wide); }',
  ],
  [
    'literal font-weight',
    '.a { font-weight: 600; }',
    '.a { font-weight: var(--font-weight-semibold); }',
  ],
  ['literal font-family', '.a { font-family: Arial; }', '.a { font-family: var(--font-body); }'],
  ['literal border-radius', '.a { border-radius: 8px; }', '.a { border-radius: 50%; }'],
  [
    'literal duration and easing',
    '.a { transition: color 200ms ease; }',
    '.a { transition: color var(--duration-fast) var(--ease-out); }',
  ],
  [
    'duration token without its easing',
    '.a { transition: color var(--duration-fast); }',
    '.a { transition: none; }',
  ],
  [
    'border wider than 2 px',
    '.a { border: 3px solid var(--color-border); }',
    '.a { border: 1px solid var(--color-border); }',
  ],
  [
    'focus outline written by hand',
    '.a { outline: 2px solid var(--color-primary); }',
    '.a { outline: var(--outline-focus); }',
  ],
  [
    'literal outline-offset',
    '.a { outline-offset: 3px; }',
    '.a { outline-offset: var(--outline-offset); }',
  ],
  [
    'literal blur',
    '.a { backdrop-filter: blur(8px); }',
    '.a { backdrop-filter: blur(var(--backdrop-blur-md)); }',
  ],
  [
    'focus ring removed without its replacement',
    '.a:focus-visible { outline: none; }',
    '.a:focus-visible { outline: none; box-shadow: var(--ring-focus); }',
  ],
];

describe('design system values in CSS', () => {
  for (const [rule, failing, passing] of RULES) {
    it(`refuses ${rule}`, () => {
      assert.notDeepEqual(designTokenViolations(MODULE, failing), []);
    });

    it(`accepts the token form of ${rule}`, () => {
      assert.deepEqual(designTokenViolations(MODULE, passing), []);
    });
  }

  it('lets a global sheet consume a colour primitive', () => {
    assert.deepEqual(
      designTokenViolations(GLOBAL_SHEET, '.a { background: var(--blue-600); }'),
      []
    );
  });

  it('lets the foundation declare literal tokens, and nothing else', () => {
    const declarations = ':root {\n  --space-3: 0.75rem;\n  --blue-600: #2563eb;\n}';

    assert.deepEqual(designTokenViolations(FOUNDATION, declarations), []);
    assert.notDeepEqual(designTokenViolations(FOUNDATION, '.a { padding: 12px; }'), []);
  });
});
