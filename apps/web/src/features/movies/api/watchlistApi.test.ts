import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  addToWatchlist,
  completeWatchlistAvailability,
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

    expect(mockFetchApi).toHaveBeenCalledWith('/watchlist/availability?skip=0&take=500', {
      signal: controller.signal,
    });
    expect(res).toMatchObject({ items: [{ tmdbId: 1, watchProviders: [] }], partial: true });
  });

  it('reads the availability of the titles past the first 500 through the next pages', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({ tmdbId: index + 1 }));
    mockFetchApi
      .mockResolvedValueOnce({ items: firstPage, partial: false, hasMore: true })
      .mockResolvedValueOnce({ items: [{ tmdbId: 501 }], partial: false, hasMore: false });

    const res = await fetchWatchlistAvailability();

    expect(mockFetchApi).toHaveBeenNthCalledWith(
      2,
      '/watchlist/availability?skip=500&take=500',
      undefined
    );
    expect(res.items).toHaveLength(501);
    expect(res.items.at(-1)).toEqual({ tmdbId: 501 });
    expect(res.partial).toBe(false);
  });

  it('says the answer is partial when any page is', async () => {
    mockFetchApi
      .mockResolvedValueOnce({ items: [{ tmdbId: 1 }], partial: true, hasMore: true })
      .mockResolvedValueOnce({ items: [{ tmdbId: 2 }], partial: false, hasMore: false });

    expect((await fetchWatchlistAvailability()).partial).toBe(true);
  });

  it('remembers which page is still incomplete, and starts counting the retries from zero', async () => {
    mockFetchApi
      .mockResolvedValueOnce({ items: [{ tmdbId: 1 }], partial: false, hasMore: true })
      .mockResolvedValueOnce({ items: [{ tmdbId: 2 }], partial: true, hasMore: false });

    const res = await fetchWatchlistAvailability();

    expect(res.pages.map((page) => [page.skip, page.partial])).toEqual([
      [0, false],
      [1, true],
    ]);
    expect(res.completionAttempts).toBe(0);
  });

  it('reads an empty or malformed answer as complete and empty', async () => {
    mockFetchApi.mockResolvedValue({});
    expect(await fetchWatchlistAvailability()).toMatchObject({ items: [], partial: false });

    mockFetchApi.mockResolvedValue(null);
    expect(await fetchWatchlistAvailability()).toMatchObject({ items: [], partial: false });
    expect(mockFetchApi).toHaveBeenLastCalledWith(
      '/watchlist/availability?skip=0&take=500',
      undefined
    );
  });
});

describe('completeWatchlistAvailability', () => {
  it('reads again only the pages still incomplete, keeps the others and counts the retry', async () => {
    const controller = new AbortController();
    const previous = {
      items: [{ tmdbId: 1 }, { tmdbId: 501 }],
      partial: true,
      completionAttempts: 2,
      pages: [
        { skip: 0, items: [{ tmdbId: 1 }], partial: false },
        { skip: 500, items: [{ tmdbId: 501 }], partial: true },
      ],
    } as unknown as Parameters<typeof completeWatchlistAvailability>[0];
    mockFetchApi.mockResolvedValue({
      items: [{ tmdbId: 501 }, { tmdbId: 502 }],
      partial: false,
      hasMore: false,
    });

    const res = await completeWatchlistAvailability(previous, controller.signal);

    expect(mockFetchApi).toHaveBeenCalledExactlyOnceWith(
      '/watchlist/availability?skip=500&take=500',
      { signal: controller.signal }
    );
    expect(res.items.map((item) => item.tmdbId)).toEqual([1, 501, 502]);
    expect(res.partial).toBe(false);
    expect(res.completionAttempts).toBe(3);
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
