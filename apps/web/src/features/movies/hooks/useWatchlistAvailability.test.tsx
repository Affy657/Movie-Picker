import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { apiJson } from '@/mocks/apiJson';
import { TEST_API_V1 } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { createTestQueryClient, withQueryClient } from '@/test-utils/queryWrapper';
import { availabilityRetryDelay, useWatchlistAvailability } from './useWatchlist';

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

const FIRST_PAGE = Array.from({ length: 500 }, (_, index) => offer(index + 1));

describe('useWatchlistAvailability', () => {
  const requestedSkips: number[] = [];
  let secondPageReads = 0;
  const server = setupServer(
    http.get(`${TEST_API_V1}/watchlist/availability`, ({ request }) => {
      const skip = Number(new URL(request.url).searchParams.get('skip'));
      requestedSkips.push(skip);
      if (skip === 0) {
        return apiJson<'WatchlistAvailabilityResponse'>({
          items: FIRST_PAGE,
          partial: false,
          hasMore: true,
        });
      }
      secondPageReads += 1;
      return apiJson<'WatchlistAvailabilityResponse'>({
        items: [offer(501)],
        partial: secondPageReads === 1,
        hasMore: false,
      });
    })
  );

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    requestedSkips.length = 0;
    secondPageReads = 0;
  });
  afterAll(() => server.close());

  function setup() {
    const client = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      withQueryClient(<>{children}</>, client);
    return { client, ...renderHook(() => useWatchlistAvailability(), { wrapper }) };
  }

  it('asks again only for the page that came back incomplete', async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.data?.partial).toBe(true));
    await waitFor(() => expect(result.current.data?.partial).toBe(false), { timeout: 5000 });

    expect(requestedSkips).toEqual([0, 500, 500]);
    expect(result.current.data?.items).toHaveLength(501);
  });

  it('reads every page again once the watchlist changed', async () => {
    const { result, client } = setup();
    await waitFor(() => expect(result.current.data?.partial).toBe(true));

    await act(() => client.invalidateQueries({ queryKey: queryKeys.watchlist.availability }));

    expect(requestedSkips).toEqual([0, 500, 0, 500]);
  });
});

describe('availabilityRetryDelay', () => {
  it('backs off from two seconds up to thirty', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(availabilityRetryDelay)).toEqual([
      2000, 4000, 8000, 16_000, 30_000, 30_000, 30_000,
    ]);
  });

  it('keeps three incomplete pages well under the 120 watchlist reads a minute', () => {
    let elapsed = 0;
    let retries = 0;
    while (elapsed + availabilityRetryDelay(retries) <= 60_000) {
      elapsed += availabilityRetryDelay(retries);
      retries += 1;
    }

    expect(retries * 3).toBeLessThanOrEqual(15);
  });
});
