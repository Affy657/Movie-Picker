import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  checkHandleAvailability,
  fetchFollowers,
  fetchFollowing,
  fetchPublicProfile,
  fetchUserWatchlist,
  followUser,
  unfollowUser,
} from '@/features/profile/api/profileApi';
import { fetchUserStats } from '@/features/events/api/userStatsApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
  mockFetchApi.mockResolvedValue(undefined);
});

describe('profileApi', () => {
  it('fetchPublicProfile encodes the handle', async () => {
    const profile = { handle: 'a b' };
    mockFetchApi.mockResolvedValue(profile);

    await expect(fetchPublicProfile('a b')).resolves.toBe(profile);
    expect(mockFetchApi).toHaveBeenCalledWith('/users/a%20b');
  });

  it('checkHandleAvailability builds the query string', async () => {
    mockFetchApi.mockResolvedValue({ handle: 'bob', available: true, reason: null });

    await checkHandleAvailability('bob');

    expect(mockFetchApi).toHaveBeenCalledWith('/users/handle-available?handle=bob');
  });

  it('followUser posts to the follow endpoint', async () => {
    await followUser('bob');

    expect(mockFetchApi).toHaveBeenCalledWith('/users/bob/follow', { method: 'POST' });
  });

  it('unfollowUser deletes the follow relation', async () => {
    await unfollowUser('bob');

    expect(mockFetchApi).toHaveBeenCalledWith('/users/bob/follow', { method: 'DELETE' });
  });

  it('fetchFollowing and fetchFollowers hit the right endpoints', async () => {
    await fetchFollowing('bob');
    expect(mockFetchApi).toHaveBeenCalledWith('/users/bob/following');

    await fetchFollowers('bob');
    expect(mockFetchApi).toHaveBeenCalledWith('/users/bob/followers');
  });

  it('fetchUserWatchlist reads the public watchlist of a handle and fills missing genres', async () => {
    const controller = new AbortController();
    mockFetchApi.mockResolvedValue({
      items: [
        {
          tmdbId: 27205,
          mediaType: 'movie',
          title: 'Inception',
          year: '2010',
          posterPath: null,
          createdAt: '2026-06-01T00:00:00Z',
        },
      ],
      total: 1,
      hasMore: false,
    });

    const items = await fetchUserWatchlist('a b', 200, controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/users/a%20b/watchlist?skip=0&take=200', {
      signal: controller.signal,
    });
    expect(items).toEqual([expect.objectContaining({ title: 'Inception', genreIds: [] })]);
  });

  it('fetchUserWatchlist reads every page of a public watchlist longer than one page', async () => {
    const controller = new AbortController();
    const movie = (tmdbId: number) => ({
      tmdbId,
      mediaType: 'movie',
      title: `Film ${tmdbId}`,
      year: '2010',
      posterPath: null,
      createdAt: '2026-06-01T00:00:00Z',
    });
    mockFetchApi
      .mockResolvedValueOnce({ items: [movie(1), movie(2)], total: 3, hasMore: true })
      .mockResolvedValueOnce({ items: [movie(3)], total: 3, hasMore: false });

    const items = await fetchUserWatchlist('bob', 2, controller.signal);

    expect(items.map((item) => item.tmdbId)).toEqual([1, 2, 3]);
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/users/bob/watchlist?skip=2&take=2', {
      signal: controller.signal,
    });
  });

  it('fetchUserStats forwards the abort signal', async () => {
    const controller = new AbortController();
    mockFetchApi.mockResolvedValue({ eventsCreated: 0 });

    await fetchUserStats('bob', controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/users/bob/stats', { signal: controller.signal });
  });
});
