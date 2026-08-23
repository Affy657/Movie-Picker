import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import ProfileMoviesPage from '@/features/profile/pages/ProfileMoviesPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
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
};

const STATS = {
  eventsCreated: 0,
  eventsJoined: 0,
  moviesProposed: 3,
  votesCast: 0,
  winningProposals: 1,
  moviesSeen: 0,
  favoriteGenres: [],
  dailyActivity: [],
};

function movieItem(overrides: Record<string, unknown> = {}) {
  return {
    tmdbId: 27205,
    title: 'Inception',
    year: '2010',
    posterPath: null,
    genreIds: [28],
    mediaType: 'movie',
    proposedAt: '2026-06-01T00:00:00Z',
    isWinner: false,
    ...overrides,
  };
}

function renderPage(handle: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[`/u/${handle}/films`]}>
        <Routes>
          <Route path="/u/:handle/films" element={<ProfileMoviesPage />} />
          <Route path="/u/:handle" element={<div data-testid="route-profile" />} />
          <Route path="/" element={<div data-testid="route-home" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileMoviesPage (MSW)', () => {
  const server = setupServer(
    http.get(`${TEST_API_V1}/users/:handle`, () => HttpResponse.json(ALICE_PROFILE)),
    http.get(`${TEST_API_V1}/users/:handle/stats`, () => HttpResponse.json(STATS)),
    http.get(`${TEST_API_V1}/users/:handle/movies`, () =>
      HttpResponse.json({
        items: [
          movieItem({ title: 'Inception', year: '2010', isWinner: true }),
          movieItem({ title: 'Interstellar', year: '2014' }),
          movieItem({ title: 'Arrival', year: '2016' }),
        ],
        totalCount: 3,
      })
    ),
    http.get(`${TEST_API_V1}/movies/tmdb/:tmdbId/details`, () =>
      HttpResponse.json({ tmdbId: 27205, title: 'Inception', overview: 'Un voleur de rêves.' })
    )
  );

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le titre, le sous-titre et les films avec le badge gagnant', async () => {
    renderPage('alice');

    expect(await screen.findByRole('heading', { name: /les films de alice/i })).toBeInTheDocument();
    expect(screen.getByText(/3 films proposés, 1 gagnant/i)).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
    expect(screen.getByText('Arrival')).toBeInTheDocument();
    expect(screen.getByText('Gagnant')).toBeInTheDocument();
  });

  it('filtre les films par la recherche', async () => {
    const user = userEvent.setup();
    renderPage('alice');
    await screen.findByText('Inception');

    await user.type(
      screen.getByRole('searchbox', { name: /rechercher parmi les films/i }),
      'arriv'
    );

    expect(screen.getByText('Arrival')).toBeInTheDocument();
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
  });

  it('ouvre la modale de détails au clic sur une affiche', async () => {
    const user = userEvent.setup();
    renderPage('alice');
    await screen.findByText('Inception');

    await user.click(screen.getByRole('button', { name: /voir les détails de « inception »/i }));

    expect(await screen.findByRole('heading', { name: 'Inception', level: 2 })).toBeInTheDocument();
  });

  it("affiche l'introuvable pour un profil privé ou inconnu", async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/:handle`, () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Introuvable' }, { status: 404 })
      )
    );
    renderPage('ghost');

    expect(await screen.findByText(/ce profil n'existe pas/i)).toBeInTheDocument();
  });

  it('révèle le reste des films au clic sur "Charger"', async () => {
    const items = Array.from({ length: 30 }, (_, i) =>
      movieItem({
        title: `Film ${i}`,
        proposedAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })
    );
    server.use(
      http.get(`${TEST_API_V1}/users/:handle/movies`, () =>
        HttpResponse.json({ items, totalCount: items.length })
      )
    );
    const user = userEvent.setup();
    renderPage('alice');

    // Tri par défaut : proposition la plus récente d'abord, donc Film 29 (le 30) est visible
    // en premier et Film 0 (le 1er) est le dernier des 30, masqué tant qu'on n'a pas chargé le reste.
    await screen.findByText('Film 29');
    expect(screen.queryByText('Film 0')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /charger les 6 films restants/i }));

    await waitFor(() => expect(screen.getByText('Film 0')).toBeInTheDocument());
  });
});
