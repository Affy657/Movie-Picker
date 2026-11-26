import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { MovieDetails } from '@/features/movies/api/moviesApi';
import { HERO_POSTER_SIZES, heroPosterSources } from '@/app/pages/movie/heroPoster';
import { useMoviePagePrefetch } from '@/app/pages/movie/moviePagePrefetch';

const { preload, fetchMovieDetails } = vi.hoisted(() => ({
  preload: vi.fn(),
  fetchMovieDetails: vi.fn(),
}));

vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  preload,
}));

vi.mock('@/features/movies/api/moviesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/movies/api/moviesApi')>()),
  fetchMovieDetails,
}));

const POSTER_PATH = '/api/v1/posters/tmdb/w500/dune.jpg';

function Probe() {
  useMoviePagePrefetch();
  return null;
}

function renderAt(path: string) {
  const client = createTestQueryClient();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Probe />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return client;
}

describe('useMoviePagePrefetch', () => {
  afterEach(() => {
    preload.mockReset();
    fetchMovieDetails.mockReset();
  });

  it('asks for the film under the key the page reads, then preloads the poster the hero shows', async () => {
    fetchMovieDetails.mockResolvedValue({ posterPath: POSTER_PATH } as MovieDetails);

    const client = renderAt('/film/438631-dune');

    expect(client.getQueryState(queryKeys.movies.details(438631, 'movie'))?.fetchStatus).toBe(
      'fetching'
    );
    const { src, srcSet } = heroPosterSources(POSTER_PATH);
    await waitFor(() =>
      expect(preload).toHaveBeenCalledWith(src, {
        as: 'image',
        imageSrcSet: srcSet,
        imageSizes: HERO_POSTER_SIZES,
        fetchPriority: 'high',
      })
    );
    expect(fetchMovieDetails).toHaveBeenCalledWith(
      438631,
      expect.objectContaining({ mediaType: 'movie' })
    );
  });

  it('reads a series page as a series', () => {
    fetchMovieDetails.mockResolvedValue({ posterPath: null } as MovieDetails);

    const client = renderAt('/serie/1399-game-of-thrones');

    expect(client.getQueryState(queryKeys.movies.details(1399, 'tv'))?.fetchStatus).toBe(
      'fetching'
    );
  });

  it('preloads nothing for a film without a poster', async () => {
    fetchMovieDetails.mockResolvedValue({ posterPath: null } as MovieDetails);

    const client = renderAt('/film/438631-dune');

    await waitFor(() =>
      expect(client.getQueryState(queryKeys.movies.details(438631, 'movie'))?.status).toBe(
        'success'
      )
    );
    expect(preload).not.toHaveBeenCalled();
  });

  it('does nothing on another page', () => {
    const client = renderAt('/films/tendances');

    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(fetchMovieDetails).not.toHaveBeenCalled();
  });
});
