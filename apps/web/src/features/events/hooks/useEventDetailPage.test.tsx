import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, type InitialEntry } from 'react-router';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { QueryClientWrapper, createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { createEventDetailHandlers, TEST_API_V1 } from '@/mocks/handlers';
import {
  getStoredHostToken,
  getStoredParticipant,
  setStoredParticipant,
} from '@/shared/utils/eventIdentityStorage';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { onlineManager, type QueryClient } from '@tanstack/react-query';
import { FakeEventSource } from '@/test-utils/fakeEventSource';
import {
  queueVote,
  readLastEventSnapshot,
  readQueuedVotes,
  saveLastEventSnapshot,
} from '@/shared/utils/offlineEventStorage';
import type { EventData } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';

const slug = 'soiree-perf';

describe('useEventDetailPage', () => {
  const server = setupServer();
  const requested: Array<string> = [];

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
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

  it('marks my movie nights stale when it refreshes the movie night after a draw', async () => {
    serveEventNever();
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.myEvents.active, { pages: [], pageParams: [] });
    const { result } = renderHook(() => useEventDetailPage(slug), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <QueryClientWrapper client={client}>
          <MemoryRouter initialEntries={[`/e/${slug}`]}>{children}</MemoryRouter>
        </QueryClientWrapper>
      ),
    });

    act(() => result.current.refreshAll());

    expect(client.getQueryState(queryKeys.myEvents.active)?.isInvalidated).toBe(true);
  });

  it('marks the watched movies of the profiles stale, so a new rating shows there', async () => {
    serveEventNever();
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.profile.watchedMovies('me', 6), { items: [] });
    client.setQueryData(queryKeys.profile.watchedMovies('me', 500), { items: [] });
    const { result } = renderHook(() => useEventDetailPage(slug), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <QueryClientWrapper client={client}>
          <MemoryRouter initialEntries={[`/e/${slug}`]}>{children}</MemoryRouter>
        </QueryClientWrapper>
      ),
    });

    act(() => result.current.refreshAll());

    expect(client.getQueryState(queryKeys.profile.watchedMovies('me', 6))?.isInvalidated).toBe(
      true
    );
    expect(client.getQueryState(queryKeys.profile.watchedMovies('me', 500))?.isInvalidated).toBe(
      true
    );
  });

  it('marks my watched films stale, so Films vus and a film page show the new night rating', async () => {
    serveEventNever();
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.watched.movies, { items: [], total: 0 });
    client.setQueryData(queryKeys.watched.status(438631, 'movie'), { status: 'night' });
    client.setQueryData(queryKeys.me.watchedMovies(500), { items: [] });
    const { result } = renderHook(() => useEventDetailPage(slug), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <QueryClientWrapper client={client}>
          <MemoryRouter initialEntries={[`/e/${slug}`]}>{children}</MemoryRouter>
        </QueryClientWrapper>
      ),
    });

    act(() => result.current.refreshAll());

    expect(client.getQueryState(queryKeys.watched.movies)?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.watched.status(438631, 'movie'))?.isInvalidated).toBe(
      true
    );
    expect(client.getQueryState(queryKeys.me.watchedMovies(500))?.isInvalidated).toBe(true);
  });

  it('marks the nights of every film stale, so a film page shows the new seen mark', async () => {
    serveEventNever();
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.movies.nights(438631, 'movie'), { nights: [] });
    client.setQueryData(queryKeys.movies.nights(1399, 'tv'), { nights: [] });
    const { result } = renderHook(() => useEventDetailPage(slug), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <QueryClientWrapper client={client}>
          <MemoryRouter initialEntries={[`/e/${slug}`]}>{children}</MemoryRouter>
        </QueryClientWrapper>
      ),
    });

    act(() => result.current.refreshAll());

    expect(client.getQueryState(queryKeys.movies.nights(438631, 'movie'))?.isInvalidated).toBe(
      true
    );
    expect(client.getQueryState(queryKeys.movies.nights(1399, 'tv'))?.isInvalidated).toBe(true);
  });

  it('marks the recap of the night stale, so a new rating shows there', async () => {
    serveEventNever();
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.event.detail(slug, null), { slug, recapSlug: 'recap-perf' });
    client.setQueryData(queryKeys.event.recap('recap-perf'), { title: 'Soirée' });
    client.setQueryData(queryKeys.event.recap('recap-other'), { title: 'Autre soirée' });
    const { result } = renderHook(() => useEventDetailPage(slug), {
      wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
        <QueryClientWrapper client={client}>
          <MemoryRouter initialEntries={[`/e/${slug}`]}>{children}</MemoryRouter>
        </QueryClientWrapper>
      ),
    });

    act(() => result.current.refreshAll());

    expect(client.getQueryState(queryKeys.event.recap('recap-perf'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.event.recap('recap-other'))?.isInvalidated).toBe(false);
  });

  describe('live stream and offline copy', () => {
    beforeEach(() => {
      FakeEventSource.install();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      onlineManager.setOnline(true);
    });

    function renderWithClient(client: QueryClient) {
      return renderHook(() => useEventDetailPage(slug), {
        wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
          <QueryClientWrapper client={client}>
            <MemoryRouter initialEntries={[`/e/${slug}`]}>{children}</MemoryRouter>
          </QueryClientWrapper>
        ),
      });
    }

    function eventPollingInterval(client: QueryClient): unknown {
      const query = client.getQueryCache().find({ queryKey: queryKeys.event.detail(slug, null) });
      const interval = query?.observers[0]?.options.refetchInterval;
      return typeof interval === 'function' ? interval(query as never) : interval;
    }

    function serveCountedEvent(counts: { event: number; movies: number }): void {
      server.use(
        http.get(`${TEST_API_V1}/events/slug/${slug}`, () => {
          counts.event += 1;
          return HttpResponse.json({
            _id: 'evt-counted',
            title: 'Comptée',
            date: '2030-12-15',
            time: '21:00',
            slug,
            isFinished: false,
            lifecycle: 'live',
            winners: [],
            participants: [],
          });
        }),
        http.get(`${TEST_API_V1}/events/${slug}/movies`, () => {
          counts.movies += 1;
          return HttpResponse.json([]);
        })
      );
    }

    it('stops polling the movie night while the live stream is connected', async () => {
      server.use(...createEventDetailHandlers({ slug }));
      const client = createTestQueryClient();
      const { result } = renderWithClient(client);
      await waitFor(() => expect(result.current.event).not.toBeNull());
      expect(eventPollingInterval(client)).toBeGreaterThan(0);

      act(() => FakeEventSource.latest().emit('ready'));

      await waitFor(() => expect(result.current.liveConnected).toBe(true));
      expect(eventPollingInterval(client)).toBe(false);
    });

    it('reloads the movie night and its movies when the stream reports a change', async () => {
      const counts = { event: 0, movies: 0 };
      serveCountedEvent(counts);
      const { result } = renderWithClient(createTestQueryClient());
      await waitFor(() => expect(result.current.event).not.toBeNull());
      act(() => FakeEventSource.latest().emit('ready'));
      await waitFor(() => expect(result.current.liveConnected).toBe(true));
      await waitFor(() => expect(counts.event).toBe(2));
      await waitFor(() => expect(counts.movies).toBe(2));
      const before = { ...counts };

      act(() => FakeEventSource.latest().emit('changed', { stamp: '3.1' }));

      await waitFor(() => expect(counts.event).toBeGreaterThan(before.event));
      await waitFor(() => expect(counts.movies).toBeGreaterThan(before.movies));
    });

    it('exposes who is online on the movie night', async () => {
      server.use(...createEventDetailHandlers({ slug }));
      const { result } = renderWithClient(createTestQueryClient());
      await waitFor(() => expect(result.current.event).not.toBeNull());

      act(() =>
        FakeEventSource.latest().emit('presence', {
          participants: [{ participantId: 'p-msw-alice', proposing: true }],
        })
      );

      expect(result.current.livePresence).toEqual([
        { participantId: 'p-msw-alice', proposing: true },
      ]);
    });

    it('reopens the live stream once a guest joins, so the others see them online', async () => {
      server.use(...createEventDetailHandlers({ slug }));
      const { result } = renderWithClient(createTestQueryClient());
      await waitFor(() => expect(result.current.event).not.toBeNull());
      const opened = FakeEventSource.instances.length;

      act(() => result.current.setParticipant({ participantId: 'p-msw-chloe', pseudo: 'Chloé' }));

      expect(FakeEventSource.instances).toHaveLength(opened + 1);
    });

    it('sends a vote left waiting as soon as the live stream brings the server back', async () => {
      setStoredParticipant(slug, 'p-msw-bob', 'Bob');
      queueVote({ slug, movieId: 'm-1', participantId: 'p-msw-bob', value: 1, queuedAt: 1 });
      const network = { down: true, attempts: 0 };
      const sent: unknown[] = [];
      server.use(
        ...createEventDetailHandlers({ slug }),
        http.post(`${TEST_API_V1}/events/${slug}/movies/:movieId/vote`, async ({ request }) => {
          network.attempts += 1;
          if (network.down) return HttpResponse.error();
          sent.push(await request.json());
          return HttpResponse.json({ ok: true });
        })
      );
      const { result } = renderWithClient(createTestQueryClient());
      await waitFor(() => expect(result.current.moviesQuery.isSuccess).toBe(true));
      await waitFor(() => expect(network.attempts).toBeGreaterThan(0));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(readQueuedVotes(slug)).toHaveLength(1);

      network.down = false;
      act(() => FakeEventSource.latest().emit('ready'));

      await waitFor(() => expect(sent).toEqual([{ participantId: 'p-msw-bob', value: 1 }]), {
        timeout: 1_000,
      });
      expect(readQueuedVotes(slug)).toEqual([]);
    });

    it('keeps a copy of the last movie night viewed', async () => {
      server.use(...createEventDetailHandlers({ slug, title: 'Copie à garder' }));
      const { result } = renderWithClient(createTestQueryClient());

      await waitFor(() => expect(result.current.moviesQuery.isSuccess).toBe(true));
      await waitFor(() => expect(readLastEventSnapshot(slug)?.event.title).toBe('Copie à garder'));
      expect(readLastEventSnapshot(slug)?.movies).toEqual([]);
    });

    it('opens the saved copy when the network is down', async () => {
      saveLastEventSnapshot({
        slug,
        savedAt: Date.now() - 60_000,
        event: {
          id: 'evt-copy',
          slug,
          title: 'Copie hors ligne',
          date: '2030-12-15',
          time: '21:00',
        } as EventData,
        movies: [{ id: 'mov-copy', title: 'Alien', score: 1, myVote: 1 }] as MovieData[],
      });
      serveEventNever();
      onlineManager.setOnline(false);

      const { result } = renderWithClient(createTestQueryClient());

      expect(result.current.event?.title).toBe('Copie hors ligne');
      expect(result.current.movies.map((movie) => movie.id)).toEqual(['mov-copy']);
    });

    function saveCopy(savedAt: number): void {
      saveLastEventSnapshot({
        slug,
        savedAt,
        event: {
          id: 'evt-copy',
          slug,
          title: 'Copie hors ligne',
          date: '2030-12-15',
          time: '21:00',
        } as EventData,
        movies: [{ id: 'mov-copy', title: 'Alien', score: 1, myVote: 1 }] as MovieData[],
      });
    }

    function serveNetworkDown(): void {
      server.use(
        http.get(`${TEST_API_V1}/events/slug/${slug}`, () => HttpResponse.error()),
        http.get(`${TEST_API_V1}/events/${slug}/movies`, () => HttpResponse.error())
      );
    }

    it('opens the saved copy when the request never reaches the server, though the browser says online', async () => {
      const savedAt = Date.now() - 60_000;
      saveCopy(savedAt);
      serveNetworkDown();

      const { result } = renderWithClient(createTestQueryClient());

      await waitFor(() => expect(result.current.event?.title).toBe('Copie hors ligne'));
      await waitFor(() =>
        expect(result.current.movies.map((movie) => movie.id)).toEqual(['mov-copy'])
      );
      expect(result.current.showingOfflineCopy).toBe(true);
      expect(readLastEventSnapshot(slug)?.savedAt).toBe(savedAt);
    });

    it('leaves the saved copy once the server answers again', async () => {
      saveCopy(Date.now() - 60_000);
      serveNetworkDown();
      const { result } = renderWithClient(createTestQueryClient());
      await waitFor(() => expect(result.current.showingOfflineCopy).toBe(true));

      server.use(...createEventDetailHandlers({ slug, title: 'De retour' }));
      act(() => result.current.refreshAll());

      await waitFor(() => expect(result.current.event?.title).toBe('De retour'));
      expect(result.current.showingOfflineCopy).toBe(false);
      await waitFor(() => expect(readLastEventSnapshot(slug)?.event.title).toBe('De retour'));
    });

    it('shows the error when the request never reaches the server and no copy was saved', async () => {
      serveNetworkDown();

      const { result } = renderWithClient(createTestQueryClient());

      await waitFor(() => expect(result.current.eventQuery.isError).toBe(true));
      expect(result.current.event).toBeNull();
      expect(result.current.showingOfflineCopy).toBe(false);
    });

    it('forgets the saved copy of a movie night that no longer exists', async () => {
      saveLastEventSnapshot({
        slug,
        savedAt: Date.now() - 60_000,
        event: {
          id: 'evt-copy',
          slug,
          title: 'Copie',
          date: '2030-12-15',
          time: '21:00',
        } as EventData,
        movies: [],
      });
      server.use(
        http.get(`${TEST_API_V1}/events/slug/${slug}`, () =>
          HttpResponse.json({ error: 'gone' }, { status: 404 })
        ),
        http.get(`${TEST_API_V1}/events/${slug}/movies`, () => HttpResponse.json([]))
      );

      const { result } = renderWithClient(createTestQueryClient());

      await waitFor(() => expect(result.current.eventQuery.isError).toBe(true));
      expect(readLastEventSnapshot(slug)).toBeNull();
    });
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
