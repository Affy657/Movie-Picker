import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ProfileWatchlistPage from '@/features/profile/pages/ProfileWatchlistPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubHoverCapability } from '@/test-utils/matchMedia';
import { TEST_API_V1 } from '@/mocks/handlers';

const ALICE_PROFILE = {
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
};

function watchlistItem(overrides: Record<string, unknown> = {}) {
  return {
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
  };
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
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileWatchlistPage (MSW)', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 })),
    http.get(`${TEST_API_V1}/users/:handle`, () => HttpResponse.json(ALICE_PROFILE)),
    http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
      HttpResponse.json({
        items: [
          watchlistItem({ title: 'Inception', year: '2010' }),
          watchlistItem({ tmdbId: 157336, title: 'Interstellar', year: '2014' }),
          watchlistItem({ tmdbId: 329865, title: 'Arrival', year: '2016' }),
        ],
        total: 3,
        hasMore: false,
      })
    ),
    http.get(`${TEST_API_V1}/movies/tmdb/:tmdbId/details`, () =>
      HttpResponse.json({ tmdbId: 27205, title: 'Inception', overview: 'Un voleur de rêves.' })
    )
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('shows the title, the counter and the movies to watch, with a link back to the profile', async () => {
    renderPage('alice');

    expect(
      await screen.findByRole('heading', { name: /la watchlist de alice/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/3 films à voir/i)).toBeInTheDocument();
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

  it('ouvre la fiche du film au clic sur une affiche', async () => {
    const user = userEvent.setup();
    renderPage('alice');
    await screen.findByText('Inception');

    expect(screen.queryByRole('button', { name: /plus d.actions/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /voir les détails de « inception »/i }));

    expect(await screen.findByRole('heading', { name: 'Inception', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter à ma liste' })).not.toBeInTheDocument();
  });

  it('hover, logged in: the kebab offers the watchlist toggle and the proposal', async () => {
    stubHoverCapability();
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u-me',
          displayName: 'Bob',
          emailMasked: 'b***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
          ratingScale: 'ten',
        })
      ),
      http.get(`${TEST_API_V1}/watchlist`, () =>
        HttpResponse.json({ items: [watchlistItem({ title: 'Inception', year: '2010' })] })
      )
    );
    const user = userEvent.setup();
    renderPage('alice');
    await screen.findByText('Inception');

    await user.click(await screen.findByRole('button', { name: /plus d.actions.*inception/i }));

    const names = screen
      .getAllByRole('menuitem')
      .map((item) => item.getAttribute('aria-label') ?? item.textContent);
    expect(names).toEqual([
      'Voir les détails',
      'Retirer de ma liste',
      'Proposer dans une soirée',
      'Ouvrir sur Letterboxd',
    ]);
  });

  it('shows an empty state when the watchlist contains nothing', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
        HttpResponse.json({ items: [], total: 0, hasMore: false })
      )
    );
    renderPage('alice');

    expect(await screen.findByText(/aucun film à voir pour le moment/i)).toBeInTheDocument();
  });

  it('shows not found when the watchlist is hidden or the profile private', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Introuvable' }, { status: 404 })
      )
    );
    renderPage('alice');

    expect(await screen.findByText(/ce profil n'existe pas/i)).toBeInTheDocument();
  });

  it("affiche l'introuvable pour un profil inconnu", async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle`, () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Introuvable' }, { status: 404 })
      ),
      http.get(`${TEST_API_V1}/users/:handle/watchlist`, () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Introuvable' }, { status: 404 })
      )
    );
    renderPage('ghost');

    expect(await screen.findByText(/ce profil n'existe pas/i)).toBeInTheDocument();
  });
});
