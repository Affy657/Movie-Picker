import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({
  apiUrl: (path: string) => `https://api.test${path.startsWith('/') ? path : `/${path}`}`,
}));

import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';

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
});
