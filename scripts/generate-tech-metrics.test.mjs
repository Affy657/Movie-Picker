import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  historyMetrics,
  monthsBetween,
  sourceLineMetrics,
} from '../apps/web/scripts/generate-tech-metrics.mjs';

function fakeGit({ shallow = false, commits = 2094, roots = ['2026-02-27'], fails = false } = {}) {
  return (args) => {
    if (fails) throw new Error('git: not a repository');
    if (args[0] === 'rev-parse') return shallow ? 'true' : 'false';
    if (args[0] === 'rev-list') return String(commits);
    if (args[0] === 'log') return roots.join('\n');
    throw new Error(`unexpected git call: ${args.join(' ')}`);
  };
}

const TODAY = new Date(2026, 10, 23);
const PREVIOUS = { commits: 1383, monthsActive: 6 };

describe('historyMetrics', () => {
  it('counts the commits and the full months since the first commit', () => {
    assert.deepEqual(historyMetrics(fakeGit(), { ci: true, previous: PREVIOUS, today: TODAY }), {
      commits: 2094,
      monthsActive: 8,
    });
  });

  it('fails a CI build on a shallow clone instead of reusing the stale figures', () => {
    assert.throws(
      () =>
        historyMetrics(fakeGit({ shallow: true }), { ci: true, previous: PREVIOUS, today: TODAY }),
      /fetch-depth: 0/
    );
  });

  it('fails a CI build when git cannot read the history', () => {
    assert.throws(
      () =>
        historyMetrics(fakeGit({ fails: true }), { ci: true, previous: PREVIOUS, today: TODAY }),
      /git history/
    );
  });

  it('keeps the previous figures on a local shallow clone, and says so', () => {
    const warnings = [];
    const metrics = historyMetrics(fakeGit({ shallow: true }), {
      ci: false,
      previous: PREVIOUS,
      today: TODAY,
      warn: (message) => warnings.push(message),
    });

    assert.deepEqual(metrics, PREVIOUS);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /shallow/);
  });
});

describe('monthsBetween', () => {
  it('only counts a month once its day has come', () => {
    assert.equal(monthsBetween('2026-02-27', new Date(2026, 10, 23)), 8);
    assert.equal(monthsBetween('2026-02-27', new Date(2026, 10, 27)), 9);
  });
});

describe('sourceLineMetrics', () => {
  const sources = {
    'apps/web/src/features/events/EventPage.tsx': 'line\n\n  \nline\nline\n',
    'apps/web/src/features/events/EventPage.test.tsx': 'test\n\ntest\n',
    'apps/web/src/test-utils/render.tsx': 'helper\n',
    'apps/web/src/shared/api/generated/openapiSchema.ts': 'generated\n'.repeat(50),
    'apps/api-dotnet\\MoviePicker.Api\\Domain\\Event.cs': 'code\ncode\n',
    'apps/api-dotnet\\MoviePicker.Api.Tests\\EventTests.cs': 'fact\nfact\n',
  };

  it('counts non-blank lines only, leaves generated code out and gives the share of tests', () => {
    const metrics = sourceLineMetrics(Object.keys(sources), (file) => sources[file], {
      round: (value) => value,
    });

    assert.deepEqual(metrics, { linesOfCode: 10, testLinesShare: 50 });
  });

  it('rounds the total to the thousand by default', () => {
    const big = { 'apps/web/src/app/Big.tsx': 'x\n'.repeat(12_600) };
    const metrics = sourceLineMetrics(Object.keys(big), (file) => big[file]);

    assert.deepEqual(metrics, { linesOfCode: 13_000, testLinesShare: 0 });
  });
});
