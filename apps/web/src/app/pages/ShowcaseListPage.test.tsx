import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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
import { stubHoverCapability } from '@/test-utils/matchMedia';
import {
  authMeGuestHandler,
  createSavedListsHandlers,
  createWatchedHandlers,
  TEST_API_V1,
} from '@/mocks/handlers';
import ShowcaseListPage, { type ShowcaseListVariant } from '@/app/pages/ShowcaseListPage';
import { MOVIE_PAGE_CHUNK } from '@/app/moviePageChunk';

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

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
    ratingScale: 'ten',
  })
);

const emptyWatchlistHandler = http.get(`${TEST_API_V1}/watchlist`, () =>
  HttpResponse.json({ items: [] })
);

const KEBAB_FILM_1 = /plus d.actions.*film 1/i;
const POSTER_FILM_1 = /voir les détails de « film 1 »/i;

const lastWatchedInceptionHandler = http.get(`${TEST_API_V1}/users/me/watched-movies`, () =>
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
);

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function FilmPageStub() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Retour
    </button>
  );
}

const longShowcaseHandler = http.get(`${TEST_API_V1}/movies/showcase`, () =>
  HttpResponse.json({
    section: 'trending',
    theme: null,
    items: Array.from({ length: 30 }, (_, index) => item(index + 1, ACTION_GENRE)),
    disclaimer: 'TMDB',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  })
);

