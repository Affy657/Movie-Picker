import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiJson } from '@/mocks/apiJson';
import { buildSearchItem } from '@/test-utils/titleItems';
import { buildUserProfile } from '@/test-utils/userProfile';
import { openSortMenu, sortChoices } from '@/test-utils/sortMenu';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubHoverCapability, stubMatchMedia } from '@/test-utils/matchMedia';
import {
  createWatchedHandlers,
  createWatchlistHandlers,
  TEST_API_V1,
  type MockWatchedMovie,
} from '@/mocks/handlers';
import WatchedMoviesPage from './WatchedMoviesPage';

function authedUserWith(extra: Record<string, unknown>) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    apiJson<'UserProfileResponse'>(
      buildUserProfile({
        userId: 'u1',
        displayName: 'Alice',
        emailMasked: 'a***@test.local',
        uiTheme: 'system',
        accentColor: 'default',
        ratingScale: 'ten',
        handle: 'alice',
        ...extra,
      })
    )
  );
}

const authedUser = authedUserWith({});

const WATCHED: MockWatchedMovie[] = [
  {
    tmdbId: 1,
    title: 'Anora',
    year: '2024',
    source: 'elsewhere',
    myRating: 8,
    watchedAt: '2026-11-10T20:00:00Z',
  },
  {
    tmdbId: 2,
    title: 'Dune',
    year: '2021',
    source: 'night',
    myRating: 9,
    watchedAt: '2026-11-01T20:00:00Z',
    nightSlug: 'Ab3x',
    nightTitle: 'Ciné-club',
  },
  { tmdbId: 3, title: 'Alien', year: '1979', source: 'night', watchedAt: '2026-10-01T20:00:00Z' },
];

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/listes/films-vus']}>
        <Routes>
          <Route path="/listes/films-vus" element={<WatchedMoviesPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

function useServer(watched: MockWatchedMovie[] = WATCHED) {
  return [authedUser, ...createWatchlistHandlers([]), ...createWatchedHandlers(watched)];
}

async function titles() {
  const grid = await screen.findByRole('list', { name: 'Mes films vus' });
  return within(grid)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);
}

