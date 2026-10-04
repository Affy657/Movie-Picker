import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import {
  useFriendsWatchedRow,
  useRecommendationSeed,
  useWatchlistRow,
} from '@/app/pages/home/usePersonalRows';

const matrix = {
  tmdbId: 603,
  mediaType: 'movie',
  title: 'Matrix',
  year: '1999',
  posterPath: null,
  genreIds: [],
  createdAt: '2026-01-01T00:00:00Z',
  watchedAt: '2026-01-02T00:00:00Z',
};

function freshWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('home personal rows once the account is gone', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/watchlist`, () =>
      HttpResponse.json({ items: [matrix], total: 1, hasMore: false })
    ),
    http.get(`${TEST_API_V1}/users/me/following-watched-movies`, () =>
      HttpResponse.json({ items: [matrix] })
    ),
    http.get(`${TEST_API_V1}/users/me/watched-movies`, () => HttpResponse.json({ items: [matrix] }))
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('drops the cached watchlist movies when the row is disabled', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useWatchlistRow(enabled), {
      initialProps: { enabled: true },
      wrapper: freshWrapper(),
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    rerender({ enabled: false });

    expect(result.current.items).toEqual([]);
  });

  it('drops the cached friends movies when the row is disabled', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useFriendsWatchedRow(enabled), {
      initialProps: { enabled: true },
      wrapper: freshWrapper(),
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    rerender({ enabled: false });

    expect(result.current.items).toEqual([]);
  });

  it('drops the cached recommendation seed when it is disabled', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useRecommendationSeed(enabled), {
      initialProps: { enabled: true },
      wrapper: freshWrapper(),
    });
    await waitFor(() => expect(result.current.seedTmdbId).toBe(603));
    expect(result.current.seedMediaType).toBe('movie');

    rerender({ enabled: false });

    expect(result.current.seedTmdbId).toBeUndefined();
    expect(result.current.seedTitle).toBeUndefined();
  });
});
