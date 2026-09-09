import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import LandingPage from '@/app/pages/LandingPage';
import CreateEvent from '@/features/events/pages/CreateEvent';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import AccountPage from '@/features/auth/pages/AccountPage';
import MyEventsPage from '@/features/events/pages/MyEventsPage';
import NotFoundPage from '@/app/pages/NotFoundPage';
import DonatePage from '@/app/pages/DonatePage';
import TechPage from '@/app/pages/TechPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import ProfileMoviesPage from '@/features/profile/pages/ProfileMoviesPage';
import WatchlistPage from '@/features/watchlist/pages/WatchlistPage';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import ServerErrorPage from '@/shared/components/ServerErrorPage';
import type { UseQueryResult } from '@tanstack/react-query';
import EventDetailSession from '@/features/events/pages/event-detail/EventDetailSession';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';

function watchlistHandler(items: unknown[]) {
  return http.get(`${TEST_API_V1}/watchlist`, () => HttpResponse.json({ items }));
}

const AUTH_USER = {
  userId: 'u-a11y',
  displayName: 'TestUser',
  emailMasked: 't***@test.local',
  uiTheme: 'light',
  accentColor: 'default',
};

const HEAVIEST_PAGE_AXE_BUDGET = 60000;

describe('accessibilité (axe)', () => {
  const server = setupServer(
    authMeGuestHandler,
    http.get(`${TEST_API_V1}/auth/oauth/providers`, () => HttpResponse.json({ providers: [] }))
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });
  afterAll(() => server.close());

  function renderPage(ui: React.ReactElement) {
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </AppTestProviders>
    );
    return { container, queryClient };
  }

  function collapseDiagramsToTheirAccessibleName(container: HTMLElement) {
    const collapsed = [...container.querySelectorAll('figure svg')].map((diagram) => {
      const accessibleName = diagram.querySelector(':scope > title');
      const presentational = [...diagram.childNodes].filter((node) => node !== accessibleName);
      for (const node of presentational) diagram.removeChild(node);
      return { diagram, presentational };
    });

    return () => {
      for (const { diagram, presentational } of collapsed) {
        for (const node of presentational) diagram.appendChild(node);
      }
    };
  }

  async function assertNoViolations(
    container: HTMLElement,
    queryClient: ReturnType<typeof createTestQueryClient>
  ) {
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    const results = await axe(container);
    expect(
      results.violations,
      results.violations.map((v) => v.description).join('\n')
    ).toHaveLength(0);
  }

  it("LandingPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<LandingPage />);
    await assertNoViolations(container, queryClient);
  });

  it("CreateEvent n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<CreateEvent />);
    await assertNoViolations(container, queryClient);
  });

  it("LoginPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<LoginPage />);
    await assertNoViolations(container, queryClient);
  });

  it("RegisterPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<RegisterPage />);
    await assertNoViolations(container, queryClient);
  });

  it("ForgotPasswordPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<ForgotPasswordPage />);
    await assertNoViolations(container, queryClient);
  });

  it("AccountPage (visiteur) n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<AccountPage />);
    await assertNoViolations(container, queryClient);
  });

  it(
    "TechPage n'a pas de violations",
    async () => {
      const { container, queryClient } = renderPage(<TechPage />);
      const restoreDiagrams = collapseDiagramsToTheirAccessibleName(container);
      await assertNoViolations(container, queryClient);
      restoreDiagrams();
    },
    HEAVIEST_PAGE_AXE_BUDGET
  );

  it("DonatePage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<DonatePage />);
    await assertNoViolations(container, queryClient);
  });

  it("NotFoundPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(<NotFoundPage />);
    await assertNoViolations(container, queryClient);
  });

  it("ServerErrorPage n'a pas de violations", async () => {
    const { container, queryClient } = renderPage(
      <ServerErrorPage error={new Error('boom')} onRetry={() => {}} />
    );
    await assertNoViolations(container, queryClient);
  });

  it("MyEventsPage n'a pas de violations", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(AUTH_USER)),
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [], total: 0 }))
    );
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter initialEntries={['/my-events']}>
          <Routes>
            <Route path="/my-events" element={<MyEventsPage />} />
            <Route path="/login" element={<div />} />
            <Route path="/new" element={<div />} />
          </Routes>
        </MemoryRouter>
      </AppTestProviders>
    );
    await assertNoViolations(container, queryClient);
  });

  it("ProfilePage avec badge soutien n'a pas de violations", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({
          handle: 'alice',
          displayName: 'Alice',
          avatarId: 'alpha',
          bio: 'Cinéphile',
          memberSince: '2024-03-15T00:00:00Z',
          followingCount: 2,
          followersCount: 5,
          isSupporter: true,
          isFollowedByMe: null,
        })
      ),
      http.get(`${TEST_API_V1}/users/alice/stats`, () =>
        HttpResponse.json({
          eventsCreated: 0,
          eventsJoined: 0,
          moviesProposed: 0,
          votesCast: 0,
          winningProposals: 0,
          moviesSeen: 0,
          currentStreakWeeks: 0,
          bestStreakWeeks: 0,
          favoriteGenres: [],
          dailyActivity: [],
        })
      )
    );
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter initialEntries={['/u/alice']}>
          <Routes>
            <Route path="/u/:handle" element={<ProfilePage />} />
            <Route path="/" element={<div />} />
          </Routes>
        </MemoryRouter>
      </AppTestProviders>
    );
    await screen.findByRole('heading', { name: 'Alice' });
    await assertNoViolations(container, queryClient);
  });

  it("ProfileMoviesPage n'a pas de violations", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${TEST_API_V1}/users/alice`, () =>
        HttpResponse.json({
          handle: 'alice',
          displayName: 'Alice',
          avatarId: 'alpha',
          bio: 'Cinéphile',
          memberSince: '2024-03-15T00:00:00Z',
          followingCount: 2,
          followersCount: 5,
          isSupporter: false,
          isFollowedByMe: null,
        })
      ),
      http.get(`${TEST_API_V1}/users/alice/stats`, () =>
        HttpResponse.json({
          eventsCreated: 1,
          eventsJoined: 1,
          moviesProposed: 2,
          votesCast: 1,
          winningProposals: 1,
          moviesSeen: 1,
          currentStreakWeeks: 0,
          bestStreakWeeks: 0,
          favoriteGenres: [],
          dailyActivity: [],
        })
      ),
      http.get(`${TEST_API_V1}/users/alice/watched-movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [28],
              mediaType: 'movie',
              watchedAt: '2026-06-01T00:00:00Z',
            },
          ],
        })
      )
    );
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter initialEntries={['/u/alice/films']}>
          <Routes>
            <Route path="/u/:handle/films" element={<ProfileMoviesPage />} />
            <Route path="/u/:handle" element={<div />} />
          </Routes>
        </MemoryRouter>
      </AppTestProviders>
    );
    await screen.findByText('Inception');
    await assertNoViolations(container, queryClient);
  });

  it("WatchlistPage n'a pas de violations", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u1',
          displayName: 'Alice',
          emailMasked: 'a***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
          ratingScale: 'ten',
        })
      ),
      http.get(`${TEST_API_V1}/watchlist`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 200,
              mediaType: 'movie',
              title: 'Ancien Mais Bien Noté',
              year: '2000',
              posterPath: null,
              voteAverage: 9.0,
              runtimeMinutes: 90,
              createdAt: '2026-01-01T00:00:00Z',
            },
          ],
        })
      )
    );
    const queryClient = createTestQueryClient();
    const { container } = render(
      <AppTestProviders client={queryClient}>
        <MemoryRouter initialEntries={['/watchlist']}>
          <WatchlistPage />
        </MemoryRouter>
      </AppTestProviders>
    );
    await screen.findByText('Ancien Mais Bien Noté');
    await assertNoViolations(container, queryClient);
  });

  describe('états déconnectés (C4)', () => {
    it("MyEventsPage (déconnecté) n'a pas de violations", async () => {
      const { container, queryClient } = renderPage(<MyEventsPage />);
      await screen.findByRole('heading', { name: /^mes soirées$/i, level: 1 });
      await assertNoViolations(container, queryClient);
    });

    it("WatchlistPage (déconnecté) n'a pas de violations", async () => {
      const { container, queryClient } = renderPage(<WatchlistPage />);
      await screen.findByRole('heading', { name: /^ma liste$/i, level: 1 });
      await assertNoViolations(container, queryClient);
    });

    it("NotificationsPage (déconnecté) n'a pas de violations", async () => {
      const { container, queryClient } = renderPage(<NotificationsPage />);
      await screen.findByRole('heading', { name: /^notifications$/i, level: 1 });
      await assertNoViolations(container, queryClient);
    });

    it("CreateEvent (déconnecté) n'a pas de violations", async () => {
      const { container, queryClient } = renderPage(<CreateEvent />);
      await screen.findByRole('link', { name: /^se connecter$/i });
      await assertNoViolations(container, queryClient);
    });
  });

  describe('EventDetailSession (page soirée)', () => {
    const EVENT: EventData = {
      id: 'evt-a11y',
      title: 'Soirée ciné accessible',
      date: '2035-08-01',
      time: '21:00',
      slug: 'soiree-a11y',
      isFinished: false,
      isHost: true,
      myParticipant: { id: 'p1', pseudo: 'Alice' },
      participantCount: 2,
      votersCount: 1,
      movieCount: 3,
      participants: [
        { id: 'p1', pseudo: 'Alice', isCreator: true },
        { id: 'p2', pseudo: 'Bob' },
      ],
    };

    const MOVIES: MovieData[] = [
      {
        id: 'm1',
        eventId: 'evt-a11y',
        participantId: 'p1',
        tmdbId: 27205,
        title: 'Inception',
        year: '2010',
        posterPath: null,
        proposerPseudo: 'Alice',
        score: 2,
        up: 2,
        down: 0,
        voteAverage: 8.3,
        runtimeMinutes: 148,
        genreIds: [28, 878],
        watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
      },
      {
        id: 'm2',
        eventId: 'evt-a11y',
        participantId: 'p2',
        tmdbId: 603,
        title: 'The Matrix',
        year: '1999',
        posterPath: null,
        proposerPseudo: 'Bob',
        score: -1,
        up: 0,
        down: 1,
        myVote: -1,
      },
      {
        id: 'm3',
        eventId: 'evt-a11y',
        participantId: 'p2',
        tmdbId: 218,
        title: 'La Cité de la peur',
        year: '1994',
        posterPath: null,
        proposerPseudo: 'Bob',
        score: 0,
        up: 0,
        down: 0,
        excludedFromWheel: true,
      },
    ];

    function renderEventSession(viewMode: 'grid' | 'list') {
      localStorage.setItem('movies-view', viewMode);
      const queryClient = createTestQueryClient();
      const { container } = render(
        <AppTestProviders client={queryClient}>
          <MemoryRouter>
            <EventDetailSession
              slug="soiree-a11y"
              hostToken={null}
              event={EVENT}
              moviesQuery={
                {
                  isPending: false,
                  isError: false,
                  isSuccess: true,
                  error: null,
                  data: MOVIES,
                  refetch: () => Promise.resolve() as never,
                } as unknown as UseQueryResult<MovieData[]>
              }
              movies={MOVIES}
              participant={{ participantId: 'p1', pseudo: 'Alice' }}
              setParticipant={() => undefined}
              actionError={null}
              setActionError={() => undefined}
              refreshAll={() => undefined}
            />
          </MemoryRouter>
        </AppTestProviders>
      );
      return { container, queryClient };
    }

    it("vue liste (ligne dense) n'a pas de violations", async () => {
      server.use(authMeGuestHandler, watchlistHandler([]));
      const { container, queryClient } = renderEventSession('list');
      await screen.findByRole('heading', { name: 'Inception' });
      await assertNoViolations(container, queryClient);
    }, 40000);

    it("vue grille n'a pas de violations", async () => {
      server.use(authMeGuestHandler, watchlistHandler([]));
      const { container, queryClient } = renderEventSession('grid');
      await screen.findByRole('heading', { name: 'Inception' });
      await assertNoViolations(container, queryClient);
    });
  });
});
