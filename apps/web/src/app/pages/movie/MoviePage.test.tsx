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
import {
  authMeGuestHandler,
  createListsHandlers,
  createWatchedHandlers,
  TEST_API_V1,
  type MockWatchedMovie,
} from '@/mocks/handlers';
import { stubMatchMedia } from '@/test-utils/matchMedia';
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

const DUNE_SEEN_ELSEWHERE: MockWatchedMovie = {
  tmdbId: 438631,
  title: 'Dune',
  year: '2021',
  source: 'elsewhere',
  myRating: 8,
};

function signedInWith(watched: MockWatchedMovie[] = []) {
  return [
    signedInHandler,
    watchlistHandler,
    detailsHandler,
    showcaseHandler,
    nightsHandler({}),
    ...createListsHandlers(),
    ...createWatchedHandlers(watched),
  ];
}

function inDocumentOrder(elements: HTMLElement[]): boolean {
  return elements.every(
    (element, index) =>
      index === 0 ||
      !!(elements[index - 1]!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
  );
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

    const title = await screen.findByRole('heading', { level: 1, name: 'Dune' });
    expect(screen.queryByText(/titre original/i)).not.toBeInTheDocument();
    expect(within(title.closest('header')!).getByText('2021')).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Je l’ai vu' })).toBeNull();
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
    expect(screen.getByRole('button', { name: 'À voir' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /ajouter à une liste/i })).toBeInTheDocument();
  });

  it('adds the film to a created list from the lists menu next to À voir', async () => {
    server.use(
      signedInHandler,
      watchlistHandler,
      detailsHandler,
      showcaseHandler,
      nightsHandler({}),
      ...createListsHandlers([{ id: 'l1', name: 'Science-fiction' }])
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /ajouter à une liste/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /science-fiction/i }));

    expect(await screen.findByRole('button', { name: /dans 1 liste/i })).toBeInTheDocument();
  });

  it('orders the actions for a phone: propose, À voir and seen, lists, then trailer and share', async () => {
    stubMatchMedia((query) => query.includes('max-width'));
    server.use(...signedInWith());
    renderPage();

    await screen.findByRole('button', { name: /ajouter à une liste/i });
    await screen.findByRole('button', { name: 'Je l’ai vu' });
    const buttons = [
      /proposer dans une soirée/i,
      /^à voir$/i,
      /^je l’ai vu$/i,
      /ajouter à une liste/i,
      /^bande-annonce$/i,
      /^partager$/i,
    ].map((name) => screen.getByRole('button', { name }));
    expect(inDocumentOrder(buttons)).toBe(true);
    vi.unstubAllGlobals();
  });

  it('orders the actions for a computer: propose, trailer, share, then lists, À voir and seen', async () => {
    server.use(...signedInWith());
    renderPage();

    await screen.findByRole('button', { name: 'Je l’ai vu' });
    const buttons = [
      /proposer dans une soirée/i,
      /^bande-annonce$/i,
      /^partager$/i,
      /ajouter à une liste/i,
      /^à voir$/i,
      /^je l’ai vu$/i,
    ].map((name) => screen.getByRole('button', { name }));
    expect(inDocumentOrder(buttons)).toBe(true);
  });

  it('marks the film seen elsewhere, the button turning to Vu and the rating showing up', async () => {
    let marked: Record<string, unknown> | null = null;
    const statusNow = () => ({
      status: marked ? 'elsewhere' : 'none',
      watchedAt: marked ? '2026-11-13T10:00:00Z' : null,
      rating: null,
      nightSlug: null,
      nightTitle: null,
    });
    server.use(
      http.post(`${TEST_API_V1}/watched`, async ({ request }) => {
        marked = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(statusNow());
      }),
      http.get(`${TEST_API_V1}/watched/:tmdbId`, () => HttpResponse.json(statusNow())),
      ...signedInWith()
    );
    const user = userEvent.setup();
    renderPage();

    const seen = await screen.findByRole('button', { name: 'Je l’ai vu' });
    expect(seen).not.toHaveAttribute('aria-pressed');
    expect(screen.queryByText('Votre note')).toBeNull();

    await user.click(seen);

    expect(await screen.findByRole('button', { name: 'Vu' })).not.toHaveAttribute('aria-pressed');
    expect(screen.getByRole('group', { name: 'Votre note' })).toBeInTheDocument();
    await waitFor(() =>
      expect(marked).toMatchObject({ tmdbId: 438631, mediaType: 'movie', title: 'Dune' })
    );
  });

  it('takes back the seen elsewhere mark at once from Vu', async () => {
    server.use(
      http.delete(`${TEST_API_V1}/watched/:tmdbId`, () => new Promise<never>(() => undefined)),
      ...signedInWith([DUNE_SEEN_ELSEWHERE])
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Vu' }));

    expect(await screen.findByRole('button', { name: 'Je l’ai vu' })).not.toHaveAttribute(
      'aria-pressed'
    );
    expect(screen.queryByRole('group', { name: 'Votre note' })).toBeNull();
  });

  it('rates a film seen elsewhere next to the TMDB score, in the scale of the reader', async () => {
    let rated: unknown = null;
    const statusNow = () => ({
      status: 'elsewhere',
      watchedAt: '2026-11-01T20:00:00Z',
      rating: rated ? 6 : 8,
      nightSlug: null,
      nightTitle: null,
    });
    server.use(
      http.put(`${TEST_API_V1}/watched/:tmdbId/rating`, async ({ request }) => {
        rated = await request.json();
        return HttpResponse.json(statusNow());
      }),
      http.get(`${TEST_API_V1}/watched/:tmdbId`, () => HttpResponse.json(statusNow())),
      ...signedInWith([DUNE_SEEN_ELSEWHERE])
    );
    const user = userEvent.setup();
    renderPage();

    const stars = await screen.findByRole('group', { name: 'Votre note' });
    expect(screen.getByText('8/10')).toBeInTheDocument();

    await user.click(within(stars).getByRole('button', { name: 'Noter 3 étoiles' }));

    await waitFor(() => expect(rated).toEqual({ value: 6 }));
    expect(await screen.findByText('6/10')).toBeInTheDocument();
  });

  it('clears the rating of a film seen elsewhere, the way a night rating is cleared', async () => {
    let cleared: unknown = null;
    const statusNow = () => ({
      status: 'elsewhere',
      watchedAt: '2026-11-01T20:00:00Z',
      rating: cleared ? null : 8,
      nightSlug: null,
      nightTitle: null,
    });
    server.use(
      http.put(`${TEST_API_V1}/watched/:tmdbId/rating`, async ({ request }) => {
        cleared = await request.json();
        return HttpResponse.json(statusNow());
      }),
      http.get(`${TEST_API_V1}/watched/:tmdbId`, () => HttpResponse.json(statusNow())),
      ...signedInWith([DUNE_SEEN_ELSEWHERE])
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('8/10')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Effacer' }));

    await waitFor(() => expect(cleared).toEqual({ value: null }));
    await waitFor(() => expect(screen.queryByText('8/10')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Effacer' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Votre note' })).toBeInTheDocument();
  });

  it('offers no way to clear a rating that was never given', async () => {
    server.use(...signedInWith([{ ...DUNE_SEEN_ELSEWHERE, myRating: null }]));
    renderPage();

    expect(await screen.findByRole('group', { name: 'Votre note' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Effacer' })).toBeNull();
  });

  it('tells a film seen at a night instead of the button, its night rating read only', async () => {
    server.use(
      ...signedInWith([
        {
          tmdbId: 438631,
          title: 'Dune',
          source: 'night',
          myRating: 8,
          watchedAt: '2026-10-12T20:00:00Z',
          nightSlug: 'Ab3x',
          nightTitle: 'Ciné-club',
        },
      ])
    );
    renderPage();

    const night = await screen.findByRole('link', { name: /^vu en soirée le 12 oct\./i });
    expect(night).toHaveAttribute('href', '/e/Ab3x');
    expect(screen.queryByRole('button', { name: /^(vu|je l’ai vu)$/i })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Votre note' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Votre note de soirée : 8/10' })).toBeInTheDocument();
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
      nightsHandler({}),
      ...createWatchedHandlers()
    );
    renderPage();

    expect(await screen.findByRole('button', { name: 'À voir' })).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'Je l’ai vu' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /ajouter à une liste/i })).toBeDisabled();
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
    await userEvent.click(await screen.findByRole('button', { name: 'À voir' }));

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

  describe('favorite', () => {
    const HEAT = { tmdbId: 949, mediaType: 'movie', title: 'Heat', year: '1995', posterPath: null };
    const ALIEN = {
      tmdbId: 348,
      mediaType: 'movie',
      title: 'Alien',
      year: '1979',
      posterPath: null,
    };
    const AKIRA = {
      tmdbId: 149,
      mediaType: 'movie',
      title: 'Akira',
      year: '1988',
      posterPath: null,
    };
    const DUNE = { tmdbId: 438631, mediaType: 'movie', title: 'Dune', year: '2021' };
    type Favorite = typeof HEAT;

    function favoritesServer(initial: Favorite[]) {
      let favorites = [...initial];
      const calls: string[] = [];
      const handlers = [
        http.get(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({
            userId: 'u1',
            displayName: 'Alice',
            emailMasked: 'a***@test.local',
            uiTheme: 'system',
            accentColor: 'default',
            ratingScale: 'ten',
            favorites,
          })
        ),
        http.post(`${TEST_API_V1}/users/me/favorites`, async ({ request }) => {
          const body = (await request.json()) as Favorite;
          calls.push(`add ${body.tmdbId}`);
          favorites = [...favorites, { ...body, posterPath: body.posterPath ?? null }];
          return HttpResponse.json({ items: favorites });
        }),
        http.delete(`${TEST_API_V1}/users/me/favorites/:tmdbId`, ({ params }) => {
          calls.push(`remove ${String(params.tmdbId)}`);
          favorites = favorites.filter((favorite) => String(favorite.tmdbId) !== params.tmdbId);
          return HttpResponse.json({ items: favorites });
        }),
      ];
      return { handlers, calls };
    }

    it('adds the film to the profile favorites, then takes it out', async () => {
      const user = userEvent.setup();
      const { handlers, calls } = favoritesServer([HEAT]);
      server.use(...handlers, ...signedInWith());
      renderPage();

      const toggle = await screen.findByRole('button', { name: 'Favori' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await user.click(toggle);
      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'));

      await user.click(toggle);
      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'));
      expect(calls).toEqual([`add ${DUNE.tmdbId}`, `remove ${DUNE.tmdbId}`]);
    });

    it('asks which favorite to replace once the three places are taken', async () => {
      const user = userEvent.setup();
      const { handlers, calls } = favoritesServer([HEAT, ALIEN, AKIRA]);
      server.use(...handlers, ...signedInWith());
      renderPage();

      const toggle = await screen.findByRole('button', { name: 'Favori' });
      await user.click(toggle);

      const dialog = await screen.findByRole('dialog', { name: 'Remplacer un favori' });
      expect(
        within(dialog).getByText('Vos trois favoris sont choisis. Lequel laisse sa place à Dune ?')
      ).toBeInTheDocument();
      const replace = within(dialog).getByRole('button', { name: 'Remplacer' });
      expect(replace).toBeDisabled();
      await user.click(within(dialog).getByRole('radio', { name: /Alien/ }));
      await user.click(replace);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(calls).toEqual([`remove ${ALIEN.tmdbId}`, `add ${DUNE.tmdbId}`]);
    });

    it('keeps the three favorites when the choice is cancelled', async () => {
      const user = userEvent.setup();
      const { handlers, calls } = favoritesServer([HEAT, ALIEN, AKIRA]);
      server.use(...handlers, ...signedInWith());
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Favori' }));
      const dialog = await screen.findByRole('dialog', { name: 'Remplacer un favori' });
      await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(calls).toEqual([]);
    });
  });
});
