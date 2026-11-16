import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCategory, selectPages } from './lighthouse-budget.mjs';

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

describe('selectPages', () => {
  const pages = ['home', 'donate', 'profile', 'login', 'register'].map((slug) => ({ slug }));
  const slugsOf = (selected) => selected.map((page) => page.slug);

  it('keeps every page without a filter', () => {
    assert.deepEqual(slugsOf(selectPages(pages)), [
      'home',
      'donate',
      'profile',
      'login',
      'register',
    ]);
  });

  it('narrows to the listed slugs', () => {
    assert.deepEqual(slugsOf(selectPages(pages, { only: 'login, home' })), ['home', 'login']);
  });

  it('spreads the pages over the shards without losing or repeating one', () => {
    const shards = [1, 2, 3].map((index) => slugsOf(selectPages(pages, { shard: `${index}/3` })));

    assert.deepEqual(shards, [['home', 'login'], ['donate', 'register'], ['profile']]);
    assert.deepEqual(shards.flat().sort(), slugsOf(pages).sort());
  });

  it('refuses a shard that cannot exist', () => {
    for (const shard of ['0/3', '4/3', '1/0', 'two/3', '1']) {
      assert.throws(() => selectPages(pages, { shard }), /LH_SHARD/);
    }
  });
});
