import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  addToWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
} from '@/features/watchlist/api/watchlistApi';

vi.mock('@/shared/api/client', () => ({ fetchApi: vi.fn() }));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('fetchWatchlist', () => {
  it('returns the items array from the response', async () => {
    mockFetchApi.mockResolvedValue({ items: [{ tmdbId: 1, title: 'Film' }] });

    const res = await fetchWatchlist();

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist', undefined);
    expect(res).toEqual([{ tmdbId: 1, title: 'Film' }]);
  });

  it('passes the abort signal when provided', async () => {
    mockFetchApi.mockResolvedValue({ items: [] });
    const controller = new AbortController();

    await fetchWatchlist(controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist', { signal: controller.signal });
  });

  it('returns an empty array when items is missing or not an array', async () => {
    mockFetchApi.mockResolvedValue({});
    expect(await fetchWatchlist()).toEqual([]);

    mockFetchApi.mockResolvedValue(null);
    expect(await fetchWatchlist()).toEqual([]);
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
