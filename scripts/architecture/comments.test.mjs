import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { commentViolations } from './comments.mjs';

describe('comments', () => {
  it('refuses a line, a block and a JSX comment, every line of the block included', () => {
    const text = [
      'const answer = 42;',
      '// explains the answer',
      '/* opens a block',
      'closes it */',
      '{/* in JSX */}',
    ].join('\n');

    assert.deepEqual(commentViolations('probe.tsx', text), [
      'probe.tsx:2 forbidden comment',
      'probe.tsx:3 forbidden comment',
      'probe.tsx:4 forbidden comment',
      'probe.tsx:5 forbidden comment',
    ]);
  });

  it('accepts functional directives and a URL in a string', () => {
    const text = [
      '// eslint-disable-next-line no-console',
      '// @ts-expect-error the typing lags behind',
      '/// <reference types="vite/client" />',
      '/*! licence kept by the bundler */',
      '{/* prettier-ignore */}',
      "const url = 'https://example.com';",
    ].join('\n');

    assert.deepEqual(commentViolations('probe.tsx', text), []);
  });
});
