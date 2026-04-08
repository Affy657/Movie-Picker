import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/client', () => ({
  apiUrl: (path: string) => `https://api.test${path.startsWith('/') ? path : `/${path}`}`,
}));

import { posterImageSrc } from './posterUrl';

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
