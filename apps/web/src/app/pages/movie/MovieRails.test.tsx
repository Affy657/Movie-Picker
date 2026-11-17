import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import MovieRails from '@/app/pages/movie/MovieRails';
import ShowcaseListPage from '@/app/pages/ShowcaseListPage';

const DUNE = { tmdbId: 438631, mediaType: 'movie' as const };

const library = {
  hasHover: false,
  isLoggedIn: false,
  has: () => false,
  toggle: vi.fn(),
  propose: vi.fn(),
};

function showcaseItem(id: number, title: string) {
  return { id, mediaType: 'movie', title, year: '2021', posterPath: null };
}

const handlers = [
  authMeGuestHandler,
  http.get(`${TEST_API_V1}/movies/tmdb/438631/details`, () =>
    HttpResponse.json({ tmdbId: 438631, mediaType: 'movie', title: 'Dune', genres: [] })
  ),
  http.get(`${TEST_API_V1}/movies/collections`, () =>
    HttpResponse.json({ items: [], disclaimer: 'TMDB', tmdbAttributionUrl: '' })
  ),
  http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
    const section = new URL(request.url).searchParams.get('section');
    const items =
      section === 'collection'
        ? [showcaseItem(438631, 'Dune'), showcaseItem(693134, 'Dune : Deuxième partie')]
        : [showcaseItem(329865, 'Premier Contact'), showcaseItem(335984, 'Blade Runner 2049')];
    return HttpResponse.json({
      section,
      theme: null,
      items,
      disclaimer: '',
      tmdbAttributionUrl: '',
    });
  }),
];

function renderRails() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/film/438631-dune']}>
        <Routes>
          <Route
            path="/film/:movieRef"
            element={
              <MovieRails
                current={DUNE}
                collection={{ id: 726871, name: 'La saga Dune' }}
                director={null}
                library={library}
                onSelect={vi.fn()}
              />
            }
          />
          <Route
            path="/films/collection/:collectionId"
            element={<ShowcaseListPage variant="collection" />}
          />
          <Route
            path="/films/similaires/:seedTmdbId"
            element={<ShowcaseListPage variant="recommendations" />}
          />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('MovieRails', () => {
  const server = setupServer(...handlers);

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('opens a saga missing from the catalog under its own name', async () => {
    const user = userEvent.setup();
    renderRails();

    await user.click(await screen.findByRole('link', { name: 'Voir la saga La saga Dune' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'La saga Dune' })
    ).toBeInTheDocument();
  });

  it('opens the similar films under the name of the film they start from', async () => {
    const user = userEvent.setup();
    renderRails();
    await screen.findByText('Dune : Deuxième partie');

    await user.click(await screen.findByRole('link', { name: 'Tout voir Films similaires' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Films similaires à Dune' })
    ).toBeInTheDocument();
  });
});
