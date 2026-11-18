import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  deadGlobalClassViolations,
  deadModuleClassViolations,
  globalTargetViolations,
} from './deadCss.mjs';
import { createImportResolver, webSrc } from './sources.mjs';

const cssFile = join(webSrc, 'features/events/components/Probe.module.css');
const tsxFile = join(webSrc, 'features/events/components/Probe.tsx');
const otherTsxFile = join(webSrc, 'features/events/components/Other.tsx');
const globalSheet = join(webSrc, 'styles/02-probe.css');
const MODULE_PATH = 'apps/web/src/features/events/components/Probe.module.css';

function deadModuleClasses(css, sources) {
  const texts = new Map(sources);
  const files = new Set([cssFile, ...texts.keys()]);
  return deadModuleClassViolations(
    new Map([[cssFile, css]]),
    texts,
    createImportResolver((candidate) => files.has(candidate))
  );
}

describe('dead classes of a CSS module', () => {
  const importStyles = "import styles from './Probe.module.css';\n";

  it('refuses a class that no component reads', () => {
    const { violations } = deadModuleClasses('.used { display: grid; } .dead { display: none; }', [
      [tsxFile, `${importStyles}<div className={styles.used} />`],
    ]);

    assert.deepEqual(violations, [
      `${MODULE_PATH}: .dead is declared and never used, delete the class`,
    ]);
  });

  it('counts an alias, a re-export, a composes target, a :global() and a kebab-case class', () => {
    const css = [
      '.base { display: grid; }',
      '.card { composes: base; }',
      '.list :global(.row) { display: flex; }',
      '.wide-row { display: flex; }',
      '.shared { display: block; }',
    ].join('\n');
    const { violations } = deadModuleClasses(css, [
      [
        tsxFile,
        "import * as probe from './Probe.module.css';\nexport { probe as probeStyles };\n<div className={probe.card} /><ul className={probe.list} /><li className={probe.wideRow} />",
      ],
      [otherTsxFile, '<div className={probeStyles.shared} />'],
    ]);

    assert.deepEqual(violations, []);
  });

  it('excludes and lists a module read with brackets', () => {
    const result = deadModuleClasses('.primary { color: var(--color-text); }', [
      [tsxFile, `${importStyles}<div className={styles[tone]} />`],
    ]);

    assert.deepEqual(result, { violations: [], excluded: [MODULE_PATH] });
  });
});

describe('dead global classes and :global targets', () => {
  it('refuses a global class that no source mentions', () => {
    const sheets = new Map([
      [globalSheet, '.orphan { display: none; } .lucide-spin { display: none; }'],
    ]);

    assert.deepEqual(deadGlobalClassViolations(sheets, new Map([[tsxFile, '<div />']])), [
      'apps/web/src/styles/02-probe.css: .orphan is declared and never used, delete the class',
    ]);
    assert.deepEqual(
      deadGlobalClassViolations(sheets, new Map([[tsxFile, '<div className="orphan" />']])),
      []
    );
  });

  it('refuses a :global() that targets a class nobody declares or renders', () => {
    const module = new Map([[cssFile, '.a :global(.ghost) { display: none; }']]);
    const declared = new Map([...module, [globalSheet, '.ghost { display: block; }']]);

    assert.equal(globalTargetViolations(module, new Map([[tsxFile, '<div />']])).length, 1);
    assert.deepEqual(globalTargetViolations(declared, new Map([[tsxFile, '<div />']])), []);
    assert.deepEqual(
      globalTargetViolations(module, new Map([[tsxFile, '<div className="ghost" />']])),
      []
    );
  });
});
