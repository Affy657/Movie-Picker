import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  addToWatchlist,
  fetchWatchlist,
  fetchWatchlistAvailability,
  removeFromWatchlist,
} from '@/features/movies/api/watchlistApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('fetchWatchlist', () => {
  it('returns the items array from the response', async () => {
    mockFetchApi.mockResolvedValue({ items: [{ tmdbId: 1, title: 'Film' }] });

    const res = await fetchWatchlist();

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist?skip=0&take=500', undefined);
    expect(res).toEqual([{ tmdbId: 1, title: 'Film' }]);
  });

  it('passes the abort signal when provided', async () => {
    mockFetchApi.mockResolvedValue({ items: [] });
    const controller = new AbortController();

    await fetchWatchlist(controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist?skip=0&take=500', {
      signal: controller.signal,
    });
  });

  it('reads every page while the API says more items remain', async () => {
    mockFetchApi
      .mockResolvedValueOnce({ items: [{ tmdbId: 1 }, { tmdbId: 2 }], total: 3, hasMore: true })
      .mockResolvedValueOnce({ items: [{ tmdbId: 3 }], total: 3, hasMore: false });

    const res = await fetchWatchlist();

    expect(res.map((item) => item.tmdbId)).toEqual([1, 2, 3]);
    expect(mockFetchApi).toHaveBeenCalledTimes(2);
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/watchlist?skip=2&take=500', undefined);
  });

  it('stops reading pages when one comes back empty', async () => {
    mockFetchApi.mockResolvedValue({ items: [], total: 10, hasMore: true });

    expect(await fetchWatchlist()).toEqual([]);
    expect(mockFetchApi).toHaveBeenCalledTimes(1);
  });

  it('keeps the number of requests bounded', async () => {
    mockFetchApi.mockResolvedValue({ items: [{ tmdbId: 1 }], total: 1_000_000, hasMore: true });

    await fetchWatchlist();

    expect(mockFetchApi.mock.calls.length).toBeGreaterThan(1);
    expect(mockFetchApi.mock.calls.length).toBeLessThanOrEqual(20);
  });

  it('returns an empty array when items is missing or not an array', async () => {
    mockFetchApi.mockResolvedValue({});
    expect(await fetchWatchlist()).toEqual([]);

    mockFetchApi.mockResolvedValue(null);
    expect(await fetchWatchlist()).toEqual([]);
  });
});

describe('fetchWatchlistAvailability', () => {
  it('returns the items and whether the answer is partial, passing the abort signal', async () => {
    mockFetchApi.mockResolvedValue({ items: [{ tmdbId: 1, watchProviders: [] }], partial: true });
    const controller = new AbortController();

    const res = await fetchWatchlistAvailability(controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist/availability', {
      signal: controller.signal,
    });
    expect(res).toEqual({ items: [{ tmdbId: 1, watchProviders: [] }], partial: true });
  });

  it('reads an empty or malformed answer as complete and empty', async () => {
    mockFetchApi.mockResolvedValue({});
    expect(await fetchWatchlistAvailability()).toEqual({ items: [], partial: false });

    mockFetchApi.mockResolvedValue(null);
    expect(await fetchWatchlistAvailability()).toEqual({ items: [], partial: false });
    expect(mockFetchApi).toHaveBeenLastCalledWith('/watchlist/availability', undefined);
  });
});

describe('addToWatchlist', () => {
  it('POSTs the body as JSON', async () => {
    mockFetchApi.mockResolvedValue(undefined);
    const body = {
      tmdbId: 42,
      mediaType: 'movie' as const,
      title: 'Film',
      year: '2024',
      posterPath: null,
      voteAverage: 7.5,
      runtimeMinutes: 120,
    };

    await addToWatchlist(body);

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });
});

describe('removeFromWatchlist', () => {
  it('DELETEs with the given tmdbId and mediaType', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await removeFromWatchlist(42, 'tv');

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist/42?mediaType=tv', { method: 'DELETE' });
  });

  it('defaults mediaType to movie', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await removeFromWatchlist(42);

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist/42?mediaType=movie', {
      method: 'DELETE',
    });
  });
});
