import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import { READ_ALL_PAGES_MAX } from '@/shared/api/readAllPages';
import {
  addToWatchlist,
  completeWatchlistAvailability,
  fetchWatchlist,
  fetchWatchlistAvailability,
  removeFromWatchlist,
  type WatchlistAvailability,
} from '@/features/movies/api/watchlistApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

function offer(tmdbId: number) {
  return {
    tmdbId,
    mediaType: 'movie' as const,
    watchProviders: [],
    tmdbWatchPageUrl: null,
    voteAverage: null,
    runtimeMinutes: null,
  };
}

function availabilityServerWithAColdCache(watchlistSize: number, fetchesPerRequest: number) {
  const resolved = new Set<number>();
  return (path: string) => {
    const query = new URL(path, 'https://api.test').searchParams;
    const skip = Number(query.get('skip'));
    const take = Number(query.get('take'));
    const count = Math.max(0, Math.min(take, watchlistSize - skip));
    const page = Array.from({ length: count }, (_, index) => skip + index + 1);
    page
      .filter((tmdbId) => !resolved.has(tmdbId))
      .slice(0, fetchesPerRequest)
      .forEach((tmdbId) => resolved.add(tmdbId));
    const items = page.filter((tmdbId) => resolved.has(tmdbId)).map(offer);
    return { items, partial: items.length < page.length, hasMore: skip + count < watchlistSize };
  };
}

function servedBy(server: (path: string) => unknown) {
  mockFetchApi.mockImplementation((path) => Promise.resolve(server(String(path)) as never));
}

async function pollUntilComplete(
  availability: WatchlistAvailability,
  attemptsLeft: number
): Promise<WatchlistAvailability> {
  if (!availability.partial || attemptsLeft === 0) return availability;
  return pollUntilComplete(await completeWatchlistAvailability(availability), attemptsLeft - 1);
}

function requestedSkips(): number[] {
  return mockFetchApi.mock.calls.map(([path]) =>
    Number(new URL(String(path), 'https://api.test').searchParams.get('skip'))
  );
}

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
      [500, true],
    ]);
    expect(res.completionAttempts).toBe(0);
  });

  it('asks the next page a page further, however few titles the previous one could resolve', async () => {
    servedBy(availabilityServerWithAColdCache(1500, 40));

    const res = await fetchWatchlistAvailability();

    expect(requestedSkips()).toEqual([0, 500, 1000]);
    expect(res.items).toHaveLength(120);
    expect(res.partial).toBe(true);
  });

  it('keeps reading past a page that resolved no title yet', async () => {
    mockFetchApi
      .mockResolvedValueOnce({ items: [], partial: true, hasMore: true })
      .mockResolvedValueOnce({ items: [offer(501)], partial: false, hasMore: false });

    const res = await fetchWatchlistAvailability();

    expect(requestedSkips()).toEqual([0, 500]);
    expect(res.items).toEqual([offer(501)]);
    expect(res.partial).toBe(true);
  });

  it('reads the availability of every title of a 1500-title watchlist on a cold cache', async () => {
    servedBy(availabilityServerWithAColdCache(1500, 40));

    const res = await pollUntilComplete(await fetchWatchlistAvailability(), 60);

    expect(res.partial).toBe(false);
    expect(new Set(res.items.map((item) => item.tmdbId)).size).toBe(1500);
    expect(res.items).toHaveLength(1500);
  });

  it('says the answer is partial while pages remain past the request budget', async () => {
    mockFetchApi.mockResolvedValue({ items: [offer(1)], partial: false, hasMore: true });

    const res = await fetchWatchlistAvailability();

    expect(mockFetchApi).toHaveBeenCalledTimes(READ_ALL_PAGES_MAX);
    expect(requestedSkips().at(-1)).toBe((READ_ALL_PAGES_MAX - 1) * 500);
    expect(res.partial).toBe(true);
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
        { skip: 0, items: [{ tmdbId: 1 }], partial: false, hasMore: true },
        { skip: 500, items: [{ tmdbId: 501 }], partial: true, hasMore: false },
      ],
    } as unknown as WatchlistAvailability;
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

  it('goes on reading the pages past the last one read while the API says more remain', async () => {
    const previous = {
      items: [offer(1)],
      partial: true,
      completionAttempts: 0,
      pages: [{ skip: 0, items: [offer(1)], partial: false, hasMore: true }],
    } satisfies WatchlistAvailability;
    mockFetchApi.mockResolvedValueOnce({ items: [offer(501)], partial: false, hasMore: false });

    const res = await completeWatchlistAvailability(previous);

    expect(requestedSkips()).toEqual([500]);
    expect(res.items.map((item) => item.tmdbId)).toEqual([1, 501]);
    expect(res.partial).toBe(false);
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
