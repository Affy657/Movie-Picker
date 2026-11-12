import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  addMovieToEvent,
  clearMovieVote,
  deleteMovieRating,
  deleteMoviePitchNote,
  fetchEventMovies,
  fetchMovieDetails,
  fetchMovieNights,
  markMovieAsSeen,
  removeMovieFromEvent,
  searchMovies,
  setMovieRating,
  setMoviePitchNote,
  setMovieWheelExclusion,
  unmarkMovieAsSeen,
  voteMovie,
} from '@/features/movies/api/moviesApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));
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

    mockFetchApi.mockResolvedValue({ id: 'm-new' });

    const created = await addMovieToEvent('soiree', body);

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    expect(created).toEqual({ id: 'm-new', mapped: true });
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

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1', {
      method: 'DELETE',
      body: JSON.stringify({ participantId: 'p1' }),
      headers: { 'X-Host-Token': 'HT' },
    });
  });

  it('removeMovieFromEvent omits the host token when absent', async () => {
    await removeMovieFromEvent('soiree', 'm1', 'p1');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1', {
      method: 'DELETE',
      body: JSON.stringify({ participantId: 'p1' }),
    });
  });

  it('setMovieWheelExclusion puts the flag with the host token', async () => {
    await setMovieWheelExclusion('soiree', 'm1', true, 'HT');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/wheel-exclusion', {
      method: 'PUT',
      body: JSON.stringify({ excluded: true }),
      headers: { 'X-Host-Token': 'HT' },
    });
  });

  it('setMovieWheelExclusion omits the host token when absent', async () => {
    await setMovieWheelExclusion('soiree', 'm1', false);

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/wheel-exclusion', {
      method: 'PUT',
      body: JSON.stringify({ excluded: false }),
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

  it('setMovieRating puts the value, deleteMovieRating deletes it', async () => {
    mockFetchApi.mockResolvedValueOnce({ participantId: 'p1', value: 7, updatedAt: 'now' });

    const saved = await setMovieRating('soiree', 'm1', 'p1', 7);
    expect(saved.value).toBe(7);
    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/rating', {
      method: 'PUT',
      body: JSON.stringify({ participantId: 'p1', value: 7 }),
    });

    await deleteMovieRating('soiree', 'm1', 'p1');
    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1/rating', {
      method: 'DELETE',
      body: JSON.stringify({ participantId: 'p1' }),
    });
  });
});

describe('movie API paths', () => {
  const craftedSlug = 'Ab3dE_9xYz?x#y';
  const encodedSlug = 'Ab3dE_9xYz%3Fx%23y';

  function requestedPath(): string {
    const [path] = mockFetchApi.mock.calls[0] ?? [];
    return String(path);
  }

  it.each([
    ['fetchEventMovies', () => fetchEventMovies(craftedSlug), `/events/${encodedSlug}/movies`],
    [
      'addMovieToEvent',
      () =>
        addMovieToEvent(craftedSlug, {
          tmdbId: 1,
          title: 'T',
          year: '2000',
          posterPath: null,
          participantId: 'p1',
        }),
      `/events/${encodedSlug}/movies`,
    ],
    [
      'voteMovie',
      () => voteMovie(craftedSlug, 'm/1', 'p1', 1),
      `/events/${encodedSlug}/movies/m%2F1/vote`,
    ],
    [
      'clearMovieVote',
      () => clearMovieVote(craftedSlug, 'm/1', 'p1'),
      `/events/${encodedSlug}/movies/m%2F1/vote?participantId=p1`,
    ],
    [
      'removeMovieFromEvent',
      () => removeMovieFromEvent(craftedSlug, 'm/1', 'p1'),
      `/events/${encodedSlug}/movies/m%2F1`,
    ],
    [
      'setMovieWheelExclusion',
      () => setMovieWheelExclusion(craftedSlug, 'm/1', true),
      `/events/${encodedSlug}/movies/m%2F1/wheel-exclusion`,
    ],
    [
      'setMoviePitchNote',
      () => setMoviePitchNote(craftedSlug, 'm/1', 'p1', 'note'),
      `/events/${encodedSlug}/movies/m%2F1/note`,
    ],
    [
      'deleteMoviePitchNote',
      () => deleteMoviePitchNote(craftedSlug, 'm/1', 'p1'),
      `/events/${encodedSlug}/movies/m%2F1/note`,
    ],
    [
      'markMovieAsSeen',
      () => markMovieAsSeen(craftedSlug, 'm/1', 'p1'),
      `/events/${encodedSlug}/movies/m%2F1/seen`,
    ],
    [
      'unmarkMovieAsSeen',
      () => unmarkMovieAsSeen(craftedSlug, 'm/1', 'p1'),
      `/events/${encodedSlug}/movies/m%2F1/seen`,
    ],
  ])(
    '%s keeps crafted identifiers inside their own path segments',
    async (_name, call, expected) => {
      mockFetchApi.mockResolvedValue({ id: 'm1' });
      await call();

      expect(requestedPath()).toBe(expected);
    }
  );
});
