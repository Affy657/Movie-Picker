import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  addMovieToEvent,
  clearMovieVote,
  deleteMovieRating,
  deleteMoviePitchNote,
  fetchEventMovies,
  markMovieAsSeen,
  removeMovieFromEvent,
  setMovieRating,
  setMoviePitchNote,
  setMovieWheelExclusion,
  unmarkMovieAsSeen,
  voteMovie,
} from '@/features/events/api/eventMoviesApi';

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

  it('removeMovieFromEvent deletes with the participant in the body and no host header', async () => {
    await removeMovieFromEvent('soiree', 'm1', 'p1');

    expect(mockFetchApi).toHaveBeenCalledWith('/events/soiree/movies/m1', {
      method: 'DELETE',
      body: JSON.stringify({ participantId: 'p1' }),
    });
  });

  it('setMovieWheelExclusion puts the flag with no host header', async () => {
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
