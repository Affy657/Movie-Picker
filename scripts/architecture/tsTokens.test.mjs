import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { avatarScaleViolations, iconScaleViolations, inlineStyleViolations } from './tsTokens.mjs';

const COMPONENT = 'apps/web/src/features/events/components/Probe.tsx';

describe('tokens in TypeScript', () => {
  const RULES = [
    [
      'a numeric zIndex',
      '<div style={{ zIndex: open ? 10 : 0 }} />',
      '<div className={styles.layer} />',
    ],
    ['a numeric icon size', '<Star size={16} />', '<Star size={ICON_SIZE.md} />'],
    [
      'square numeric dimensions',
      '<Logo width={24} height={24} />',
      '<img width={24} height={24} />',
    ],
    [
      'a numeric default size',
      'function Glyph({ size = 16 }) {}',
      'function Glyph({ size = ICON_SIZE.md }) {}',
    ],
    [
      'a color-mix() on a role',
      "<div style={{ background: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }} />",
      "<div style={{ background: 'var(--color-surface-hover)' }} />",
    ],
    ['a literal colour', "const ink = '#ff0000';", "const ink = readCssToken('--color-text');"],
  ];

  for (const [rule, failing, passing] of RULES) {
    it(`refuses ${rule}`, () => {
      assert.notDeepEqual(inlineStyleViolations(COMPONENT, failing), []);
    });

    it(`accepts the token form of ${rule}`, () => {
      assert.deepEqual(inlineStyleViolations(COMPONENT, passing), []);
    });
  }

  it('lets the QR code paint its colours and a test use numbers', () => {
    assert.deepEqual(
      inlineStyleViolations('apps/web/src/shared/components/QrCode.tsx', "const ink = '#000000';"),
      []
    );
    assert.deepEqual(
      inlineStyleViolations(
        'apps/web/src/features/events/components/Probe.test.tsx',
        '<Star size={16} />'
      ),
      []
    );
  });
});

describe('icon and avatar scales', () => {
  const foundation = [
    ':root {',
    '  --space-8: 2rem;',
    '  --icon-sm: 1rem;',
    '  --icon-md: 1.25rem;',
    '  --avatar-sm: var(--space-8);',
    '  --avatar-md: 2.5rem;',
    '}',
  ].join('\n');
  const iconSize = (md) => `export const ICON_SIZE = {\n  sm: 16,\n  md: ${md},\n} as const;\n`;
  const avatar = (md) => `const SIZE_PX: Record<AvatarSize, number> = { sm: 32, md: ${md} };\n`;

  it('accepts constants that match the foundation', () => {
    assert.deepEqual(iconScaleViolations(foundation, iconSize(20)), []);
    assert.deepEqual(avatarScaleViolations(foundation, avatar(40)), []);
  });

  it('refuses a constant that drifted from its token', () => {
    assert.equal(iconScaleViolations(foundation, iconSize(24)).length, 1);
    assert.equal(avatarScaleViolations(foundation, avatar(44)).length, 1);
  });

  it('refuses a step without its token', () => {
    const extraStep = `export const ICON_SIZE = {\n  sm: 16,\n  md: 20,\n  lg: 28,\n} as const;\n`;

    assert.equal(iconScaleViolations(foundation, extraStep).length, 1);
  });
});
