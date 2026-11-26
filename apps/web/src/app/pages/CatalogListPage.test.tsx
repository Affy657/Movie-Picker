import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiJson } from '@/mocks/apiJson';
import { buildShowcaseItem, requestedShowcaseSection } from '@/test-utils/titleItems';
import { buildUserProfile } from '@/test-utils/userProfile';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import {
  authMeGuestHandler,
  createSavedListsHandlers,
  createWatchedHandlers,
  TEST_API_V1,
} from '@/mocks/handlers';
import CatalogListPage from '@/app/pages/CatalogListPage';

const SUMMARY = 'Les aventures du jeune sorcier, de son arrivée à Poudlard à la bataille finale.';

function item(index: number) {
  return buildShowcaseItem({
    id: 2000 + index,
    mediaType: 'movie',
    title: `Film ${index}`,
    year: `${2000 + index}`,
    posterPath: null,
    voteAverage: 7,
    genreIds: [28],
    rank: null,
    eventCount: null,
  });
}

const showcaseHandler = http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) =>
  apiJson<'MovieShowcaseListResponse'>({
    section: requestedShowcaseSection(request),
    theme: null,
    items: [item(1), item(2), item(3)],
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  })
);

const collectionsHandler = http.get(`${TEST_API_V1}/movies/collections`, () =>
  apiJson<'MovieCollectionListResponse'>({
    items: [
      {
        id: 1241,
        name: 'Harry Potter - Saga',
        overview: SUMMARY,
        posterPath: null,
        movieCount: 3,
        previewPosterPaths: [],
        movieIds: [2001, 2002, 2003],
      },
    ],
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  })
);

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  apiJson<'UserProfileResponse'>(
    buildUserProfile({
      userId: 'u1',
      displayName: 'Alice',
      emailMasked: 'a***@test.local',
      uiTheme: 'system',
      accentColor: 'default',
      ratingScale: 'ten',
    })
  )
);

const emptyWatchlistHandler = http.get(`${TEST_API_V1}/watchlist`, () =>
  apiJson<'WatchlistResponse'>({ items: [], total: 0, hasMore: false })
);

const HARRY_POTTER = {
  id: 's1',
  sourceType: 'tmdbCollection' as const,
  sourceId: '1241',
  name: 'Harry Potter',
};

function renderPage(variant: 'collection' | 'theme', entry: InitialEntry) {
  const path = variant === 'collection' ? '/films/collection/:collectionId' : '/films/theme/:theme';
  return render(
    <AppTestProviders client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={<CatalogListPage variant={variant} />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

function renderSaga() {
  return renderPage('collection', '/films/collection/1241');
}

describe('CatalogListPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  it('shows a saga like a list: back to the sagas, its summary, Piocher and its films', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderSaga();

    const grid = await screen.findByRole('list', { name: 'Films de « Harry Potter »' });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('heading', { level: 1, name: 'Harry Potter' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sagas et collections' })).toHaveAttribute(
      'href',
      '/films/collections'
    );
    expect(screen.getByText('Saga')).toBeInTheDocument();
    expect(screen.getByText(SUMMARY)).toBeInTheDocument();
    expect(screen.getByText('3 films')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Piocher un film' })).toBeInTheDocument();
  });

  it('titles a saga missing from the catalog with the name the film page passes', async () => {
    server.use(
      authMeGuestHandler,
      showcaseHandler,
      http.get(`${TEST_API_V1}/movies/collections`, () =>
        apiJson<'MovieCollectionListResponse'>({
          items: [],
          disclaimer: 'TMDB',
          tmdbAttributionUrl: '',
        })
      )
    );
    renderPage('collection', {
      pathname: '/films/collection/726871',
      state: { collectionName: 'La saga Dune' },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'La saga Dune' })
    ).toBeInTheDocument();
    expect(await screen.findByText('Film 1')).toBeInTheDocument();
  });

  it('reports an unknown selection and sends back to the home', async () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('theme', '/films/theme/nawak');

    expect(await screen.findByText(/n’existe pas/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /retour à l’accueil/i }).length).toBeGreaterThan(0);
  });

  it('saves the saga from the button after Piocher, then stops saving it, for a member', async () => {
    let saved: unknown = null;
    server.use(
      authedUserHandler,
      emptyWatchlistHandler,
      showcaseHandler,
      collectionsHandler,
      http.post(`${TEST_API_V1}/saved-lists`, async ({ request }) => {
        saved = await request.clone().json();
      }),
      ...createSavedListsHandlers([], [HARRY_POTTER]),
      ...createWatchedHandlers()
    );
    const user = userEvent.setup();
    renderSaga();

    const save = await screen.findByRole('button', { name: 'Enregistrer dans Mes listes' });
    await waitFor(() => expect(save).toBeEnabled());
    const pick = await screen.findByRole('button', { name: 'Piocher un film' });
    expect(pick.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(save);

    const savedButton = await screen.findByRole('button', { name: 'Enregistrée' });
    await waitFor(() => expect(saved).toEqual({ sourceType: 'tmdbCollection', sourceId: '1241' }));

    await user.click(savedButton);

    expect(
      await screen.findByRole('button', { name: 'Enregistrer dans Mes listes' })
    ).toBeInTheDocument();
  });

  it('shows a selection already saved as Enregistrée, as a selection of Explorer', async () => {
    server.use(
      authedUserHandler,
      emptyWatchlistHandler,
      showcaseHandler,
      ...createSavedListsHandlers([
        { id: 's2', sourceType: 'explorerTheme', sourceId: 'frissons', name: 'frissons' },
      ]),
      ...createWatchedHandlers()
    );
    renderPage('theme', '/films/theme/frissons');

    expect(await screen.findByRole('button', { name: 'Enregistrée' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Frissons d’automne' })
    ).toBeInTheDocument();
    expect(screen.getByText('Sélection d’Explorer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l’accueil/i })).toHaveAttribute('href', '/');
  });

  it('offers no saving and no dimming to a visitor', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderSaga();

    await screen.findByText('Film 1');
    expect(screen.queryByRole('button', { name: /enregistr/i })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Griser les vus' })).toBeNull();
  });

  it('counts the films a member has watched next to their number, and dims them', async () => {
    server.use(
      authedUserHandler,
      emptyWatchlistHandler,
      showcaseHandler,
      collectionsHandler,
      http.patch(`${TEST_API_V1}/auth/me`, () =>
        apiJson<'UserProfileResponse'>(
          buildUserProfile({
            userId: 'u1',
            displayName: 'Alice',
            emailMasked: 'a***@test.local',
            uiTheme: 'system',
            accentColor: 'default',
            ratingScale: 'ten',
            dimWatched: true,
          })
        )
      ),
      ...createSavedListsHandlers(),
      ...createWatchedHandlers([{ tmdbId: 2001, title: 'Film 1', source: 'night' }])
    );
    const user = userEvent.setup();
    renderSaga();

    expect(await screen.findByText('3 films, 1 vu')).toBeInTheDocument();

    await user.click(await screen.findByRole('switch', { name: 'Griser les vus' }));

    expect(
      await screen.findByRole('button', { name: 'Voir les détails de « Film 1 », déjà vu' })
    ).toBeInTheDocument();
  });
});