function renderPageWithFilmPage() {
  return render(
    <AppTestProviders client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/films/tendances']}>
        <Routes>
          <Route path="/films/tendances" element={<ShowcaseListPage variant="trending" />} />
          <Route path="/film/:movieRef" element={<FilmPageStub />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

function renderPage(
  variant: ShowcaseListVariant,
  entry: InitialEntry,
  path: string,
  client = createTestQueryClient()
) {
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={<ShowcaseListPage variant={variant} />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ShowcaseListPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });
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

  it('asks for the recommendations of a series when the link names one', async () => {
    const requested: { seed: string | null; mediaType: string | null }[] = [];
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/movies/showcase`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requested.push({ seed: params.get('seedTmdbId'), mediaType: params.get('seedMediaType') });
        return HttpResponse.json({
          section: 'recommendations',
          theme: null,
          items: [item(1, DRAMA_GENRE)],
          disclaimer: '',
          tmdbAttributionUrl: '',
        });
      })
    );
    renderPage(
      'recommendations',
      '/films/similaires/1399?type=tv',
      '/films/similaires/:seedTmdbId'
    );

    expect(await screen.findByText('Film 1')).toBeInTheDocument();
    expect(requested).toEqual([{ seed: '1399', mediaType: 'tv' }]);
  });

  it('names the latest watched title as the seed when the link points at it', async () => {
    server.use(
      authedUserHandler,
      emptyWatchlistHandler,
      lastWatchedInceptionHandler,
      showcaseHandler
    );
    renderPage('recommendations', '/films/similaires/27205', '/films/similaires/:seedTmdbId');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Parce que vous avez aimé' })
    ).toBeInTheDocument();
    expect(await screen.findByText('Inception')).toBeInTheDocument();
  });

  it.each([
    ['another film', '/films/similaires/603', 'Films similaires'],
    ['the series sharing its id', '/films/similaires/27205?type=tv', 'Séries similaires'],
  ])(
    'titles the page neutrally when the link seeds %s rather than the latest watched title',
    async (_seed, entry, heading) => {
      const client = createTestQueryClient();
      server.use(
        authedUserHandler,
        emptyWatchlistHandler,
        lastWatchedInceptionHandler,
        showcaseHandler
      );
      renderPage('recommendations', entry, '/films/similaires/:seedTmdbId', client);

      await screen.findByText('Film 1');
      await waitFor(() =>
        expect(
          client
            .getQueryCache()
            .findAll({ queryKey: ['users', 'me', 'watched-movies'] })
            .map((query) => query.state.status)
        ).toEqual(['success'])
      );
      await act(async () => {});

      expect(screen.queryByText('Inception')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByText('Des titres dans le même esprit')).toBeInTheDocument();
    }
  );

  it('never speaks of a last night to a visitor who follows a deep link', async () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('recommendations', '/films/similaires/603', '/films/similaires/:seedTmdbId');

    await screen.findByText('Film 1');
    expect(screen.getByRole('heading', { level: 1, name: 'Films similaires' })).toBeInTheDocument();
    expect(screen.queryByText('Parce que vous avez aimé')).not.toBeInTheDocument();
    expect(screen.queryByText('À partir de votre dernière soirée')).not.toBeInTheDocument();
  });

  it('names the title the similar ones start from when the film page passes it', async () => {
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage(
      'recommendations',
      { pathname: '/films/similaires/1399', search: '?type=tv', state: { seedTitle: 'Arcane' } },
      '/films/similaires/:seedTmdbId'
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Séries similaires à Arcane' })
    ).toBeInTheDocument();
    expect(await screen.findByText('Film 1')).toBeInTheDocument();
  });

  it('titles a saga missing from the catalog with the name the film page passes', async () => {
    server.use(
      authMeGuestHandler,
      showcaseHandler,
      http.get(`${TEST_API_V1}/movies/collections`, () =>
        HttpResponse.json({ items: [], disclaimer: 'TMDB', tmdbAttributionUrl: '' })
      )
    );
    renderPage(
      'collection',
      { pathname: '/films/collection/726871', state: { collectionName: 'La saga Dune' } },
      '/films/collection/:collectionId'
    );

    expect(screen.getByRole('heading', { level: 1, name: 'La saga Dune' })).toBeInTheDocument();
    expect(await screen.findByText('Film 1')).toBeInTheDocument();
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

  it('hover, logged in: the poster offers the watchlist toggle and Proposer, no kebab', async () => {
    stubHoverCapability();
    server.use(authedUserHandler, emptyWatchlistHandler, showcaseHandler);
    renderPage('trending', '/films/tendances', '/films/tendances');

    const card = (await screen.findByText('Film 1')).closest('li') as HTMLElement;
    expect(screen.queryByRole('button', { name: KEBAB_FILM_1 })).not.toBeInTheDocument();
    expect(
      within(card)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))
    ).toEqual([
      'Voir les détails de « Film 1 »',
      'Ajouter « Film 1 » à ma liste',
      'Proposer « Film 1 » dans une soirée',
    ]);
  });

  it('hover, visitor: the poster offers no library action', async () => {
    stubHoverCapability();
    server.use(authMeGuestHandler, showcaseHandler);
    renderPage('trending', '/films/tendances', '/films/tendances');

    const card = (await screen.findByText('Film 1')).closest('li') as HTMLElement;
    expect(within(card).getAllByRole('button')).toEqual([
      within(card).getByRole('button', { name: POSTER_FILM_1 }),
    ]);
  });

  it('touch, logged in: no kebab, the poster opens the film page', async () => {
    server.use(authedUserHandler, emptyWatchlistHandler, showcaseHandler);
    renderPage('trending', '/films/tendances', '/films/tendances');

    await screen.findByText('Film 1');
    expect(screen.queryByRole('button', { name: /plus d.actions/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: POSTER_FILM_1 }));

    expect(screen.getByTestId('location')).toHaveTextContent('/film/2001-film-1');
  });

  it('comes back from a film page on the same sort and the same revealed films', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, longShowcaseHandler);
    renderPageWithFilmPage();

    await screen.findByText('Film 1');
    await user.click(screen.getByRole('button', { name: /titre/i }));
    await user.click(screen.getByRole('button', { name: /charger les 6 films restants/i }));
    await user.click(screen.getByRole('button', { name: /voir les détails de « film 30 »/i }));
    await user.click(await screen.findByRole('button', { name: 'Retour' }));

    expect(await screen.findByText('Film 30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /titre/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /films restants/i })).not.toBeInTheDocument();
  });

  it('comes back from a film page with the search still typed', async () => {
    const user = userEvent.setup();
    server.use(authMeGuestHandler, showcaseHandler);
    renderPageWithFilmPage();

    await screen.findByText('Film 1');
    await user.type(screen.getByLabelText(/filtrer dans cette liste/i), 'Film 3');
    await user.click(screen.getByRole('button', { name: /voir les détails de « film 3 »/i }));
    await user.click(await screen.findByRole('button', { name: 'Retour' }));

    expect(await screen.findByLabelText(/filtrer dans cette liste/i)).toHaveValue('Film 3');
    expect(screen.queryByText('Film 1')).not.toBeInTheDocument();
  });

  it('loads the film page code while the browser is idle', async () => {
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const loadMoviePage = vi.spyOn(MOVIE_PAGE_CHUNK, 'load').mockResolvedValue({} as never);
    server.use(authMeGuestHandler, showcaseHandler);

    renderPage('trending', '/films/tendances', '/films/tendances');

    expect(await screen.findByText('Film 1')).toBeInTheDocument();
    expect(loadMoviePage).toHaveBeenCalled();
  });

  describe('saving a saga or a selection in Mes listes', () => {
    const collectionsHandler = http.get(`${TEST_API_V1}/movies/collections`, () =>
      HttpResponse.json({
        items: [{ id: 1241, name: 'Harry Potter - Saga', posterPath: null, movieCount: 3 }],
        disclaimer: 'TMDB',
        tmdbAttributionUrl: 'https://www.themoviedb.org/',
      })
    );
    const HARRY_POTTER = {
      id: 's1',
      sourceType: 'tmdbCollection' as const,
      sourceId: '1241',
      name: 'Harry Potter',
    };

    function renderCollection() {
      return renderPage('collection', '/films/collection/1241', '/films/collection/:collectionId');
    }

    it('saves the saga from its header, then stops saving it, for a member', async () => {
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
      renderCollection();

      const save = await screen.findByRole('button', { name: 'Enregistrer dans Mes listes' });
      await waitFor(() => expect(save).toBeEnabled());
      expect(save).not.toHaveAttribute('aria-pressed');

      await user.click(save);

      const savedButton = await screen.findByRole('button', { name: 'Enregistrée' });
      expect(savedButton).not.toHaveAttribute('aria-pressed');
      await waitFor(() =>
        expect(saved).toEqual({ sourceType: 'tmdbCollection', sourceId: '1241' })
      );

      await user.click(savedButton);

      expect(
        await screen.findByRole('button', { name: 'Enregistrer dans Mes listes' })
      ).not.toHaveAttribute('aria-pressed');
    });

    it('shows a selection already saved as Enregistrée', async () => {
      server.use(
        authedUserHandler,
        emptyWatchlistHandler,
        showcaseHandler,
        ...createSavedListsHandlers([
          { id: 's2', sourceType: 'explorerTheme', sourceId: 'frissons', name: 'frissons' },
        ]),
        ...createWatchedHandlers()
      );
      renderPage('theme', '/films/theme/frissons', '/films/theme/:theme');

      expect(await screen.findByRole('button', { name: 'Enregistrée' })).not.toHaveAttribute(
        'aria-pressed'
      );
    });

    it('offers no saving to a visitor', async () => {
      server.use(authMeGuestHandler, showcaseHandler, collectionsHandler);
      renderCollection();

      await screen.findByText('Film 1');
      expect(screen.queryByRole('button', { name: /enregistr/i })).toBeNull();
      expect(screen.queryByRole('switch', { name: 'Griser les vus' })).toBeNull();
    });

    it('offers no saving, progress nor dimming on the other sections', async () => {
      server.use(
        authedUserHandler,
        emptyWatchlistHandler,
        showcaseHandler,
        ...createWatchedHandlers([{ tmdbId: 2001, title: 'Film 1', source: 'night' }])
      );
      renderPage('trending', '/films/tendances', '/films/tendances');

      await screen.findByText('Film 1');
      expect(screen.queryByRole('button', { name: /enregistr/i })).toBeNull();
      expect(screen.queryByText(/sur 3 vu/)).toBeNull();
      expect(screen.queryByRole('switch', { name: 'Griser les vus' })).toBeNull();
    });

    it('shows how much of the saga the member has watched and dims the watched films', async () => {
      server.use(
        authedUserHandler,
        emptyWatchlistHandler,
        showcaseHandler,
        collectionsHandler,
        http.patch(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({
            userId: 'u1',
            displayName: 'Alice',
            emailMasked: 'a***@test.local',
            uiTheme: 'system',
            accentColor: 'default',
            ratingScale: 'ten',
            dimWatched: true,
          })
        ),
        ...createSavedListsHandlers(),
        ...createWatchedHandlers([{ tmdbId: 2001, title: 'Film 1', source: 'night' }])
      );
      const user = userEvent.setup();
      renderCollection();

      expect(
        await screen.findByText(
          (_, element) =>
            element?.lastElementChild?.tagName === 'STRONG' &&
            (element.textContent ?? '').replaceAll(/\p{Zs}/gu, ' ') === '1 sur 3 vu, 33 %'
        )
      ).toBeInTheDocument();

      await user.click(screen.getByRole('switch', { name: 'Griser les vus' }));

      expect(
        await screen.findByRole('button', { name: 'Voir les détails de « Film 1 », déjà vu' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Voir les détails de « Film 2 »' })
      ).toBeInTheDocument();
    });
  });
});
