import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiJson } from '@/mocks/apiJson';
import { buildUserProfile } from '@/test-utils/userProfile';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import {
  authMeGuestHandler,
  createSavedListsHandlers,
  createWatchedHandlers,
  TEST_API_V1,
} from '@/mocks/handlers';
import { pickSort } from '@/test-utils/sortMenu';
import MovieCollectionsPage from '@/app/pages/MovieCollectionsPage';

const collectionsHandler = http.get(`${TEST_API_V1}/movies/collections`, () =>
  apiJson<'MovieCollectionListResponse'>({
    items: [
      {
        id: 1,
        name: 'Star Wars',
        overview: null,
        posterPath: null,
        movieCount: 9,
        previewPosterPaths: ['/sw1.jpg', '/sw2.jpg', '/sw3.jpg'],
        movieIds: [11, 12, 13, 14, 15, 16, 17, 18, 19],
      },
      {
        id: 2,
        name: 'Alien',
        overview: null,
        posterPath: null,
        movieCount: 4,
        previewPosterPaths: [],
        movieIds: [21, 22, 23, 24],
      },
      {
        id: 3,
        name: 'Star Trek',
        overview: null,
        posterPath: null,
        movieCount: 13,
        previewPosterPaths: [],
        movieIds: [],
      },
    ],
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  })
);

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/films/collections']}>
        <MovieCollectionsPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

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

function sagaRows() {
  return within(screen.getByRole('list', { name: 'Sagas et collections' })).getAllByRole(
    'listitem'
  );
}

const SAGA_NAMES = ['Star Wars', 'Alien', 'Star Trek'];

function collectionNames() {
  return sagaRows().map((row) => SAGA_NAMES.find((name) => row.textContent?.startsWith(name)));
}

function rowOf(name: string) {
  return sagaRows().find((row) => row.textContent?.includes(name))!;
}

describe('MovieCollectionsPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('keeps the order served by the API by default', async () => {
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    expect(await screen.findByText('Star Wars')).toBeInTheDocument();
    expect(collectionNames()).toEqual(['Star Wars', 'Alien', 'Star Trek']);
  });

  it('n’expose pas de bouton de filtres, seulement recherche et tri', async () => {
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    expect(screen.getByRole('searchbox', { name: /filtrer les sagas/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /filtres/i })).not.toBeInTheDocument();
  });

  it('filtre les sagas sur leur nom', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    await user.type(screen.getByRole('searchbox', { name: /filtrer les sagas/i }), 'star');

    expect(collectionNames()).toEqual(['Star Wars', 'Star Trek']);
    expect(screen.getByText(/2 sagas sur 3/i)).toBeInTheDocument();
  });

  it('offers an empty state when no saga matches', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    await user.type(screen.getByRole('searchbox', { name: /filtrer les sagas/i }), 'zzz');

    expect(screen.getByText(/aucune saga ne correspond/i)).toBeInTheDocument();
    expect(screen.queryByText('Star Wars')).not.toBeInTheDocument();
  });

  it('sorts by decreasing number of films', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    await pickSort(user, 'Popularité', 'Nombre de films');

    expect(collectionNames()).toEqual(['Star Trek', 'Star Wars', 'Alien']);
  });

  it('trie par nom croissant', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    await pickSort(user, 'Popularité', 'Nom');

    expect(collectionNames()).toEqual(['Alien', 'Star Trek', 'Star Wars']);
  });

  it('shows each saga on one row like Mes listes, with its posters fanned out', async () => {
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    const starWars = rowOf('Star Wars');
    expect(within(starWars).getByText('9 films')).toBeInTheDocument();
    expect(starWars.querySelector('[data-count="3"]')).not.toBeNull();
  });

  it('counts the films a member has watched in each saga, as Mes listes does', async () => {
    server.use(
      authedUserHandler,
      collectionsHandler,
      ...createSavedListsHandlers(),
      ...createWatchedHandlers([
        { tmdbId: 11, title: 'Un nouvel espoir', source: 'night' },
        { tmdbId: 12, title: 'L’Empire contre-attaque', source: 'night' },
      ])
    );
    renderPage();

    expect(await screen.findByText('9 films, 2 vus')).toBeInTheDocument();
    expect(within(rowOf('Alien')).getByText('4 films')).toBeInTheDocument();
  });

  it('marks the sagas already saved in Mes listes', async () => {
    server.use(
      authedUserHandler,
      collectionsHandler,
      ...createWatchedHandlers(),
      ...createSavedListsHandlers([
        { id: 's1', sourceType: 'tmdbCollection', sourceId: '2', name: 'Alien' },
      ])
    );
    renderPage();

    await screen.findByText('Star Wars');
    expect(await within(rowOf('Alien')).findByText('Enregistrée')).toBeInTheDocument();
    expect(within(rowOf('Star Wars')).queryByText('Enregistrée')).toBeNull();
  });

  it('still lists the sagas of a member when the API does not send their films yet', async () => {
    server.use(
      authedUserHandler,
      ...createSavedListsHandlers(),
      ...createWatchedHandlers([{ tmdbId: 11, title: 'Un nouvel espoir', source: 'night' }]),
      http.get(`${TEST_API_V1}/movies/collections`, () =>
        apiJson<'MovieCollectionListResponse'>({
          items: [
            {
              id: 1,
              name: 'Star Wars',
              overview: null,
              posterPath: null,
              movieCount: 9,
              previewPosterPaths: [],
              movieIds: [],
            },
          ],
          disclaimer: 'TMDB',
          tmdbAttributionUrl: 'https://www.themoviedb.org/',
        })
      )
    );
    renderPage();

    expect(await screen.findByText('9 films')).toBeInTheDocument();
  });
});
