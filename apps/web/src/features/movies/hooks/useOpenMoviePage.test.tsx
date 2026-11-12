import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { readMoviePageState, useOpenMoviePage } from '@/features/movies/hooks/useOpenMoviePage';

const dune = { tmdbId: 438631, mediaType: 'movie' as const, title: 'Dune', year: '2021' };

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/watchlist']}>{children}</MemoryRouter>;
}

describe('useOpenMoviePage', () => {
  it('opens the film page and hands it what the card already knows', () => {
    const { result } = renderHook(() => ({ open: useOpenMoviePage(), location: useLocation() }), {
      wrapper,
    });

    act(() => result.current.open(dune, 'Ab3x'));

    expect(result.current.location.pathname).toBe('/film/438631-dune');
    expect(result.current.location.search).toBe('?soiree=Ab3x');
    expect(readMoviePageState(result.current.location.state)).toEqual({
      fromApp: true,
      seed: dune,
    });
  });
});

describe('readMoviePageState', () => {
  it('ignores a state the app did not write', () => {
    expect(readMoviePageState(null)).toBeNull();
    expect(readMoviePageState({ seed: dune })).toBeNull();
    expect(readMoviePageState({ fromApp: true })).toEqual({ fromApp: true, seed: undefined });
  });
});
