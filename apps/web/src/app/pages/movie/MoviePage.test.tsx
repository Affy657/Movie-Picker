import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  type InitialEntry,
} from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import MoviePage from '@/app/pages/movie/MoviePage';

vi.mock('@/features/events/components/MovieNightBar', () => ({
  default: ({ slug, onRemoved }: { slug: string; onRemoved: () => void }) => (
    <div>
      <p>Barre de la soirée {slug}</p>
      <button type="button" onClick={onRemoved}>
        Film retiré de la soirée
      </button>
    </div>
  ),
}));

const LONG_OVERVIEW =
  'Paul Atréides suit sa famille sur Arrakis, une planète de sable d’où vient l’épice.';

const dune = {
  tmdbId: 438631,
  mediaType: 'movie',
  title: 'Dune',
  overview: LONG_OVERVIEW,
  tagline: null,
  director: 'Denis Villeneuve',
  cast: ['Timothée Chalamet'],
  runtimeMinutes: 155,
  genres: ['Science-Fiction', 'Aventure'],
  releaseDate: '2021-09-15',
  trailerUrl: null,
  voteAverage: 7.8,
  posterPath: null,
  backdropPath: null,
  seasonCount: null,
  episodeCount: null,
  watchProviders: [
    { providerId: 1899, name: 'Max', logoPath: null, type: 'flatrate' },
    { providerId: 2, name: 'Apple TV', logoPath: null, type: 'rent' },
  ],
  tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/438631/watch?locale=FR',
  originalTitle: 'Dune',
  originalLanguage: 'en',
  productionCountries: ['US', 'CA'],
  budget: 165000000,
  voteCount: 12000,
  certification: 'U',
  collection: { id: 726871, name: 'La saga Dune' },
  directorId: 137427,
  castMembers: [
    { name: 'Timothée Chalamet', character: 'Paul Atréides', profilePath: null },
    { name: 'Zendaya', character: 'Chani', profilePath: null },
  ],
  crew: [
    { job: 'director', name: 'Denis Villeneuve' },
    { job: 'composer', name: 'Hans Zimmer' },
  ],
  videos: [
    { key: 'n9xhJrPXop4', name: 'Bande-annonce officielle', type: 'Trailer', language: 'fr' },
  ],
};

const detailsHandler = http.get(`${TEST_API_V1}/movies/tmdb/438631/details`, () =>
  HttpResponse.json(dune)
);

const pendingDetailsHandler = http.get(`${TEST_API_V1}/movies/tmdb/438631/details`, async () => {
  await new Promise(() => undefined);
  return HttpResponse.json(dune);
});

const duneSeedEntry: InitialEntry = {
  pathname: '/film/438631-dune',
  state: { fromApp: true, seed: { tmdbId: 438631, mediaType: 'movie', title: 'Dune' } },
};

const showcaseHandler = http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
  const section = new URL(request.url).searchParams.get('section');
  const items =
    section === 'collection'
      ? [
          { id: 438631, mediaType: 'movie', title: 'Dune', year: '2021', posterPath: null },
          {
            id: 693134,
            mediaType: 'movie',
            title: 'Dune : Deuxième partie',
            year: '2024',
            posterPath: null,
          },
        ]
      : [
          {
            id: 329865,
            mediaType: 'movie',
            title: `Film ${section}`,
            year: '2016',
            posterPath: null,
          },
        ];
  return HttpResponse.json({ section, theme: null, items, disclaimer: '', tmdbAttributionUrl: '' });
});

const signedInHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
    ratingScale: 'ten',
  })
);

const watchlistHandler = http.get(`${TEST_API_V1}/watchlist`, () =>
  HttpResponse.json({ items: [] })
);

function nightsHandler(body: object) {
  return http.get(`${TEST_API_V1}/movies/tmdb/438631/nights`, () => HttpResponse.json(body));
}

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Page précédente du navigateur
      </button>
    </>
  );
}

