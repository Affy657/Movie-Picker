import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import { sonarA11yPlugin, sonarA11yRules } from './eslint-sonar-a11y.mjs';

const linter = new Linter({ configType: 'flat' });

function ruleIdsFor(code) {
  return linter
    .verify(
      code,
      [
        {
          files: ['**/*.jsx'],
          languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: { 'sonar-a11y': sonarA11yPlugin },
          rules: sonarA11yRules,
        },
      ],
      'view.jsx'
    )
    .map((message) => message.ruleId);
}

test('S6819 refuses a role that a native element already carries', () => {
  assert.deepEqual(ruleIdsFor('<div role="group"><span>Date</span></div>'), [
    'sonar-a11y/prefer-tag-over-role',
  ]);
  assert.deepEqual(ruleIdsFor('<p role="status">Saved</p>'), ['sonar-a11y/prefer-tag-over-role']);
  assert.deepEqual(ruleIdsFor('<span role="img" aria-label="Note" />'), [
    'sonar-a11y/prefer-tag-over-role',
  ]);
});

test('S6819 accepts the patterns SonarJS treats as valid ARIA', () => {
  assert.deepEqual(ruleIdsFor('<p role="status" aria-live="polite">Saved</p>'), []);
  assert.deepEqual(ruleIdsFor('<svg role="img" aria-label="Diagram"><path /></svg>'), []);
  assert.deepEqual(ruleIdsFor('<svg role="img" aria-hidden="true"><path /></svg>'), []);
  assert.deepEqual(ruleIdsFor('<span role="img" aria-label="4 sur 5"><b /></span>'), []);
  assert.deepEqual(ruleIdsFor('<button role="radio" aria-checked={on}>A</button>'), []);
  assert.deepEqual(
    ruleIdsFor('<ul role="listbox">{items.map((item) => <li role="option">{item}</li>)}</ul>'),
    []
  );
  assert.deepEqual(ruleIdsFor('<Card role="group">x</Card>'), []);
});

test('S6847 refuses a handler of the recommended list on a non-interactive element', () => {
  assert.deepEqual(ruleIdsFor('<li onClick={open}>Heat</li>'), [
    'sonar-a11y/no-noninteractive-element-interactions',
  ]);
  assert.deepEqual(ruleIdsFor('<img src="a.jpg" alt="" onLoad={done} />'), []);
  assert.deepEqual(ruleIdsFor('<li onMouseEnter={hover}>Heat</li>'), []);
});
