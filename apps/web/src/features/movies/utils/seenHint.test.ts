import { describe, expect, it, vi } from 'vitest';

import { othersAlreadySeenHint } from '@/features/movies/utils/seenHint';

const makeT = () => vi.fn((key: string, _vars?: Record<string, string | number>) => key);

describe('othersAlreadySeenHint', () => {
  it('returns null when nobody has seen the movie', () => {
    expect(othersAlreadySeenHint(undefined, 'Me', makeT())).toBeNull();
    expect(othersAlreadySeenHint([], 'Me', makeT())).toBeNull();
  });

  it('returns null when the only viewer is the current participant', () => {
    expect(othersAlreadySeenHint(['Me'], 'Me', makeT())).toBeNull();
  });

  it('builds the single-other hint', () => {
    const t = makeT();
    expect(othersAlreadySeenHint(['Bob'], 'Me', t)).toBe('movies.seen.othersHintOne');
    expect(t).toHaveBeenCalledWith('movies.seen.othersHintOne', { a: 'Bob' });
  });

  it('builds the two-other hint', () => {
    const t = makeT();
    expect(othersAlreadySeenHint(['Bob', 'Amy'], 'Me', t)).toBe('movies.seen.othersHintTwo');
    expect(t).toHaveBeenCalledWith('movies.seen.othersHintTwo', { a: 'Bob', b: 'Amy' });
  });

  it('builds the many-with-one-extra hint', () => {
    const t = makeT();
    expect(othersAlreadySeenHint(['Bob', 'Amy', 'Zoe'], 'Me', t)).toBe(
      'movies.seen.othersHintManyOne'
    );
    expect(t).toHaveBeenCalledWith('movies.seen.othersHintManyOne', { a: 'Bob', b: 'Amy' });
  });

  it('builds the many-with-count hint', () => {
    const t = makeT();
    expect(othersAlreadySeenHint(['Bob', 'Amy', 'Zoe', 'Kim'], 'Me', t)).toBe(
      'movies.seen.othersHintManyMany'
    );
    expect(t).toHaveBeenCalledWith('movies.seen.othersHintManyMany', {
      a: 'Bob',
      b: 'Amy',
      count: 2,
    });
  });

  it('counts everyone when there is no current participant', () => {
    const t = makeT();
    expect(othersAlreadySeenHint(['Bob'], null, t)).toBe('movies.seen.othersHintOne');
    expect(t).toHaveBeenCalledWith('movies.seen.othersHintOne', { a: 'Bob' });
  });
});
