import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClientWrapper, createTestQueryClient } from '../test-utils/queryWrapper';
import { TEST_API_V1 } from '../mocks/handlers';
import { useEvent } from './useEvent';

const server = setupServer(
  http.get(`${TEST_API_V1}/events/slug/:slug`, ({ params }) =>
    HttpResponse.json({
      _id: 'e1',
      title: 'Hook test',
      date: '2030-01-01',
      time: '20:00',
      slug: params.slug,
      isHost: false,
      terminé: false,
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
  });
});
