import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import type { ReactNode } from 'react';
import { readMovieDetailsTarget, useMovieDetailsParam } from './useMovieDetailsParam';

function wrapper(entry: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  );
}

function useHarness() {
  const param = useMovieDetailsParam();
  const location = useLocation();
  return { ...param, search: location.search, navigationType: useNavigationType() };
}

describe('readMovieDetailsTarget', () => {
  it('reads a movie from ?film and a series from ?serie', () => {
    expect(readMovieDetailsTarget(new URLSearchParams('film=603'))).toEqual({
      tmdbId: 603,
      mediaType: 'movie',
    });
    expect(readMovieDetailsTarget(new URLSearchParams('serie=1399'))).toEqual({
      tmdbId: 1399,
      mediaType: 'tv',
    });
  });

  it('ignores an id that is not a positive integer, and lets the film win over the series', () => {
    expect(readMovieDetailsTarget(new URLSearchParams('film=abc'))).toBeNull();
    expect(readMovieDetailsTarget(new URLSearchParams('film=0'))).toBeNull();
    expect(readMovieDetailsTarget(new URLSearchParams('film=1.5'))).toBeNull();
    expect(readMovieDetailsTarget(new URLSearchParams(''))).toBeNull();
    expect(readMovieDetailsTarget(new URLSearchParams('film=603&serie=1399'))).toEqual({
      tmdbId: 603,
      mediaType: 'movie',
    });
  });
});

describe('useMovieDetailsParam', () => {
  it('starts from the URL', () => {
    const { result } = renderHook(useHarness, { wrapper: wrapper('/watchlist?serie=1399') });
    expect(result.current.target).toEqual({ tmdbId: 1399, mediaType: 'tv' });
  });

  it('opening writes the param next to the existing ones, in place, and closing removes it', () => {
    const { result } = renderHook(useHarness, { wrapper: wrapper('/films/tendances?genre=28') });

    act(() => result.current.open(603, 'movie'));
    expect(result.current.search).toBe('?genre=28&film=603');
    expect(result.current.target).toEqual({ tmdbId: 603, mediaType: 'movie' });
    expect(result.current.navigationType).toBe('REPLACE');

    act(() => result.current.open(1399, 'tv'));
    expect(result.current.search).toBe('?genre=28&serie=1399');

    act(() => result.current.close());
    expect(result.current.search).toBe('?genre=28');
    expect(result.current.target).toBeNull();
    expect(result.current.navigationType).toBe('REPLACE');
  });
});