describe('WatchedMoviesPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows the watched films, latest first, under a link back to Mes listes', async () => {
    server.use(...useServer());

    renderPage();

    expect(await screen.findByText('3 films vus')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Films vus' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes listes' })).toHaveAttribute('href', '/listes');
    expect(await titles()).toEqual(['Anora', 'Dune', 'Alien']);
    expect(screen.getByRole('button', { name: 'Ajouter un film vu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /piocher/i })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Griser les vus' })).toBeNull();
  });

  it('lists the film past the first thousand and finds it by the search', async () => {
    const history: MockWatchedMovie[] = Array.from({ length: 1001 }, (_, index) => ({
      tmdbId: 10_000 + index,
      title: `Titre ${String(index + 1).padStart(4, '0')}`,
      source: 'elsewhere',
      watchedAt: new Date(Date.UTC(2026, 0, 1) - index * 86_400_000).toISOString(),
    }));
    server.use(...useServer(history));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('1001 films vus')).toBeInTheDocument();
    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher dans Films vus' }),
      'Titre 1001'
    );

    expect(await titles()).toEqual(['Titre 1001']);
  });

  it('sorts by watch date, title and year', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    const sorts = await openSortMenu(user, 'Vu le');
    expect(sortChoices(sorts)).toEqual(['Vu le', 'Titre', 'Année']);

    await user.click(within(sorts).getByRole('menuitemradio', { name: 'Titre' }));

    expect(await titles()).toEqual(['Alien', 'Anora', 'Dune']);
  });

  it('badges my rating and the films seen at a night', async () => {
    server.use(...useServer());

    renderPage();

    await screen.findByRole('list', { name: 'Mes films vus' });
    expect(screen.getByText('Votre note : 8/10')).toBeInTheDocument();
    expect(screen.getByText('Votre note : 9/10')).toBeInTheDocument();
    expect(screen.getAllByText('Vu en soirée')).toHaveLength(2);
  });

  it('filters the films by where they were seen', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    const where = await screen.findByRole('radiogroup', { name: 'Vu où' });
    expect(within(where).getByRole('radio', { name: 'Tous' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(within(where).getByRole('radio', { name: 'Ailleurs' }));
    expect(await titles()).toEqual(['Anora']);
    expect(screen.getByText('1 sur 3')).toBeInTheDocument();

    await user.click(within(where).getByRole('radio', { name: 'En soirée' }));
    expect(await titles()).toEqual(['Dune', 'Alien']);
  });

  it('adds a film seen elsewhere from the search panel', async () => {
    let marked: Record<string, unknown> | null = null;
    server.use(
      http.post(`${TEST_API_V1}/watched`, async ({ request }) => {
        marked = (await request.json()) as Record<string, unknown>;
        return apiJson<'WatchedStatusResponse'>({
          status: 'elsewhere',
          watchedAt: '2026-11-13T10:00:00Z',
          rating: null,
          nightSlug: null,
          nightTitle: null,
        });
      }),
      http.get(`${TEST_API_V1}/movies/search`, () =>
        apiJson<'MovieSearchListResponse'>({
          items: [
            buildSearchItem({
              id: 100,
              title: 'Film Test',
              year: '2024',
              posterPath: null,
              voteAverage: 7.5,
              runtimeMinutes: 112,
              genreIds: [27],
              watchProviders: [],
              tmdbWatchPageUrl: null,
            }),
          ],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: '',
        })
      ),
      ...useServer()
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Ajouter un film vu' }));
    expect(await screen.findByRole('heading', { name: 'Ajouter un film vu' })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Rechercher un film vu…'), 'Film Test');
    await user.click(await screen.findByRole('button', { name: /^ajouter « film test/i }));

    await waitFor(() =>
      expect(marked).toMatchObject({ tmdbId: 100, title: 'Film Test', genreIds: [27] })
    );
  });

  it('takes a film seen elsewhere out from the table view, never one seen at a night', async () => {
    stubHoverCapability();
    localStorage.setItem('watchlist-view', 'list');
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: /plus d.actions pour «\s*dune\s*»/i })
    );
    expect(screen.queryByRole('menuitem', { name: /des films vus/i })).toBeNull();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /plus d.actions pour «\s*anora\s*»/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Retirer « Anora » des films vus' }));

    await waitFor(() => expect(screen.queryByText('Anora')).toBeNull());
    expect(screen.getByText('2 films vus')).toBeInTheDocument();
  });

  it('says so when no film is watched yet', async () => {
    server.use(...useServer([]));

    renderPage();

    expect(await screen.findByText('Aucun film vu pour l’instant')).toBeInTheDocument();
    expect(screen.getByText('Aucun film vu')).toBeInTheDocument();
  });

  it('on a phone, keeps the whole add button under the title', async () => {
    stubMatchMedia(true);
    server.use(...useServer());

    renderPage();

    expect(await screen.findByRole('button', { name: 'Ajouter un film vu' })).toBeInTheDocument();
  });

  it('says under the title that Letterboxd fills Films vus', async () => {
    server.use(
      authedUserWith({ letterboxdUsername: 'alice_lb' }),
      ...createWatchlistHandlers([]),
      ...createWatchedHandlers(WATCHED)
    );

    renderPage();

    expect(await screen.findByText('Synchronisée avec Letterboxd')).toBeInTheDocument();
  });

  it.each([
    {
      why: 'the films vus sync is off',
      extra: { letterboxdUsername: 'alice_lb', letterboxdSyncWatched: false },
    },
    { why: 'no Letterboxd username is saved', extra: { letterboxdUsername: null } },
  ])('says nothing about Letterboxd when $why', async ({ extra }) => {
    server.use(
      authedUserWith(extra),
      ...createWatchlistHandlers([]),
      ...createWatchedHandlers(WATCHED)
    );

    renderPage();

    await screen.findByText('3 films vus');
    expect(screen.queryByText('Synchronisée avec Letterboxd')).not.toBeInTheDocument();
  });

  it('hides the watched films from the profile through the ⋯ menu', async () => {
    let body: unknown = null;
    server.use(
      authedUserWith({ isWatchedPublic: true }),
      ...createWatchlistHandlers([]),
      ...createWatchedHandlers(WATCHED),
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        body = await request.json();
        return apiJson<'UserProfileResponse'>(
          buildUserProfile({ userId: 'u1', displayName: 'Alice', isWatchedPublic: false })
        );
      })
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rendre privée' }));

    await waitFor(() => expect(body).toEqual({ isWatchedPublic: false }));
    await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));
    expect(screen.getByRole('menuitem', { name: 'Rendre publique' })).toBeInTheDocument();
  });

  it('offers to show hidden watched films again', async () => {
    server.use(
      authedUserWith({ isWatchedPublic: false }),
      ...createWatchlistHandlers([]),
      ...createWatchedHandlers(WATCHED)
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));

    expect(screen.getByRole('menuitem', { name: 'Rendre publique' })).toBeInTheDocument();
  });
});
