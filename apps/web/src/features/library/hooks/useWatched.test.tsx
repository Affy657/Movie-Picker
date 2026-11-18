import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { LocaleProvider } from '@/shared/i18n';
import { createTestQueryClient, withQueryClient } from '@/test-utils/queryWrapper';
import { createWatchedHandlers, createWatchlistHandlers, TEST_API_V1 } from '@/mocks/handlers';
import { useWatchlist } from '@/features/movies/hooks/useWatchlist';
import { useWatchedKeys, useWatchedMovies, useWatchedTitle } from './useWatched';

const dune = {
  tmdbId: 438631,
  mediaType: 'movie' as const,
  title: 'Dune',
  year: '2021',
  posterPath: '/dune.jpg',
};

function wrapperFor() {
  const client = createTestQueryClient();
  return ({ children }: { children: ReactNode }) =>
    withQueryClient(<LocaleProvider>{children}</LocaleProvider>, client);
}

const SEEN_ELSEWHERE = {
  status: 'elsewhere',
  watchedAt: '2026-11-13T10:00:00Z',
  rating: null,
  nightSlug: null,
  nightTitle: null,
};

function never(): Promise<never> {
  return new Promise(() => undefined);
}

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function settle(): Promise<void> {
  return new Promise((done) => setTimeout(done, 50));
}

