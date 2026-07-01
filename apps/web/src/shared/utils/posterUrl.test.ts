import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({
  apiUrl: (path: string) => `https://api.test${path.startsWith('/') ? path : `/${path}`}`,
}));

import {
  posterImageSrc,
  tmdbPosterSrcForListDisplay,
  tmdbPosterSrcSetForList,
} from '@/shared/utils/posterUrl';

describe('posterImageSrc', () => {
  it('returns undefined for null or empty', () => {
    expect(posterImageSrc(null)).toBeUndefined();
    expect(posterImageSrc('')).toBeUndefined();
    expect(posterImageSrc('   ')).toBeUndefined();
  });

  it('keeps absolute http(s) URLs', () => {
    expect(posterImageSrc('https://image.tmdb.org/t/p/w154/x.jpg')).toBe(
      'https://image.tmdb.org/t/p/w154/x.jpg'
    );
  });

  it('prefixes API paths with api base', () => {
    expect(posterImageSrc('/api/v1/posters/' + 'a'.repeat(64))).toBe(
      'https://api.test/api/v1/posters/' + 'a'.repeat(64)
    );
  });

  it('adds a leading slash to relative paths before prefixing', () => {
    expect(posterImageSrc('posters/x')).toBe('https://api.test/posters/x');
  });
});

describe('tmdbPosterSrcForListDisplay', () => {
  it('returns undefined for undefined input', () => {
    expect(tmdbPosterSrcForListDisplay(undefined)).toBeUndefined();
  });

  it('upgrades TMDB w154 to w185', () => {
    expect(tmdbPosterSrcForListDisplay('https://image.tmdb.org/t/p/w154/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/w185/abc.jpg'
    );
  });

  it('leaves non-TMDB URLs unchanged', () => {
    expect(tmdbPosterSrcForListDisplay('https://api.test/api/v1/posters/x')).toBe(
      'https://api.test/api/v1/posters/x'
    );
  });

  it('leaves TMDB URLs without a size segment unchanged', () => {
    expect(tmdbPosterSrcForListDisplay('https://image.tmdb.org/other/abc.jpg')).toBe(
      'https://image.tmdb.org/other/abc.jpg'
    );
  });

  it('returns malformed input unchanged', () => {
    expect(tmdbPosterSrcForListDisplay('not a url')).toBe('not a url');
  });
});

describe('tmdbPosterSrcSetForList', () => {
  it('returns undefined for empty, non-TMDB or size-less URLs', () => {
    expect(tmdbPosterSrcSetForList(undefined)).toBeUndefined();
    expect(tmdbPosterSrcSetForList('http://image.tmdb.org/t/p/w500/x.jpg')).toBeUndefined();
    expect(tmdbPosterSrcSetForList('https://example.com/t/p/w500/x.jpg')).toBeUndefined();
    expect(tmdbPosterSrcSetForList('https://image.tmdb.org/other/x.jpg')).toBeUndefined();
  });

  it('builds a w92/w185/w342 srcset from a TMDB poster', () => {
    expect(tmdbPosterSrcSetForList('https://image.tmdb.org/t/p/w500/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/w92/abc.jpg 92w, ' +
        'https://image.tmdb.org/t/p/w185/abc.jpg 185w, ' +
        'https://image.tmdb.org/t/p/w342/abc.jpg 342w'
    );
  });

  it('returns undefined for malformed input', () => {
    expect(tmdbPosterSrcSetForList('not a url')).toBeUndefined();
  });
});
