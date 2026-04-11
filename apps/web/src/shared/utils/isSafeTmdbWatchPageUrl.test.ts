import { describe, it, expect } from 'vitest';
import { isSafeTmdbWatchPageUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';

describe('isSafeTmdbWatchPageUrl', () => {
  it('accepte une page watch TMDB en https', () => {
    expect(isSafeTmdbWatchPageUrl('https://www.themoviedb.org/movie/100/watch?locale=FR')).toBe(
      true
    );
  });

  it('accepte le domaine sans www', () => {
    expect(isSafeTmdbWatchPageUrl('https://themoviedb.org/movie/1/watch')).toBe(true);
  });

  it('refuse http', () => {
    expect(isSafeTmdbWatchPageUrl('http://www.themoviedb.org/movie/1/watch')).toBe(false);
  });

  it('refuse un autre hôte', () => {
    expect(isSafeTmdbWatchPageUrl('https://evil.com/movie/1/watch')).toBe(false);
  });

  it('refuse null / vide', () => {
    expect(isSafeTmdbWatchPageUrl(null)).toBe(false);
    expect(isSafeTmdbWatchPageUrl('')).toBe(false);
    expect(isSafeTmdbWatchPageUrl('   ')).toBe(false);
  });
});