function renderPage(entries: InitialEntry | InitialEntry[] = '/film/438631-dune') {
  const initialEntries = Array.isArray(entries) ? entries : [entries];
  return render(
    <AppTestProviders client={createTestQueryClient()}>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
        <Routes>
          <Route path="/film/:movieRef" element={<MoviePage mediaType="movie" />} />
          <Route path="/serie/:movieRef" element={<MoviePage mediaType="tv" />} />
          <Route path="*" element={null} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('MoviePage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('shows the film with its facts, scores and where to watch it', async () => {
    server.use(authMeGuestHandler, detailsHandler, showcaseHandler);
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Dune' })).toBeInTheDocument();
    expect(screen.queryByText(/titre original/i)).not.toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getAllByText('Tous publics')).toHaveLength(2);
    expect(screen.getByText('12 000 votes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /max/i })).toHaveAttribute(
      'href',
      'https://www.themoviedb.org/movie/438631/watch?locale=FR'
    );
    expect(screen.getByRole('link', { name: 'Location et achat' })).toBeInTheDocument();
  });

  it('lays out the synopsis, videos, cast, crew and details', async () => {
    server.use(authMeGuestHandler, detailsHandler, showcaseHandler);
    renderPage();

    expect(await screen.findByText(LONG_OVERVIEW)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Lire « Bande-annonce officielle »' })
    ).toBeInTheDocument();
    expect(screen.getByText('Chani')).toBeInTheDocument();
    const crew = screen.getByRole('region', { name: 'Équipe' });
    expect(within(crew).getByText('Musique')).toBeInTheDocument();
    expect(within(crew).getByText('Hans Zimmer')).toBeInTheDocument();
    const infos = screen.getByRole('region', { name: 'Infos' });
    expect(within(infos).getByText('Anglais')).toBeInTheDocument();
    expect(within(infos).getByText('États-Unis, Canada')).toBeInTheDocument();
    expect(within(infos).getByText('Tous publics')).toBeInTheDocument();
  });

  it('shows the saga with this film marked, the director and similar films', async () => {
    server.use(authMeGuestHandler, detailsHandler, showcaseHandler);
    renderPage();

    const saga = await screen.findByRole('region', { name: 'La saga Dune' });
    expect(within(saga).getByText('Ce film')).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: 'Du même réalisateur, Denis Villeneuve' })
    ).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Films similaires' })).toBeInTheDocument();
  });

  it('asks a guest to sign in to see the film in their nights', async () => {
    server.use(authMeGuestHandler, detailsHandler, showcaseHandler);
    renderPage();

    const nights = await screen.findByRole('region', { name: 'Dans vos soirées' });
    expect(within(nights).getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent('/film/438631-dune')}`
    );
    expect(screen.queryByRole('button', { name: /proposer dans une soirée/i })).toBeNull();
  });

  it('tells a signed in member how the film did in their nights', async () => {
    server.use(
      signedInHandler,
      watchlistHandler,
      detailsHandler,
      showcaseHandler,
      nightsHandler({
        nights: [
          {
            slug: 'Ab3x',
            title: 'Ciné-club du mercredi',
            date: '2026-09-13',
            isWinner: true,
            isFinished: true,
            recapSlug: 'r7Kq',
            proposerPseudo: 'Léa',
          },
        ],
        proposalCount: 2,
        winCount: 1,
        rating: { average: 8.4, count: 6 },
        seenBy: [
          { pseudo: 'Léa', avatarId: null },
          { pseudo: 'Hugo', avatarId: null },
        ],
        seenCount: 4,
      })
    );
    renderPage();

    expect(await screen.findByText('Proposé dans 2 soirées')).toBeInTheDocument();
    const nights = screen.getByRole('region', { name: 'Dans vos soirées' });
    expect(
      within(nights).getByRole('link', { name: /gagnant à ciné-club du mercredi/i })
    ).toHaveAttribute('href', '/e/Ab3x');
    expect(within(nights).getByRole('link', { name: 'Voir le récap' })).toHaveAttribute(
      'href',
      '/r/r7Kq'
    );
    expect(
      within(nights).getByText('Noté 8,4/10 par 6 personnes après la séance')
    ).toBeInTheDocument();
    expect(within(nights).getByText('Vu par Léa, Hugo et 2 autres')).toBeInTheDocument();
    expect(screen.getByText('Vos soirées')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proposer dans une soirée/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ajouter à ma liste/i })).toBeInTheDocument();
  });

  it('opens the night bar instead of the propose button when coming from a night', async () => {
    server.use(
      signedInHandler,
      watchlistHandler,
      detailsHandler,
      showcaseHandler,
      nightsHandler({})
    );
    renderPage('/film/438631-dune?soiree=Ab3x');

    expect(await screen.findByText('Barre de la soirée Ab3x')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Dune' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /proposer dans une soirée/i })).toBeNull();
  });

  it('says so when the film does not exist', async () => {
    server.use(
      authMeGuestHandler,
      http.get(
        `${TEST_API_V1}/movies/tmdb/438631/details`,
        () => new HttpResponse(null, { status: 404 })
      )
    );
    renderPage();

    expect(await screen.findByText('Film introuvable')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toContain('Film introuvable'));
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/');
  });

  it('speaks of a series when the series does not exist', async () => {
    server.use(
      authMeGuestHandler,
      http.get(
        `${TEST_API_V1}/movies/tmdb/1399/details`,
        () => new HttpResponse(null, { status: 404 })
      )
    );
    renderPage('/serie/1399');

    expect(await screen.findByText('Série introuvable')).toBeInTheDocument();
    expect(
      screen.getByText('Cette série n’existe pas ou n’est plus disponible.')
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toContain('Série introuvable'));
  });

  it('holds the title, the synopsis and the actions while a deep link loads', async () => {
    server.use(
      signedInHandler,
      watchlistHandler,
      pendingDetailsHandler,
      showcaseHandler,
      nightsHandler({})
    );
    renderPage();

    expect(await screen.findByRole('button', { name: /ajouter à ma liste/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /proposer dans une soirée/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Partager' })).toBeDisabled();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Chargement du film…' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Pas encore de synopsis pour ce film.')).toBeNull();
  });

  it('shows similar films without waiting for the details', async () => {
    server.use(authMeGuestHandler, pendingDetailsHandler, showcaseHandler);
    renderPage();

    expect(await screen.findByRole('region', { name: 'Films similaires' })).toBeInTheDocument();
  });

  it('keeps the film it was opened with and offers to retry when its details fail', async () => {
    let calls = 0;
    server.use(
      authMeGuestHandler,
      showcaseHandler,
      http.get(`${TEST_API_V1}/movies/tmdb/438631/details`, () => {
        calls += 1;
        return calls === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(dune);
      })
    );
    renderPage(duneSeedEntry);

    expect(screen.getByRole('heading', { level: 1, name: 'Dune' })).toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Impossible de charger ce film.');

    await userEvent.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText(LONG_OVERVIEW)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says when the film could not be added to the list', async () => {
    server.use(
      signedInHandler,
      watchlistHandler,
      detailsHandler,
      showcaseHandler,
      nightsHandler({}),
      http.post(`${TEST_API_V1}/watchlist`, () =>
        HttpResponse.json({ message: 'Ajout refusé' }, { status: 400 })
      )
    );
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Dune' });
    await userEvent.click(await screen.findByRole('button', { name: /ajouter à ma liste/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('steps back to the night after removing the film from it', async () => {
    server.use(
      signedInHandler,
      watchlistHandler,
      detailsHandler,
      showcaseHandler,
      nightsHandler({})
    );
    renderPage([
      '/',
      '/e/Ab3x',
      { pathname: '/film/438631-dune', search: '?soiree=Ab3x', state: { fromApp: true } },
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Film retiré de la soirée' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/e/Ab3x');

    await userEvent.click(screen.getByRole('button', { name: 'Page précédente du navigateur' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('leaves the film for its night when it was opened from outside the app', async () => {
    server.use(
      signedInHandler,
      watchlistHandler,
      detailsHandler,
      showcaseHandler,
      nightsHandler({})
    );
    renderPage(['/', '/film/438631-dune?soiree=Ab3x']);

    await userEvent.click(await screen.findByRole('button', { name: 'Film retiré de la soirée' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/e/Ab3x');

    await userEvent.click(screen.getByRole('button', { name: 'Page précédente du navigateur' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('treats an address without an id as a missing page', () => {
    server.use(authMeGuestHandler);
    renderPage('/film/dune');

    expect(screen.getByRole('heading', { name: /page introuvable/i })).toBeInTheDocument();
  });

  it('goes back home when the page was opened from outside the app', async () => {
    server.use(authMeGuestHandler, detailsHandler, showcaseHandler);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retour' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
