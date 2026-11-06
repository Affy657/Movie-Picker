import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import type { MovieSearchFilters } from '@/features/movies/api/moviesApi';
import { useMovieSearch } from '@/features/movies/hooks/useMovieSearch';

const NO_FILTERS: MovieSearchFilters = {};

const ONE_RESULT = {
  items: [{ id: 100, title: 'Film Test', year: '2024', posterPath: null, voteAverage: 7.5 }],
  watchProvidersRegion: 'FR',
  disclaimer: '',
  tmdbAttributionUrl: 'https://www.themoviedb.org/',
};

const server = setupServer();

type Props = {
  term: string;
  filters?: MovieSearchFilters;
  hasApiFilters?: boolean;
  lang?: string;
  immediate?: boolean;
  onSearched?: (term: string) => void;
};

function renderSearch(initialProps: Props) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: () => true, retryDelay: 1 } },
  });
  return renderHook(
    ({ term, filters, hasApiFilters, lang, immediate, onSearched }: Props) =>
      useMovieSearch({
        term,
        filters: filters ?? NO_FILTERS,
        hasApiFilters: hasApiFilters ?? false,
        lang: lang ?? 'fr-FR',
        includeSeries: false,
        takeImmediate: () => immediate ?? false,
        onSearched: onSearched ?? (() => undefined),
      }),
    {
      initialProps,
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <QueryClientWrapper client={client}>{children}</QueryClientWrapper>
      ),
    }
  );
}

function serveResults(seen: string[] = []) {
  server.use(
    http.get(`${TEST_API_V1}/movies/search`, ({ request }) => {
      seen.push(new URL(request.url).searchParams.get('q') ?? '');
      return HttpResponse.json(ONE_RESULT);
    })
  );
  return seen;
}

describe('useMovieSearch', () => {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.useRealTimers();
    onlineManager.setOnline(true);
  });
  afterAll(() => server.close());

  it('waits for the typing to settle and sends a single request', async () => {
    const seen = serveResults();
    const { result, rerender } = renderSearch({ term: 'du' });

    rerender({ term: 'dun' });
    rerender({ term: 'dune' });

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(seen).toEqual(['dune']);
  });

  it('sends nothing under the minimum length', async () => {
    const seen = serveResults();
    const { result } = renderSearch({ term: 'd' });

    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(seen).toEqual([]);
    expect(result.current.searching).toBe(false);
  });

  it('searches on the filters alone when the field is empty', async () => {
    const seen = serveResults();
    const { result } = renderSearch({ term: '', filters: { genreIds: [28] }, hasApiFilters: true });

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(seen).toEqual(['']);
  });

  it('skips the wait when the change asks for an immediate search', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: false });
    const seen: string[] = [];
    serveResults(seen);

    const { result } = renderSearch({ term: 'dune', immediate: true });

    expect(result.current.searching).toBe(true);
    vi.useRealTimers();
    await waitFor(() => expect(seen).toEqual(['dune']));
  });

  it('cancels the request on its way as soon as the term changes, and clears the results', async () => {
    const aborted: boolean[] = [];
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('q') === 'ab') {
          await new Promise((resolve) => {
            request.signal.addEventListener('abort', resolve);
          });
          aborted.push(request.signal.aborted);
        }
        return HttpResponse.json(ONE_RESULT);
      })
    );
    const { result, rerender } = renderSearch({ term: 'ab' });
    await waitFor(() => expect(result.current.searching).toBe(true));

    rerender({ term: 'abc' });

    await waitFor(() => expect(aborted).toEqual([true]));
    await waitFor(() => expect(result.current.results).toHaveLength(1));
  });

  it('hides the previous results while the term changes', async () => {
    serveResults();
    const { result, rerender } = renderSearch({ term: 'dune' });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    rerender({ term: 'alien' });

    expect(result.current.results).toEqual([]);
  });

  it('keeps the results on screen while a language change searches again', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('lang') === 'en-US') await delay(200);
        return HttpResponse.json(ONE_RESULT);
      })
    );
    const { result, rerender } = renderSearch({ term: 'dune', lang: 'fr-FR' });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    rerender({ term: 'dune', lang: 'en-US' });

    expect(result.current.results).toHaveLength(1);
    await waitFor(() => expect(result.current.searching).toBe(true));
    expect(result.current.results).toHaveLength(1);
    await waitFor(() => expect(result.current.searching).toBe(false));
  });

  it('reports a failure once, without retrying behind the back of the reader', async () => {
    let attempts = 0;
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () => {
        attempts += 1;
        return HttpResponse.json({ error: 'down' }, { status: 503 });
      })
    );
    const { result } = renderSearch({ term: 'dune' });

    await waitFor(() => expect(result.current.failure).not.toBeNull());

    expect(attempts).toBe(1);
    expect(result.current.results).toEqual([]);
  });

  it('fails right away offline instead of parking the request', async () => {
    onlineManager.setOnline(false);
    server.use(http.get(`${TEST_API_V1}/movies/search`, () => HttpResponse.error()));
    const { result } = renderSearch({ term: 'dune' });

    await waitFor(() => expect(result.current.failure).not.toBeNull());
  });

  it('forgets the failure when the search runs again, then keeps the fresh results', async () => {
    let attempts = 0;
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, async () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.json({ error: 'down' }, { status: 503 });
        await delay(200);
        return HttpResponse.json(ONE_RESULT);
      })
    );
    const { result } = renderSearch({ term: 'dune' });
    await waitFor(() => expect(result.current.failure).not.toBeNull());

    act(() => result.current.searchNow());

    await waitFor(() => expect(result.current.searching).toBe(true));
    expect(result.current.failure).toBeNull();
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(attempts).toBe(2);
  });

  it('runs a finished search again on demand, even for the same term', async () => {
    const seen = serveResults();
    const { result } = renderSearch({ term: 'dune' });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    act(() => result.current.searchNow());

    await waitFor(() => expect(seen).toEqual(['dune', 'dune']));
  });

  it('names the search that came back empty', async () => {
    server.use(
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({ ...ONE_RESULT, items: [] })
      )
    );
    const { result } = renderSearch({ term: 'dune' });

    await waitFor(() => expect(result.current.emptySearchKey).toBe(result.current.searchKey));
  });

  it('reports each answered term, and never a search on filters alone', async () => {
    serveResults();
    const onSearched = vi.fn();
    const { result, rerender } = renderSearch({ term: 'dune', onSearched });
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(onSearched).toHaveBeenCalledExactlyOnceWith('dune');

    rerender({ term: '', filters: { genreIds: [28] }, hasApiFilters: true, onSearched });

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(onSearched).toHaveBeenCalledOnce();
  });

  it('forgets everything on reset', async () => {
    serveResults();
    const { result } = renderSearch({ term: 'dune' });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    act(() => result.current.reset());

    expect(result.current.results).toEqual([]);
    expect(result.current.meta).toBeNull();
  });
});
