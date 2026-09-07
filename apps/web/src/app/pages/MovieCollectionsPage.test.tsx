import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import MovieCollectionsPage from '@/app/pages/MovieCollectionsPage';

const collectionsHandler = http.get(`${TEST_API_V1}/movies/collections`, () =>
  HttpResponse.json({
    items: [
      { id: 1, name: 'Star Wars', overview: null, posterPath: null, movieCount: 9 },
      { id: 2, name: 'Alien', overview: null, posterPath: null, movieCount: 4 },
      { id: 3, name: 'Star Trek', overview: null, posterPath: null, movieCount: 13 },
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

function collectionNames() {
  const grid = screen.getByRole('list', { name: '' });
  return within(grid)
    .getAllByRole('listitem')
    .map((item) => item.textContent?.replace(/\d+ films?$/, '').trim());
}

describe('MovieCollectionsPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('garde l’ordre servi par l’API par défaut', async () => {
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

  it('propose un état vide quand aucune saga ne correspond', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    await user.type(screen.getByRole('searchbox', { name: /filtrer les sagas/i }), 'zzz');

    expect(screen.getByText(/aucune saga ne correspond/i)).toBeInTheDocument();
    expect(screen.queryByText('Star Wars')).not.toBeInTheDocument();
  });

  it('trie par nombre de films décroissant', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    await user.click(screen.getByRole('button', { name: /nombre de films/i }));

    expect(collectionNames()).toEqual(['Star Trek', 'Star Wars', 'Alien']);
  });

  it('trie par nom croissant', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, collectionsHandler);
    renderPage();

    await screen.findByText('Star Wars');
    await user.click(screen.getByRole('button', { name: /^nom$/i }));

    expect(collectionNames()).toEqual(['Alien', 'Star Trek', 'Star Wars']);
  });
});
