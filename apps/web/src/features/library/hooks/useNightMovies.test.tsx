import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createAppQueryClient } from '@/app/appQueryClient';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { invalidateWatched } from '@/features/movies/hooks/invalidateWatched';
import { apiJson } from '@/mocks/apiJson';
import { TEST_API_V1 } from '@/mocks/handlers';
import { useNightMovies } from './useNightMovies';

describe('useNightMovies', () => {
  const server = setupServer();
  let calls = 0;

  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    calls = 0;
  });
  afterAll(() => server.close());

  async function loaded(): Promise<QueryClient> {
    server.use(
      http.get(`${TEST_API_V1}/users/me/night-movies`, () => {
        calls += 1;
        return apiJson<'MyNightMoviesResponse'>({ items: [] });
      })
    );
    const client = createAppQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useNightMovies(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    return client;
  }

  it('reloads once my nights change, a film proposed or a night joined', async () => {
    const client = await loaded();

    await client.invalidateQueries({ queryKey: queryKeys.myEvents.list });

    await waitFor(() => expect(calls).toBe(2));
  });

  it('reloads once a film is marked watched, for Griser les vus', async () => {
    const client = await loaded();

    await invalidateWatched(client);

    await waitFor(() => expect(calls).toBe(2));
  });
});
