import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { UseQueryResult } from '@tanstack/react-query';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { createWatchlistHandlers, TEST_API_V1 } from '@/mocks/handlers';
import EventDetailSession from '@/features/events/pages/event-detail/EventDetailSession';
import { WHEEL_SPIN_DURATION_MS } from '@/shared/utils/wheelSpin';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';

const wheelOverride = vi.hoisted(() => ({
  current: null as Partial<EventWheelState> | null,
}));

vi.mock('@/features/events/hooks/useEventWheel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/events/hooks/useEventWheel')>();
  return {
    ...actual,
    useEventWheel: (options: Parameters<typeof actual.useEventWheel>[0]) => ({
      ...actual.useEventWheel(options),
      ...wheelOverride.current,
    }),
  };
});

const MOVIE: MovieData = {
  id: 'm1',
  eventId: 'evt1',
  participantId: 'p2',
  tmdbId: 27205,
  title: 'Inception',
  year: '2010',
  posterPath: null,
  proposerPseudo: 'Bob',
  score: 0,
  up: 0,
  down: 0,
};

const EVENT: EventData = {
  id: 'evt1',
  title: 'Soirée',
  date: '2026-11-01',
  time: '21:00',
  slug: 'soiree',
  isFinished: false,
  isHost: false,
  myParticipant: { id: 'p1', pseudo: 'Alice' },
  participantCount: 2,
  participants: [
    { id: 'p1', pseudo: 'Alice' },
    { id: 'p2', pseudo: 'Bob', isCreator: true },
  ],
};

function wheelPickEndingIn(remainingMs: number) {
  return [
    {
      movieId: MOVIE.id,
      pickMethod: 'wheel' as const,
      pickedAt: new Date(Date.now() - WHEEL_SPIN_DURATION_MS + remainingMs).toISOString(),
    },
  ];
}

const server = setupServer();

function serveSignedInAlice() {
  server.use(
    http.get(`${TEST_API_V1}/auth/me`, () =>
      HttpResponse.json({
        userId: 'u1',
        displayName: 'Alice',
        emailMasked: 'a***@***',
        uiTheme: 'system',
        accentColor: 'default',
        ratingScale: 'five',
        avatarId: '',
        handle: 'alice',
        bio: null,
        isProfilePublic: true,
        isWatchlistPublic: true,
        letterboxdUsername: null,
        letterboxdLastSyncAt: null,
        letterboxdLastSyncError: null,
        letterboxdPendingReconciliationCount: 0,
        hasPassword: true,
        linkedProviders: [],
      })
    ),
    ...createWatchlistHandlers([])
  );
}

function SessionUnderTest({ event }: Readonly<{ event: EventData }>) {
  return (
    <EventDetailSession
      slug="soiree"
      hostToken={null}
      event={event}
      moviesQuery={
        {
          isPending: false,
          isError: false,
          isSuccess: true,
          error: null,
          data: [MOVIE],
          refetch: () => Promise.resolve() as never,
        } as unknown as UseQueryResult<MovieData[]>
      }
      movies={[MOVIE]}
      participant={{ participantId: 'p1', pseudo: 'Alice' }}
      setParticipant={() => undefined}
      actionError={null}
      setActionError={() => undefined}
      refreshAll={() => undefined}
    />
  );
}

function renderSession(event: EventData) {
  const client = createTestQueryClient();
  const ui = (current: EventData) => (
    <AppTestProviders client={client}>
      <MemoryRouter>
        <SessionUnderTest event={current} />
      </MemoryRouter>
    </AppTestProviders>
  );
  const view = render(ui(event));
  return { rerenderWith: (next: EventData) => view.rerender(ui(next)) };
}

function winnerCard() {
  return screen.queryByRole('heading', { level: 2, name: 'Inception' });
}

describe('EventDetailSession: the chosen movie and the wheel', () => {
  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('moviepicker-locale', 'fr');
    localStorage.setItem('movies-view', 'list');
    localStorage.setItem('mp.session-hint', '1');
    serveSignedInAlice();
  });
  afterEach(() => {
    wheelOverride.current = null;
    server.resetHandlers();
  });
  afterAll(() => server.close());

  it('keeps the movie out of the winner card until the wheel has stopped for the guests', async () => {
    const { rerenderWith } = renderSession({ ...EVENT, lifecycle: 'live' });
    rerenderWith({ ...EVENT, lifecycle: 'live', winners: wheelPickEndingIn(1000) });
    expect(winnerCard()).toBeNull();

    await waitFor(() => expect(winnerCard()).toBeInTheDocument(), { timeout: 5000 });
  });

  it('leaves the recap link out of the night while the only movie is still hidden', () => {
    renderSession({
      ...EVENT,
      isFinished: true,
      lifecycle: 'finished',
      recapSlug: 'recap-soiree',
      winners: wheelPickEndingIn(WHEEL_SPIN_DURATION_MS),
    });

    expect(winnerCard()).toBeNull();
    expect(screen.queryByRole('link', { name: /recap/i })).toBeNull();
  });

  it('holds the rating sheet back while the wheel of the host is still open', async () => {
    const finishedEvent: EventData = {
      ...EVENT,
      isHost: true,
      isFinished: true,
      lifecycle: 'finished',
      date: new Date().toISOString().slice(0, 10),
      winners: [{ movieId: MOVIE.id, pickMethod: 'manual', pickedAt: new Date().toISOString() }],
    };
    wheelOverride.current = { isModalOpen: true, winnerIds: [MOVIE.id] };
    const { rerenderWith } = renderSession(finishedEvent);
    expect(
      await screen.findByRole('button', { name: 'Donner la première note' })
    ).toBeInTheDocument();
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
    expect(screen.queryByRole('dialog', { name: 'Noter ce film' })).toBeNull();

    wheelOverride.current = { isModalOpen: false, winnerIds: [MOVIE.id] };
    rerenderWith({ ...finishedEvent });

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Noter ce film' })).toBeInTheDocument()
    );
  });
});
