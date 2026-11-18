import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import { fetchMovieDetails, fetchMovieNights, searchMovies } from '@/features/movies/api/moviesApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('searchMovies', () => {
  it('trims the query and serialises every filter', async () => {
    mockFetchApi.mockResolvedValue({ items: [] });

    await searchMovies('  matrix  ', {
      lang: 'fr',
      eventSlug: 'soiree',
      filters: {
        genreIds: [28, 35],
        yearFrom: 2000,
        yearTo: 2010,
        voteMin: 7,
        originalLanguage: 'ja',
      },
    });

    const url = mockFetchApi.mock.calls[0]?.[0] as string;
    expect(url).toContain('q=matrix');
    expect(url).toContain('lang=fr');
    expect(url).toContain('eventSlug=soiree');
    expect(url).toContain('genreIds=28%2C35');
    expect(url).toContain('yearFrom=2000');
    expect(url).toContain('yearTo=2010');
    expect(url).toContain('voteMin=7');
    expect(url).toContain('language=ja');
  });

  it('wraps a bare array response into the list shape', async () => {
    mockFetchApi.mockResolvedValue([{ id: 1, title: 'A', year: '2000', posterPath: null }]);

    const res = await searchMovies('x');

    expect(res.items).toHaveLength(1);
    expect(res.watchProvidersRegion).toBe('');
    expect(res.disclaimer).toBe('');
  });

  it('defaults missing fields on an object response', async () => {
    mockFetchApi.mockResolvedValue({ items: undefined });

    const res = await searchMovies('x');

    expect(res).toEqual({
      items: [],
      watchProvidersRegion: '',
      disclaimer: '',
      tmdbAttributionUrl: '',
    });
  });

  it('forwards the abort signal', async () => {
    const controller = new AbortController();
    mockFetchApi.mockResolvedValue({ items: [] });

    await searchMovies('x', { signal: controller.signal });

    expect(mockFetchApi).toHaveBeenCalledWith(expect.stringContaining('/movies/search?'), {
      signal: controller.signal,
    });
  });
});

describe('fetchMovieDetails', () => {
  it('adds the mediaType query and fills defaults', async () => {
    mockFetchApi.mockResolvedValue({ title: 'Inception' });

    const res = await fetchMovieDetails(27205, { mediaType: 'movie' });

    expect(mockFetchApi).toHaveBeenCalledWith(
      '/movies/tmdb/27205/details?mediaType=movie',
      undefined
    );
    expect(res.tmdbId).toBe(27205);
    expect(res.overview).toBeNull();
    expect(res.cast).toEqual([]);
    expect(res.genres).toEqual([]);
  });

  it('keeps provided arrays and omits the query string without mediaType', async () => {
    mockFetchApi.mockResolvedValue({ tmdbId: 5, title: 'X', cast: ['A'], genres: ['G'] });

    const res = await fetchMovieDetails(5);

    expect(mockFetchApi).toHaveBeenCalledWith('/movies/tmdb/5/details', undefined);
    expect(res.cast).toEqual(['A']);
    expect(res.genres).toEqual(['G']);
  });

  it('fills the page fields an older API leaves out', async () => {
    mockFetchApi.mockResolvedValue({ tmdbId: 5, title: 'X' });

    const res = await fetchMovieDetails(5);

    expect(res).toMatchObject({
      originalTitle: null,
      originalLanguage: null,
      productionCountries: [],
      budget: null,
      voteCount: null,
      certification: null,
      collection: null,
      directorId: null,
      castMembers: [],
      crew: [],
      videos: [],
    });
  });

  it('keeps the page fields the API sends', async () => {
    const castMembers = [{ name: 'Zendaya', character: 'Chani', profilePath: null }];
    const crew = [{ job: 'composer', name: 'Hans Zimmer' }];
    const videos = [{ key: 'abc', name: 'Bande-annonce', type: 'Trailer', language: 'fr' }];
    mockFetchApi.mockResolvedValue({
      tmdbId: 438631,
      title: 'Dune',
      originalTitle: 'Dune',
      originalLanguage: 'en',
      productionCountries: ['US', 'CA'],
      budget: 165000000,
      voteCount: 12000,
      certification: 'U',
      collection: { id: 726871, name: 'Dune' },
      directorId: 137427,
      castMembers,
      crew,
      videos,
    });

    const res = await fetchMovieDetails(438631);

    expect(res).toMatchObject({
      originalTitle: 'Dune',
      originalLanguage: 'en',
      productionCountries: ['US', 'CA'],
      budget: 165000000,
      voteCount: 12000,
      certification: 'U',
      collection: { id: 726871, name: 'Dune' },
      directorId: 137427,
      castMembers,
      crew,
      videos,
    });
  });
});

describe('fetchMovieNights', () => {
  it('asks the nights of the signed in user for this film', async () => {
    mockFetchApi.mockResolvedValue({
      nights: [],
      proposalCount: 0,
      winCount: 0,
      rating: null,
      seenBy: [],
      seenCount: 0,
    });

    const res = await fetchMovieNights(438631, { mediaType: 'movie' });

    expect(mockFetchApi).toHaveBeenCalledWith(
      '/movies/tmdb/438631/nights?mediaType=movie',
      undefined
    );
    expect(res.proposalCount).toBe(0);
  });

  it('fills what an incomplete answer leaves out', async () => {
    mockFetchApi.mockResolvedValue({});

    const res = await fetchMovieNights(5);

    expect(mockFetchApi).toHaveBeenCalledWith('/movies/tmdb/5/nights', undefined);
    expect(res).toEqual({
      nights: [],
      proposalCount: 0,
      winCount: 0,
      rating: null,
      seenBy: [],
      seenCount: 0,
    });
  });
});
