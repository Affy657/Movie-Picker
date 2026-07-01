import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  addMovieToEvent,
  clearMovieVote,
  deleteMoviePitchNote,
  fetchEventMovies,
  fetchMovieDetails,
  markMovieAsSeen,
  removeMovieFromEvent,
  searchMovies,
  setMoviePitchNote,
  unmarkMovieAsSeen,
  voteMovie,
} from '@/features/movies/api/moviesApi';

vi.mock('@/shared/api/client', () => ({ fetchApi: vi.fn() }));
vi.mock('@/shared/api/apiMapping', () => ({
  mapMovieData: vi.fn((raw: { id: string }) => ({ id: raw.id, mapped: true })),
}));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('fetchEventMovies', () => {
  it('appends participantId and maps each item', async () => {
    mockFetchApi.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);

    const res = await fetchEventMovies('soiree', 'p1');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies?participantId=p1');
    expect(res).toEqual([
      { id: 'm1', mapped: true },
      { id: 'm2', mapped: true },
    ]);
  });

  it('omits the query string when no participantId is given', async () => {
    mockFetchApi.mockResolvedValue([]);

    await fetchEventMovies('soiree');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies');
  });

  it('returns an empty array when the response is not an array', async () => {
    mockFetchApi.mockResolvedValue(null);

    expect(await fetchEventMovies('soiree')).toEqual([]);
  });
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
});

describe('movie mutations', () => {
  beforeEach(() => mockFetchApi.mockResolvedValue(undefined));

  it('addMovieToEvent posts the payload', async () => {
    const body = {
      tmdbId: 1,
      title: 'A',
      year: '2000',
      posterPath: null,
      participantId: 'p1',
    };

    await addMovieToEvent('soiree', body);

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });

  it('voteMovie posts participantId and value', async () => {
    await voteMovie('soiree', 'm1', 'p1', 1);

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/vote', {
      method: 'POST',
      body: JSON.stringify({ participantId: 'p1', value: 1 }),
    });
  });

  it('clearMovieVote deletes with the participantId query', async () => {
    await clearMovieVote('soiree', 'm1', 'p1');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/vote?participantId=p1', {
      method: 'DELETE',
    });
  });

  it('removeMovieFromEvent includes the host token when provided', async () => {
    await removeMovieFromEvent('soiree', 'm1', 'p1', 'HT');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1?host=HT', {
      method: 'DELETE',
      body: JSON.stringify({ participantId: 'p1' }),
    });
  });

  it('removeMovieFromEvent omits the host token when absent', async () => {
    await removeMovieFromEvent('soiree', 'm1', 'p1');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1', {
      method: 'DELETE',
      body: JSON.stringify({ participantId: 'p1' }),
    });
  });

  it('setMoviePitchNote puts the note', async () => {
    await setMoviePitchNote('soiree', 'm1', 'p1', 'top film');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/note', {
      method: 'PUT',
      body: JSON.stringify({ participantId: 'p1', pitchNote: 'top film' }),
    });
  });

  it('deleteMoviePitchNote deletes the note', async () => {
    await deleteMoviePitchNote('soiree', 'm1', 'p1');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/note', {
      method: 'DELETE',
      body: JSON.stringify({ participantId: 'p1' }),
    });
  });

  it('markMovieAsSeen posts, unmarkMovieAsSeen deletes', async () => {
    await markMovieAsSeen('soiree', 'm1', 'p1');
    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/seen', {
      method: 'POST',
      body: JSON.stringify({ participantId: 'p1' }),
    });

    await unmarkMovieAsSeen('soiree', 'm1', 'p1');
    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/seen', {
      method: 'DELETE',
      body: JSON.stringify({ participantId: 'p1' }),
    });
  });
});
