import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClientWrapper, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { useEvent } from '@/features/events/hooks/useEvent';
import { ApiError } from '@/shared/api/apiError';

const server = setupServer(
  http.get(`${TEST_API_V1}/events/slug/:slug`, ({ params }) =>
    HttpResponse.json({
      _id: 'e1',
      title: 'Hook test',
      date: '2030-01-01',
      time: '20:00',
      slug: params.slug,
      isHost: false,
      isFinished: false,
      winnerMovie: null,
      config: {
        theme: null,
        endDate: null,
        maxProposalsPerParticipant: null,
        wheelMode: 'strictRandom',
        allowedReactionIds: null,
      },
    })
  )
);

describe('useEvent', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('charge le détail événement pour un slug', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useEvent('hook-slug', null), {
      wrapper: ({ children }) => (
        <QueryClientWrapper client={client}>{children}</QueryClientWrapper>
      ),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('Hook test');
    expect(result.current.data?.slug).toBe('hook-slug');
    expect(result.current.data?.id).toBe('e1');
    expect(result.current.data?.isFinished).toBe(false);
  });

  it('passe en erreur sur un 404', async () => {
    server.use(
      http.get(`${TEST_API_V1}/events/slug/:slug`, () =>
        HttpResponse.json({ error: 'Soirée introuvable' }, { status: 404 })
      )
    );
    const client = createTestQueryClient();
    const { result } = renderHook(() => useEvent('unknown', null), {
      wrapper: ({ children }) => (
        <QueryClientWrapper client={client}>{children}</QueryClientWrapper>
      ),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(ApiError.is(result.current.error)).toBe(true);
  });

  it('passe en erreur sur un 500', async () => {
    server.use(
      http.get(`${TEST_API_V1}/events/slug/:slug`, () =>
        HttpResponse.json({ error: 'Erreur serveur' }, { status: 500 })
      )
    );
    const client = createTestQueryClient();
    const { result } = renderHook(() => useEvent('broken', null), {
      wrapper: ({ children }) => (
        <QueryClientWrapper client={client}>{children}</QueryClientWrapper>
      ),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(ApiError.is(result.current.error)).toBe(true);
  });

  it('ne lance pas de requête si slug est undefined', () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useEvent(undefined, null), {
      wrapper: ({ children }) => (
        <QueryClientWrapper client={client}>{children}</QueryClientWrapper>
      ),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
