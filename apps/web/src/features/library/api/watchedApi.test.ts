import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi } from '@/shared/api/client';
import {
  fetchMyWatchedMovies,
  fetchWatchedStatus,
  markWatched,
  setWatchedRating,
  unmarkWatched,
  WATCHED_MOVIES_TAKE,
} from '@/features/library/api/watchedApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

const elsewhere = {
  status: 'elsewhere',
  watchedAt: '2026-11-01T20:00:00Z',
  rating: 8,
  nightSlug: null,
  nightTitle: null,
};

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('fetchWatchedStatus', () => {
  it('asks how the account saw a title', async () => {
    mockFetchApi.mockResolvedValue(elsewhere);
    const controller = new AbortController();

    const status = await fetchWatchedStatus({ tmdbId: 438631, mediaType: 'tv' }, controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/watched/438631?mediaType=tv', {
      signal: controller.signal,
    });
    expect(status).toEqual(elsewhere);
  });

  it('reads missing fields as an unseen title', async () => {
    mockFetchApi.mockResolvedValue({});

    expect(await fetchWatchedStatus({ tmdbId: 1, mediaType: 'movie' })).toEqual({
      status: 'none',
      watchedAt: null,
      rating: null,
      nightSlug: null,
      nightTitle: null,
    });
  });
});

describe('markWatched', () => {
  it('posts the title seen elsewhere and returns its status', async () => {
    mockFetchApi.mockResolvedValue(elsewhere);
    const body = {
      tmdbId: 438631,
      mediaType: 'movie' as const,
      title: 'Dune',
      year: '2021',
      posterPath: '/dune.jpg',
    };

    const status = await markWatched(body);

    expect(mockFetchApi).toHaveBeenCalledWith('/watched', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    expect(status.status).toBe('elsewhere');
  });
});

describe('setWatchedRating', () => {
  it('puts the rating out of ten, or clears it', async () => {
    mockFetchApi.mockResolvedValue(elsewhere);

    await setWatchedRating({ tmdbId: 438631, mediaType: 'movie' }, 8);
    await setWatchedRating({ tmdbId: 438631, mediaType: 'movie' }, null);

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/watched/438631/rating?mediaType=movie', {
      method: 'PUT',
      body: JSON.stringify({ value: 8 }),
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/watched/438631/rating?mediaType=movie', {
      method: 'PUT',
      body: JSON.stringify({ value: null }),
    });
  });
});

describe('unmarkWatched', () => {
  it('deletes the title seen elsewhere', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await unmarkWatched({ tmdbId: 438631, mediaType: 'tv' });

    expect(mockFetchApi).toHaveBeenCalledWith('/watched/438631?mediaType=tv', {
      method: 'DELETE',
    });
  });
});

describe('fetchMyWatchedMovies', () => {
  it('reads every watched film of the account with where it was seen', async () => {
    mockFetchApi.mockResolvedValue({
      items: [
        {
          tmdbId: 1,
          mediaType: 'movie',
          title: 'Alien',
          year: '1979',
          posterPath: null,
          watchedAt: '2026-10-12T20:00:00Z',
          myRating: 9,
          source: 'night',
        },
      ],
      total: 1,
    });

    const result = await fetchMyWatchedMovies();

    expect(mockFetchApi).toHaveBeenCalledWith(
      `/users/me/watched-movies?take=${WATCHED_MOVIES_TAKE}`,
      { signal: undefined }
    );
    expect(WATCHED_MOVIES_TAKE).toBe(1000);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ title: 'Alien', source: 'night', genreIds: [] });
  });

  it('counts the items when the total is missing', async () => {
    mockFetchApi.mockResolvedValue({ items: null });

    expect(await fetchMyWatchedMovies()).toEqual({ items: [], total: 0 });
  });
});
