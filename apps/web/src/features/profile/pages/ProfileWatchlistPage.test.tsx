import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { mockWatchlistItem, authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import { buildPublicProfile } from '@/test-utils/publicProfile';
import { buildUserProfile } from '@/test-utils/userProfile';
import ProfileWatchlistPage from '@/features/profile/pages/ProfileWatchlistPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubHoverCapability } from '@/test-utils/matchMedia';

const ALICE_PROFILE = buildPublicProfile({
  handle: 'alice',
  displayName: 'Alice',
  avatarId: 'alpha',
  bio: null,
  memberSince: '2024-03-15T00:00:00Z',
  followingCount: 3,
  followersCount: 7,
  isSupporter: false,
  isFollowedByMe: null,
  isWatchlistPublic: true,
  watchlistCount: 3,
});

function watchlistItem(overrides: Record<string, unknown> = {}) {
  return mockWatchlistItem({
    tmdbId: 27205,
    mediaType: 'movie',
    title: 'Inception',
    year: '2010',
    posterPath: null,
    voteAverage: 8.4,
    runtimeMinutes: 148,
    genreIds: [28],
    createdAt: '2026-06-01T00:00:00Z',
    ...overrides,
  });
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(handle: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[`/u/${handle}/watchlist`]}>
        <Routes>
          <Route path="/u/:handle/watchlist" element={<ProfileWatchlistPage />} />
          <Route path="/u/:handle" element={<div data-testid="route-profile" />} />
          <Route path="/" element={<div data-testid="route-home" />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileWatchlistPage (MSW)', () => {
  const server = setupServer(
    authMeGuestHandler,
    http.get(`${TEST_API_V1}/users/:handle`, () => apiJson<'PublicProfileResponse'>(ALICE_PROFILE)),
    http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
      apiJson<'WatchlistResponse'>({
        items: [
          watchlistItem({ title: 'Inception', year: '2010' }),
          watchlistItem({ tmdbId: 157336, title: 'Interstellar', year: '2014' }),
          watchlistItem({ tmdbId: 329865, title: 'Arrival', year: '2016' }),
        ],
        total: 3,
        hasMore: false,
      })
    )
  );

  beforeAll(() => server.listen({ onUnhandledFrame: 'warn' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('shows the title, the counter and the movies to watch, with a link back to the profile', async () => {
    renderPage('alice');

    expect(
      await screen.findByRole('heading', { name: /la watchlist d’alice/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/3 films à voir/i)).toBeInTheDocument();
    expect(document.title).toBe('La watchlist d’Alice | Movie Picker');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringMatching(/^Watchlist d’Alice \(@alice\)/)
    );
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
    expect(screen.getByText('Arrival')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour au profil/i })).toHaveAttribute(
      'href',
      '/u/alice'
    );
  });

  it('trie par date d’ajout et filtre par la recherche', async () => {
    const user = userEvent.setup();
    renderPage('alice');
    await screen.findByText('Inception');

    expect(screen.getByRole('button', { name: /ajouté le/i })).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', { name: /rechercher dans la watchlist/i }),
      'arriv'
    );

    expect(screen.getByText('Arrival')).toBeInTheDocument();
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
  });

  it('opens the film page when clicking a poster', async () => {
    const user = userEvent.setup();
    renderPage('alice');
    await screen.findByText('Inception');

    expect(screen.queryByRole('button', { name: /plus d.actions/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /voir les détails de « inception »/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/film/27205-inception');
  });

  it('hover, logged in: the poster offers the watchlist toggle and Proposer', async () => {
    stubHoverCapability();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        apiJson<'UserProfileResponse'>(
          buildUserProfile({
            userId: 'u-me',
            displayName: 'Bob',
            emailMasked: 'b***@test.local',
            uiTheme: 'system',
            accentColor: 'default',
            ratingScale: 'ten',
          })
        )
      ),
      http.get(`${TEST_API_V1}/watchlist`, () =>
        apiJson<'WatchlistResponse'>({
          items: [watchlistItem({ title: 'Inception', year: '2010' })],
          total: 1,
          hasMore: false,
        })
      )
    );
    const user = userEvent.setup();
    renderPage('alice');
    await screen.findByText('Inception');

    expect(
      await screen.findByRole('button', { name: 'Retirer « Inception » de ma liste' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^proposer « inception »/i }));

    expect(
      await screen.findByText(/proposer «\s*inception\s*» dans une soirée/i)
    ).toBeInTheDocument();
  });

  it('shows an empty state when the watchlist contains nothing', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
        apiJson<'WatchlistResponse'>({ items: [], total: 0, hasMore: false })
      )
    );
    renderPage('alice');

    expect(await screen.findByText(/aucun film à voir pour le moment/i)).toBeInTheDocument();
  });

  it('tells a visitor the watchlist is not public, with nothing to retry', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle`, () =>
        apiJson<'PublicProfileResponse'>({
          ...ALICE_PROFILE,
          isWatchlistPublic: false,
          watchlistCount: null,
        })
      ),
      http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
        apiErrorJson(404, 'watchlist_not_found')
      )
    );
    renderPage('alice');

    expect(
      await screen.findByText('La watchlist de ce membre n’est pas publique.')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /la watchlist d’alice/i })).toBeInTheDocument();
    expect(screen.queryByText(/ce profil n.existe pas/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
    expect(screen.queryByText(/0 film à voir/i)).not.toBeInTheDocument();
  });

  it('shows not found when the watchlist answers a bare 404', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle/watchlist`, () => apiErrorJson(404, 'not_found'))
    );
    renderPage('alice');

    expect(await screen.findByText(/ce profil n.existe pas/i)).toBeInTheDocument();
  });

  it("affiche l'introuvable pour un profil inconnu", async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle`, () => apiErrorJson(404, 'not_found')),
      http.get(`${TEST_API_V1}/users/:handle/watchlist`, () => apiErrorJson(404, 'not_found'))
    );
    renderPage('ghost');

    expect(await screen.findByText(/ce profil n.existe pas/i)).toBeInTheDocument();
  });
});
