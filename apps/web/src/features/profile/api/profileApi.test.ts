import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  checkHandleAvailability,
  fetchFollowers,
  fetchFollowing,
  fetchPublicProfile,
  fetchUserMovies,
  fetchUserStats,
  followUser,
  unfollowUser,
} from '@/features/profile/api/profileApi';

vi.mock('@/shared/api/client', () => ({ fetchApi: vi.fn() }));

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

  it('fetchUserStats forwards the abort signal', async () => {
    const controller = new AbortController();
    mockFetchApi.mockResolvedValue({ eventsCreated: 0 });

    await fetchUserStats('bob', controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/users/bob/stats', { signal: controller.signal });
  });

  it('fetchUserMovies builds the query string and forwards the abort signal', async () => {
    const controller = new AbortController();
    mockFetchApi.mockResolvedValue({ items: [], totalCount: 0 });

    await fetchUserMovies('bob', 6, 12, controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/users/bob/movies?skip=6&take=12', {
      signal: controller.signal,
    });
  });
});
