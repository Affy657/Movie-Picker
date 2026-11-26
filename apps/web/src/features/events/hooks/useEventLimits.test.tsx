import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { QueryClientWrapper, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { loadEventLimits, useEventLimits } from '@/features/events/hooks/useEventLimits';

let served = 0;
const server = setupServer(
  http.get(`${TEST_API_V1}/events/limits`, () => {
    served += 1;
    return apiJson<'EventLimitsResponse'>({ maxParticipants: 50, maxProposalsPerParticipant: 15 });
  })
);

describe('useEventLimits', () => {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    served = 0;
  });
  afterAll(() => server.close());

  it('serves the caps the API enforces, asked once for every form of the session', async () => {
    const client = createTestQueryClient();
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <QueryClientWrapper client={client}>{children}</QueryClientWrapper>
    );

    const first = renderHook(() => useEventLimits(), { wrapper });
    expect(first.result.current).toBeNull();
    await waitFor(() =>
      expect(first.result.current).toEqual({ maxParticipants: 50, maxProposalsPerParticipant: 15 })
    );
    const second = renderHook(() => useEventLimits(), { wrapper });

    expect(second.result.current).toEqual({ maxParticipants: 50, maxProposalsPerParticipant: 15 });
    expect(served).toBe(1);
  });

  it('loads the caps on demand, or leaves them unknown when the API does not answer', async () => {
    expect(await loadEventLimits(createTestQueryClient())).toEqual({
      maxParticipants: 50,
      maxProposalsPerParticipant: 15,
    });

    server.use(
      http.get(`${TEST_API_V1}/events/limits`, () => apiErrorJson(503, 'service_unavailable'))
    );
    expect(await loadEventLimits(createTestQueryClient())).toBeNull();
  });
});
