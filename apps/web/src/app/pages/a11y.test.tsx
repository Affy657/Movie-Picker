import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
import ProfilePage from '@/features/profile/pages/ProfilePage';
import ProfileMoviesPage from '@/features/profile/pages/ProfileMoviesPage';
import ServerErrorPage from '@/shared/components/ServerErrorPage';

const AUTH_USER = {
  userId: 'u-a11y',
  displayName: 'TestUser',
  emailMasked: 't***@test.local',
  uiTheme: 'light',
  accentColor: 'default',
};

describe('accessibilité (axe)', () => {
  const server = setupServer(
    authMeGuestHandler,
    http.get(`${TEST_API_V1}/auth/oauth/providers`, () => HttpResponse.json({ providers: [] }))
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
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
      http.get(`${TEST_API_V1}/users/alice/movies`, () =>
        HttpResponse.json({
          items: [
            {
              tmdbId: 27205,
              title: 'Inception',
              year: '2010',
              posterPath: null,
              genreIds: [28],
              mediaType: 'movie',
              proposedAt: '2026-06-01T00:00:00Z',
              isWinner: true,
            },
          ],
          totalCount: 1,
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
});
