import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiJson } from '@/mocks/apiJson';
import { TEST_API_V1 } from '@/mocks/handlers';
import { createAppQueryClient } from '@/app/appQueryClient';
import { useMyProposedMovies } from './useMyProposedMovies';

describe('useMyProposedMovies', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('reads the proposals again each time a page opens, so a film proposed meanwhile shows up', async () => {
    let proposals = 1;
    server.use(
      http.get(`${TEST_API_V1}/users/me/proposed-movies`, () =>
        apiJson<'UserProposedMoviesResponse'>({
          items: Array.from({ length: proposals }, (_, index) => ({
            tmdbId: index + 1,
            title: `Film ${index + 1}`,
            year: '2020',
            posterPath: null,
            voteAverage: null,
            runtimeMinutes: null,
            genreIds: [],
            mediaType: 'movie',
            lastProposedAt: '2026-11-01T00:00:00Z',
            proposalCount: 1,
          })),
        })
      )
    );
    const client = createAppQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useMyProposedMovies(false), { wrapper });
    await waitFor(() => expect(first.result.current.data).toHaveLength(1));
    first.unmount();
    proposals = 2;
    const second = renderHook(() => useMyProposedMovies(false), { wrapper });

    await waitFor(() => expect(second.result.current.data).toHaveLength(2));
  });
});