describe('watched hooks', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('reads every watched film of the account, wherever it was seen', async () => {
    server.use(
      ...createWatchedHandlers([
        { tmdbId: 1, title: 'Alien', source: 'night', myRating: 9 },
        { tmdbId: 2, title: 'Heat', source: 'elsewhere' },
      ])
    );

    const { result } = renderHook(() => useWatchedMovies(), { wrapper: wrapperFor() });

    await waitFor(() => expect(result.current.data?.total).toBe(2));
    expect(result.current.data?.items.map((item) => item.source)).toEqual(['night', 'elsewhere']);
  });

  it('marks a film seen elsewhere without waiting for the server', async () => {
    let posted = false;
    server.use(
      http.post(`${TEST_API_V1}/watched`, async () => {
        posted = true;
        await never();
      }),
      ...createWatchedHandlers()
    );
    const { result } = renderHook(() => useWatchedTitle(dune, true), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.status?.status).toBe('none'));

    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.status?.status).toBe('elsewhere'));
    await waitFor(() => expect(posted).toBe(true));
  });

  it('takes back a film seen elsewhere without waiting for the server', async () => {
    server.use(
      http.delete(`${TEST_API_V1}/watched/:tmdbId`, () => never()),
      ...createWatchedHandlers([{ ...dune, source: 'elsewhere', myRating: 8 }])
    );
    const { result } = renderHook(() => useWatchedTitle(dune, true), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.status?.status).toBe('elsewhere'));

    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.status?.status).toBe('none'));
  });

  it('refreshes À voir once the film is marked seen', async () => {
    let watchlistReads = 0;
    server.use(
      http.get(`${TEST_API_V1}/watchlist`, () => {
        watchlistReads += 1;
        return HttpResponse.json({ items: [] });
      }),
      ...createWatchedHandlers()
    );
    const { result } = renderHook(
      () => ({ watched: useWatchedTitle(dune, true), watchlist: useWatchlist() }),
      { wrapper: wrapperFor() }
    );
    await waitFor(() => expect(result.current.watchlist.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.watched.status?.status).toBe('none'));

    act(() => result.current.watched.toggle());

    await waitFor(() => expect(watchlistReads).toBe(2));
  });

  it('keeps the status the server returns for a mark, without reading it again', async () => {
    let statusReads = 0;
    const saved = { ...SEEN_ELSEWHERE, rating: 7 };
    server.use(
      http.get(`${TEST_API_V1}/watched/:tmdbId`, () => {
        statusReads += 1;
        return HttpResponse.json({ ...SEEN_ELSEWHERE, status: 'none', watchedAt: null });
      }),
      http.post(`${TEST_API_V1}/watched`, () => HttpResponse.json(saved)),
      ...createWatchedHandlers()
    );
    const { result } = renderHook(() => useWatchedTitle(dune, true), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.status?.status).toBe('none'));

    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.status).toEqual(saved));
    await settle();
    expect(result.current.status).toEqual(saved);
    expect(statusReads).toBe(1);
  });

  it('refreshes the watched films after a rating, but not À voir', async () => {
    let watchlistReads = 0;
    let watchedReads = 0;
    server.use(
      http.get(`${TEST_API_V1}/watchlist`, () => {
        watchlistReads += 1;
        return HttpResponse.json({ items: [] });
      }),
      http.get(`${TEST_API_V1}/users/me/watched-movies`, () => {
        watchedReads += 1;
        return HttpResponse.json({ items: [], total: 0 });
      }),
      ...createWatchedHandlers([{ ...dune, source: 'elsewhere' }])
    );
    const { result } = renderHook(
      () => ({
        watched: useWatchedTitle(dune, true),
        films: useWatchedMovies(),
        watchlist: useWatchlist(),
      }),
      { wrapper: wrapperFor() }
    );
    await waitFor(() => expect(result.current.watchlist.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.films.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.watched.status?.status).toBe('elsewhere'));

    act(() => result.current.watched.rate(7));

    await waitFor(() => expect(watchedReads).toBe(2));
    await settle();
    expect(watchlistReads).toBe(1);
    expect(result.current.watched.status?.rating).toBe(7);
  });

  it('rates a film seen elsewhere out of ten', async () => {
    server.use(
      ...createWatchedHandlers([{ ...dune, source: 'elsewhere' }]),
      ...createWatchlistHandlers([])
    );
    const { result } = renderHook(() => useWatchedTitle(dune, true), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.status?.status).toBe('elsewhere'));

    act(() => result.current.rate(7));

    await waitFor(() => expect(result.current.status?.rating).toBe(7));
  });

  it('puts the rating back and says why when the server refuses it', async () => {
    server.use(
      http.put(`${TEST_API_V1}/watched/:tmdbId/rating`, () =>
        HttpResponse.json(
          { code: 404, reason: 'watched_title_not_found', error: 'not found' },
          { status: 404 }
        )
      ),
      ...createWatchedHandlers([{ ...dune, source: 'elsewhere', myRating: 6 }]),
      ...createWatchlistHandlers([])
    );
    const { result } = renderHook(() => useWatchedTitle(dune, true), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.status?.rating).toBe(6));

    act(() => result.current.rate(9));

    await waitFor(() => expect(result.current.error).toBe('Ce film n’est pas dans vos films vus.'));
    expect(result.current.status?.rating).toBe(6);
  });

  it('takes back a film only once its mark has reached the server, on a double click', async () => {
    const calls: string[] = [];
    const markLanded = deferred();
    server.use(
      http.post(`${TEST_API_V1}/watched`, async () => {
        calls.push('mark');
        await markLanded.promise;
        return HttpResponse.json({ ...SEEN_ELSEWHERE });
      }),
      http.delete(`${TEST_API_V1}/watched/:tmdbId`, () => {
        calls.push('unmark');
        return new HttpResponse(null, { status: 204 });
      }),
      ...createWatchedHandlers()
    );
    const { result } = renderHook(() => useWatchedTitle(dune, true), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.status?.status).toBe('none'));

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status?.status).toBe('elsewhere'));
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status?.status).toBe('none'));
    await settle();

    expect(calls).toEqual(['mark']);
    markLanded.resolve();
    await waitFor(() => expect(calls).toEqual(['mark', 'unmark']));
  });

  it('sends a rating given right after the mark only once the mark has reached the server', async () => {
    const calls: string[] = [];
    const markLanded = deferred();
    server.use(
      http.post(`${TEST_API_V1}/watched`, async () => {
        calls.push('mark');
        await markLanded.promise;
        return HttpResponse.json({ ...SEEN_ELSEWHERE });
      }),
      http.put(`${TEST_API_V1}/watched/:tmdbId/rating`, () => {
        calls.push('rate');
        return HttpResponse.json({ ...SEEN_ELSEWHERE, rating: 8 });
      }),
      ...createWatchedHandlers()
    );
    const { result } = renderHook(() => useWatchedTitle(dune, true), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.status?.status).toBe('none'));

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status?.status).toBe('elsewhere'));
    act(() => result.current.rate(8));
    await waitFor(() => expect(result.current.status?.rating).toBe(8));
    await settle();

    expect(calls).toEqual(['mark']);
    markLanded.resolve();
    await waitFor(() => expect(calls).toEqual(['mark', 'rate']));
  });

  it('shows the film unseen again when the mark fails before its status could be read', async () => {
    const serverError = () =>
      HttpResponse.json({ code: 500, reason: 'internal_error', error: 'boom' }, { status: 500 });
    server.use(
      http.get(`${TEST_API_V1}/watched/:tmdbId`, serverError),
      http.post(`${TEST_API_V1}/watched`, serverError),
      ...createWatchedHandlers()
    );
    const { result } = renderHook(() => useWatchedTitle(dune, true), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.status).toBeUndefined();

    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.status?.status ?? 'none').toBe('none');
  });

  it('reads nothing while signed out', () => {
    const { result } = renderHook(() => useWatchedTitle(dune, false), {
      wrapper: wrapperFor(),
    });

    expect(result.current.status).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  it('tells which titles of a page are watched, by their id and their type', async () => {
    server.use(
      ...createWatchedHandlers([
        { tmdbId: 1, title: 'Alien', source: 'night' },
        { tmdbId: 2, mediaType: 'tv', title: 'Twin Peaks', source: 'elsewhere' },
      ])
    );

    const { result } = renderHook(() => useWatchedKeys(true), { wrapper: wrapperFor() });

    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.has({ tmdbId: 1, mediaType: 'movie' })).toBe(true);
    expect(result.current.has({ tmdbId: 2, mediaType: 'tv' })).toBe(true);
    expect(result.current.has({ tmdbId: 2, mediaType: 'movie' })).toBe(false);
    expect(
      result.current.countAmong([
        { tmdbId: 1, mediaType: 'movie' },
        { tmdbId: 3, mediaType: 'movie' },
      ])
    ).toBe(1);
  });

  it('knows no watched title while signed out', () => {
    const { result } = renderHook(() => useWatchedKeys(false), { wrapper: wrapperFor() });

    expect(result.current.ready).toBe(false);
    expect(result.current.has({ tmdbId: 1, mediaType: 'movie' })).toBe(false);
  });
});
