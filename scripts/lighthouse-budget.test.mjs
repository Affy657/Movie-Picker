import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCategory } from './lighthouse-budget.mjs';

function run(category, score) {
  return { categories: { [category]: score === undefined ? undefined : { score } } };
}

describe('reviewCategory', () => {
  it('passes the median of the runs when it reaches the floor', () => {
    const lhrs = [run('seo', 0.9), run('seo', 0.96), run('seo', 1)];

    assert.deepEqual(reviewCategory(lhrs, 'seo', { min: 95 }), { score: 96, failure: null });
  });

  it('fails a median under the floor', () => {
    const lhrs = [run('seo', 0.9), run('seo', 0.9), run('seo', 1)];

    assert.deepEqual(reviewCategory(lhrs, 'seo', { min: 95 }), {
      score: 90,
      failure: '90 < 95',
    });
  });

  it('keeps an ignored threshold out of the verdict', () => {
    const lhrs = [run('seo', 0.69)];

    assert.deepEqual(reviewCategory(lhrs, 'seo', { min: 95, ignoreThreshold: true }), {
      score: 69,
      failure: null,
    });
  });

  it('fails a category no run could score', () => {
    const lhrs = [run('performance', null), run('performance', null), run('other', 1)];

    const { score, failure } = reviewCategory(lhrs, 'performance', { min: 85 });

    assert.equal(score, null);
    assert.match(failure, /no score in 3 run/);
  });

  it('fails a missing score even when the threshold is ignored', () => {
    const { failure } = reviewCategory([run('seo', undefined)], 'seo', {
      min: 95,
      ignoreThreshold: true,
    });

    assert.match(failure, /no score/);
  });

  it('reads the scores that exist when one run lost its category', () => {
    const lhrs = [run('seo', null), run('seo', 0.97)];

    assert.deepEqual(reviewCategory(lhrs, 'seo', { min: 95 }), { score: 97, failure: null });
  });
});
