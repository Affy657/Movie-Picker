import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import ShowcaseListPage, { type ShowcaseListVariant } from '@/app/pages/ShowcaseListPage';

const ACTION_GENRE = 28;
const DRAMA_GENRE = 18;

function item(index: number, genreId: number, rank?: number) {
  return {
    id: 2000 + index,
    mediaType: 'movie',
    title: `Film ${index}`,
    year: `${2000 + index}`,
    posterPath: null,
    voteAverage: 7,
    genreIds: [genreId],
    rank: rank ?? null,
    eventCount: rank != null ? 5 : null,
  };
}

const showcaseHandler = http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
  const section = new URL(request.url).searchParams.get('section') ?? 'trending';
  return HttpResponse.json({
    section,
    theme: null,
    items: [item(1, ACTION_GENRE), item(2, DRAMA_GENRE), item(3, ACTION_GENRE)],
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  });
});

function renderPage(variant: ShowcaseListVariant, entry: string, path: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={<ShowcaseListPage variant={variant} />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ShowcaseListPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le titre de la section et ses films', async () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('trending', '/films/tendances', '/films/tendances');

    expect(
      screen.getByRole('heading', { name: /tendances de la semaine/i, level: 1 })
    ).toBeInTheDocument();
    expect(await screen.findByText('Film 1')).toBeInTheDocument();
    expect(screen.getByText('Film 3')).toBeInTheDocument();
  });

  it('puts a hidden level-two heading above the grid', () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('trending', '/films/tendances', '/films/tendances');

    expect(
      screen.getByRole('heading', { name: /films de la sélection/i, level: 2 })
    ).toBeInTheDocument();
  });

  it('announces the filtered count and keeps only the retained films', async () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('trending', '/films/tendances', '/films/tendances');

    await screen.findByText('Film 1');
    await userEvent.type(screen.getByLabelText(/filtrer dans cette liste/i), 'Film 1');

    expect(await screen.findByText('1 films sur 3')).toBeInTheDocument();
    expect(screen.queryByText('Film 3')).not.toBeInTheDocument();
  });

  it('sorts by relevance by default', async () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('trending', '/films/tendances', '/films/tendances');

    await screen.findByText('Film 1');

    expect(screen.getByRole('button', { name: /pertinence/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('renvoie vers la home', () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('trending', '/films/tendances', '/films/tendances');

    expect(screen.getByRole('link', { name: /retour à l'accueil/i })).toHaveAttribute('href', '/');
  });

  it('signale une section en panne', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, () => HttpResponse.json({}, { status: 503 }))
    );
    renderPage('trending', '/films/tendances', '/films/tendances');

    expect(await screen.findByText(/momentanément indisponible/i)).toBeInTheDocument();
  });

  it('invites to type a title when the search is empty', () => {
    server.use(authMeGuestHandler);
    renderPage('search', '/films/recherche', '/films/recherche');

    expect(screen.getByText(/entrez un titre/i)).toBeInTheDocument();
  });

  it('shows the search results', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({
          items: [item(9, ACTION_GENRE)],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: '',
        })
      )
    );
    renderPage('search', '/films/recherche?q=dune', '/films/recherche');

    expect(
      screen.getByRole('heading', { name: /résultats pour « dune »/i, level: 1 })
    ).toBeInTheDocument();
    expect(await screen.findByText('Film 9')).toBeInTheDocument();
  });

  it('shows an empty state rather than a bare page when the section returns nothing', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, () =>
        HttpResponse.json({
          section: 'most-proposed',
          theme: null,
          items: [],
          disclaimer: '',
          tmdbAttributionUrl: '',
        })
      )
    );
    renderPage('most-proposed', '/films/les-plus-proposes', '/films/les-plus-proposes');

    expect(await screen.findByText(/aucun film dans cette sélection/i)).toBeInTheDocument();
  });

  it('reports an unknown selection and sends back to the home', () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('theme', '/films/theme/nawak', '/films/theme/:theme');

    expect(screen.getByText(/n’existe pas/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /retour à l'accueil/i }).length).toBeGreaterThan(0);
  });

  it('keeps the genre passed as a parameter and shows it as a subtitle', async () => {
    let requestedGenres: string | null = null;
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
        requestedGenres = new URL(request.url).searchParams.get('genreIds');
        return HttpResponse.json({
          section: 'trending',
          theme: null,
          items: [item(1, ACTION_GENRE)],
          disclaimer: '',
          tmdbAttributionUrl: '',
        });
      })
    );
    renderPage('trending', '/films/tendances?genre=35', '/films/tendances');

    expect(await screen.findByText('Film 1')).toBeInTheDocument();
    expect(requestedGenres).toBe('35');
    expect(screen.getByText('Comédie')).toBeInTheDocument();
  });

  it('affiche le rang sur le classement communautaire', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, () =>
        HttpResponse.json({
          section: 'most-proposed',
          theme: null,
          items: [item(1, DRAMA_GENRE, 1), item(2, DRAMA_GENRE, 2)],
          disclaimer: '',
          tmdbAttributionUrl: '',
        })
      )
    );
    renderPage('most-proposed', '/films/les-plus-proposes', '/films/les-plus-proposes');

    expect(await screen.findByText('Rang 1')).toBeInTheDocument();
    expect(screen.getByText('Rang 2')).toBeInTheDocument();
  });
});
