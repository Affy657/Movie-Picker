import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, type InitialEntry } from 'react-router';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { createEventDetailHandlers, TEST_API_V1 } from '@/mocks/handlers';
import {
  getStoredHostToken,
  getStoredParticipant,
  setStoredParticipant,
} from '@/shared/utils/eventIdentityStorage';
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

  function wrapperAt(initialEntry: InitialEntry) {
    return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
      return (
        <QueryClientWrapper>
          <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
        </QueryClientWrapper>
      );
    };
  }

  const wrapper = wrapperAt(`/e/${slug}`);

  function renderPageWithLocation(initialEntry: InitialEntry) {
    return renderHook(() => ({ page: useEventDetailPage(slug), location: useLocation() }), {
      wrapper: wrapperAt(initialEntry),
    });
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

  it('requests the movie list without waiting for the movie night response', async () => {
    serveEventNever();

    const { result } = renderHook(() => useEventDetailPage(slug), { wrapper });

    await waitFor(() => expect(result.current.moviesQuery.isSuccess).toBe(true));
    expect(result.current.event).toBeNull();
    expect(requested).toEqual(['event', 'movies:']);
  });

  it('starts straight away with the remembered participant, without a second round trip', async () => {
    setStoredParticipant(slug, 'p-42', 'Alice');
    serveEventNever();

    const { result } = renderHook(() => useEventDetailPage(slug), { wrapper });

    await waitFor(() => expect(result.current.moviesQuery.isSuccess).toBe(true));
    expect(requested.filter((entry) => entry.startsWith('movies:'))).toEqual(['movies:p-42']);
  });

  it('forgets a remembered participant the movie night no longer lists', async () => {
    setStoredParticipant(slug, 'p-removed', 'Alice');
    server.use(...createEventDetailHandlers({ slug }));

    const { result } = renderHook(() => useEventDetailPage(slug), { wrapper });

    await waitFor(() => expect(result.current.event).not.toBeNull());
    await waitFor(() => expect(result.current.participant).toBeNull());
    expect(getStoredParticipant(slug)).toBeNull();
  });

  it('keeps a remembered participant the movie night still lists', async () => {
    setStoredParticipant(slug, 'p-msw-bob', 'Bob');
    server.use(...createEventDetailHandlers({ slug }));

    const { result } = renderHook(() => useEventDetailPage(slug), { wrapper });

    await waitFor(() => expect(result.current.event).not.toBeNull());
    expect(result.current.participant).toEqual({ participantId: 'p-msw-bob', pseudo: 'Bob' });
    expect(getStoredParticipant(slug)).toEqual({ participantId: 'p-msw-bob', pseudo: 'Bob' });
  });

  it('keeps the fragment and the navigation state when it moves a legacy host token into the session', async () => {
    serveEventNever();

    const { result } = renderPageWithLocation({
      pathname: `/e/${slug}`,
      search: '?host=legacy-host-token&tab=movies',
      hash: '#movies',
      state: { justCreated: true },
    });

    await waitFor(() => expect(result.current.location.search).toBe('?tab=movies'));
    expect(result.current.location.pathname).toBe(`/e/${slug}`);
    expect(result.current.location.hash).toBe('#movies');
    expect(result.current.location.state).toEqual({ justCreated: true });
    expect(getStoredHostToken(slug)).toBe('legacy-host-token');
    expect(result.current.page.hostToken).toBe('legacy-host-token');
  });

  it('leaves a legacy host token in the address bar when the session refuses to store it', async () => {
    serveEventNever();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });
    try {
      const { result } = renderPageWithLocation(`/e/${slug}?host=legacy-host-token&tab=movies`);

      await waitFor(() => expect(requested).toContain('event'));
      expect(result.current.location.search).toBe('?host=legacy-host-token&tab=movies');
      expect(result.current.page.hostToken).toBe('legacy-host-token');
    } finally {
      setItem.mockRestore();
    }
  });
});
