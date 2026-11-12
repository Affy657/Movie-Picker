import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import {
  readLegacyMovieTarget,
  useLegacyMovieLinkRedirect,
} from '@/app/components/useLegacyMovieLinkRedirect';

function wrapper(entry: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  );
}

function useHarness() {
  useLegacyMovieLinkRedirect();
  const location = useLocation();
  return `${location.pathname}${location.search}`;
}

describe('readLegacyMovieTarget', () => {
  it('reads a movie from ?film and a series from ?serie', () => {
    expect(readLegacyMovieTarget(new URLSearchParams('film=603'))).toEqual({
      tmdbId: 603,
      mediaType: 'movie',
    });
    expect(readLegacyMovieTarget(new URLSearchParams('serie=1399'))).toEqual({
      tmdbId: 1399,
      mediaType: 'tv',
    });
  });

  it('ignores an id that is not a positive integer, and lets the film win over the series', () => {
    expect(readLegacyMovieTarget(new URLSearchParams('film=abc'))).toBeNull();
    expect(readLegacyMovieTarget(new URLSearchParams('film=0'))).toBeNull();
    expect(readLegacyMovieTarget(new URLSearchParams('film=1.5'))).toBeNull();
    expect(readLegacyMovieTarget(new URLSearchParams(''))).toBeNull();
    expect(readLegacyMovieTarget(new URLSearchParams('film=603&serie=1399'))).toEqual({
      tmdbId: 603,
      mediaType: 'movie',
    });
  });
});

describe('useLegacyMovieLinkRedirect', () => {
  it('sends an old film link to the film page', () => {
    const { result } = renderHook(useHarness, { wrapper: wrapper('/watchlist?film=603') });

    expect(result.current).toBe('/film/603');
  });

  it('keeps the night when the old link came from a night page', () => {
    const { result } = renderHook(useHarness, { wrapper: wrapper('/e/Ab3x?serie=1399') });

    expect(result.current).toBe('/serie/1399?soiree=Ab3x');
  });

  it('leaves any other address alone', () => {
    const { result } = renderHook(useHarness, { wrapper: wrapper('/watchlist?tri=titre') });

    expect(result.current).toBe('/watchlist?tri=titre');
  });
});
