import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  ariaRoleViolations,
  backdropViolations,
  buttonClassViolations,
  modalViolations,
  tapTargetViolations,
} from './primitives.mjs';
import { createImportResolver, webSrc } from './sources.mjs';

const COMPONENT = 'apps/web/src/features/events/components/Probe.tsx';

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

  it('still refuses a backdrop styled in the foundation', () => {
    assert.equal(
      backdropViolations(
        'apps/web/src/styles/01-foundation.css',
        '.overlay::backdrop { background: none; }'
      ).length,
      1
    );
  });

  it('lets the foundation declare its tokens on ::backdrop', () => {
    assert.deepEqual(
      backdropViolations(
        'apps/web/src/styles/01-foundation.css',
        ':root, ::backdrop { --a: 1px; }'
      ),
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

describe('Modal, ARIA and Button primitives', () => {
  it('refuses a hand-written <dialog> outside Modal', () => {
    assert.equal(modalViolations(COMPONENT, '<dialog open>{children}</dialog>').length, 1);
    assert.deepEqual(modalViolations('apps/web/src/shared/components/Modal.tsx', '<dialog />'), []);
    assert.deepEqual(modalViolations(COMPONENT, '<Modal open>{children}</Modal>'), []);
  });

  it('refuses a widget role outside shared/components', () => {
    assert.equal(ariaRoleViolations(COMPONENT, '<div role="menu">').length, 1);
    assert.deepEqual(ariaRoleViolations(COMPONENT, '<div role="status">'), []);
    assert.deepEqual(
      ariaRoleViolations('apps/web/src/shared/components/Menu.tsx', '<div role="menu">'),
      []
    );
  });

  it('refuses a hand-written btn class', () => {
    assert.equal(buttonClassViolations(COMPONENT, '<a className="btn btn-primary">').length, 1);
    assert.deepEqual(
      buttonClassViolations(COMPONENT, '<Button variant="primary" className={styles.btnRow} />'),
      []
    );
  });
});

describe('tap targets', () => {
  const cssFile = join(webSrc, 'features/events/components/Probe.module.css');
  const tsxFile = join(webSrc, 'features/events/components/Probe.tsx');
  const foundation = ':root { --space-6: 1.5rem; --tap-target-min: 2.75rem; }';
  const check = (css, tsx) => {
    const files = new Set([cssFile, tsxFile]);
    return tapTargetViolations(
      new Map([[cssFile, css]]),
      new Map([[tsxFile, `import styles from './Probe.module.css';\n${tsx}`]]),
      foundation,
      createImportResolver((candidate) => files.has(candidate))
    );
  };
  const small = '.close { width: var(--space-6); height: var(--space-6); }';

  it('refuses a clickable element under 44 px', () => {
    assert.equal(check(small, '<button className={styles.close} />').length, 2);
    assert.equal(check('.chip { cursor: pointer; min-height: 1.5rem; }', '').length, 1);
  });

  it('accepts the minimal target, an expanded hit area and a native input', () => {
    const expanded = `.close { composes: expanded from '@/shared/components/tapTarget.module.css'; width: var(--space-6); }`;

    assert.deepEqual(
      check('.close { min-height: var(--tap-target-min); }', '<button className={styles.close} />'),
      []
    );
    assert.deepEqual(check(expanded, '<button className={styles.close} />'), []);
    assert.deepEqual(check(small, '<input className={styles.close} />'), []);
  });
});
