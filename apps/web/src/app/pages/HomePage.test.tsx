import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import HomePage from '@/app/pages/HomePage';

function showcaseItems(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: 1000 + index,
    mediaType: 'movie',
    title: `${prefix} ${index + 1}`,
    year: '2024',
    posterPath: null,
    voteAverage: 7.5,
    genreIds: [18],
  }));
}

const showcaseHandler = http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
  const section = new URL(request.url).searchParams.get('section') ?? 'trending';
  return HttpResponse.json({
    section,
    theme: new URL(request.url).searchParams.get('theme'),
    items: showcaseItems(section, 3),
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  });
});

const collectionsHandler = http.get(`${TEST_API_V1}/movies/collections`, () =>
  HttpResponse.json({
    items: [{ id: 10, name: 'Star Wars', overview: null, posterPath: null, movieCount: 9 }],
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  })
);

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    handle: 'alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
  })
);

const personalHandlers = [
  http.get(`${TEST_API_V1}/watchlist`, () =>
    HttpResponse.json({
      items: [
        {
          tmdbId: 501,
          mediaType: 'movie',
          title: 'Film de ma liste',
          year: '2021',
          posterPath: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
  ),
  http.get(`${TEST_API_V1}/users/me/following-watched-movies`, () =>
    HttpResponse.json({
      items: [
        {
          tmdbId: 502,
          mediaType: 'movie',
          title: "Film d'un ami",
          year: '2019',
          posterPath: null,
          genreIds: [18],
          watchedAt: '2026-02-01T00:00:00Z',
        },
      ],
    })
  ),
  http.get(`${TEST_API_V1}/users/me/watched-movies`, () =>
    HttpResponse.json({
      items: [
        {
          tmdbId: 27205,
          mediaType: 'movie',
          title: 'Inception',
          year: '2010',
          posterPath: null,
          genreIds: [28],
          watchedAt: '2026-03-01T00:00:00Z',
        },
      ],
    })
  ),
];

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/films/recherche" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('HomePage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('ouvre sur un titre de niveau un et son introduction', () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(
      screen.getByRole('heading', { name: /on regarde ce soir/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/parcourez les sélections/i)).toBeInTheDocument();
  });

  it('aligne les rangées sur un seul niveau de titre sous le h1', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: /tendances de la semaine/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /actuellement au cinéma/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /sagas et collections/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });

  it('masque une rangée vide au lieu de laisser un titre orphelin', async () => {
    server.use(
      authMeGuestHandler,
      collectionsHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
        const section = new URL(request.url).searchParams.get('section') ?? 'trending';
        return HttpResponse.json({
          section,
          theme: null,
          items: section === 'most-proposed' ? [] : showcaseItems(section, 3),
          disclaimer: '',
          tmdbAttributionUrl: '',
        });
      })
    );
    renderPage();

    await screen.findByRole('heading', { name: /tendances de la semaine/i, level: 2 });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /les plus proposés/i })).not.toBeInTheDocument();
    });
  });

  it('affiche les pastilles de genre en onglets', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    const tablist = await screen.findByRole('tablist', { name: /genre/i });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs[0]).toHaveAccessibleName(/tous/i);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('mène la recherche vers la page résultats', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    await userEvent.type(screen.getByLabelText(/chercher un film/i), 'dune');
    await userEvent.click(screen.getByRole('button', { name: /^chercher$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/films/recherche?q=dune');
    });
  });

  it('lance une recherche depuis un exemple proposé', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Dune' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/films/recherche?q=Dune');
    });
  });

  it('expose la rangée streaming avec ses plateformes', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: /ce soir en streaming/i, level: 2 })
    ).toBeInTheDocument();
    const tablist = screen.getByRole('tablist', { name: /plateforme/i });
    expect(within(tablist).getByRole('tab', { name: 'Netflix' })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: 'Disney+' })).toBeInTheDocument();
  });

  it('ne montre aucune rangée personnelle à un visiteur', async () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    await screen.findByRole('heading', { name: /tendances de la semaine/i, level: 2 });
    expect(screen.queryByRole('heading', { name: /dans votre liste/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /vos amis ont vu/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /parce que vous avez aimé/i })
    ).not.toBeInTheDocument();
  });

  it('ajoute les rangées personnelles à un utilisateur connecté', async () => {
    server.use(authedUserHandler, showcaseHandler, collectionsHandler, ...personalHandlers);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: /dans votre liste/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /vos amis ont vu/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /parce que vous avez aimé/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /prochaine soirée/i })).not.toBeInTheDocument();
  });

  it('mène à la création de soirée depuis la bande de bas de page', () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(screen.getByRole('link', { name: /créer une soirée/i })).toHaveAttribute('href', '/new');
  });

  it('déclare une canonique sur la racine', () => {
    server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
    renderPage();

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://web.movie-picker.fr/'
    );
  });

  it('signale une section en panne sans casser la page', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, () => HttpResponse.json({}, { status: 503 })),
      collectionsHandler
    );
    renderPage();

    expect((await screen.findAllByText(/momentanément indisponible/i)).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: /on regarde ce soir/i, level: 1 })
    ).toBeInTheDocument();
  });
});
