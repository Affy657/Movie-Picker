import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { setStoredParticipant } from '@/features/events/storage';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';

const slug = 'soiree-perf';

describe('useEventDetailPage', () => {
  const server = setupServer();
  const requested: Array<string> = [];

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    requested.length = 0;
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  function wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientWrapper>
        <MemoryRouter initialEntries={[`/e/${slug}`]}>{children}</MemoryRouter>
      </QueryClientWrapper>
    );
  }

  function serveEventNever(): void {
    server.use(
      http.get(`${TEST_API_V1}/events/slug/${slug}`, async () => {
        requested.push('event');
        await new Promise(() => undefined);
        return HttpResponse.json({});
      }),
      http.get(`${TEST_API_V1}/events/${slug}/movies`, ({ request }) => {
        requested.push(`movies:${new URL(request.url).searchParams.get('participantId') ?? ''}`);
        return HttpResponse.json([]);
      })
    );
  }

  it('demande la liste des films sans attendre la réponse de la soirée', async () => {
    serveEventNever();

    const { result } = renderHook(() => useEventDetailPage(slug), { wrapper });

    await waitFor(() => expect(result.current.moviesQuery.isSuccess).toBe(true));
    expect(result.current.event).toBeNull();
    expect(requested).toEqual(['event', 'movies:']);
  });

  it('part directement avec le participant mémorisé, sans second aller-retour', async () => {
    setStoredParticipant(slug, 'p-42', 'Alice');
    serveEventNever();

    const { result } = renderHook(() => useEventDetailPage(slug), { wrapper });

    await waitFor(() => expect(result.current.moviesQuery.isSuccess).toBe(true));
    expect(requested.filter((entry) => entry.startsWith('movies:'))).toEqual(['movies:p-42']);
  });
});
