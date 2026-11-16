import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import {
  createListsHandlers,
  createSavedListsHandlers,
  createWatchedHandlers,
  createWatchlistHandlers,
  TEST_API_V1,
  type MockList,
  type MockSavedList,
  type MockWatchedMovie,
} from '@/mocks/handlers';
import MyListsPage from './MyListsPage';

function authedUser(extra: Record<string, unknown> = {}) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
      userId: 'u1',
      displayName: 'Alice',
      emailMasked: 'a***@test.local',
      uiTheme: 'system',
      accentColor: 'default',
      ratingScale: 'ten',
      ...extra,
    })
  );
}

function film(tmdbId: number, title: string, posterPath: string | null = null) {
  return {
    tmdbId,
    mediaType: 'movie' as const,
    title,
    year: '2020',
    posterPath,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

const WATCHLIST = [film(1, 'Alien', '/alien.jpg'), film(2, 'Heat', '/heat.jpg')];

const WATCHED: MockWatchedMovie[] = [
  { tmdbId: 10, title: 'Scream', posterPath: '/scream.jpg', source: 'night' },
  { tmdbId: 11, title: 'Brazil', posterPath: '/brazil.jpg', source: 'elsewhere' },
];

const LISTS: MockList[] = [
  {
    id: 'l1',
    name: 'Halloween',
    items: [{ ...film(10, 'Scream', '/scream.jpg'), isWatched: true }],
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'l2',
    name: 'Films cultes',
    items: [{ ...film(11, 'Brazil'), isWatched: true }, film(12, 'Akira'), film(13, 'Ran')],
    updatedAt: '2026-11-01T00:00:00Z',
  },
  { id: 'l3', name: 'Ghibli', items: [], updatedAt: '2026-09-01T00:00:00Z' },
];

const SEVEN_LISTS: MockList[] = [
  ...LISTS,
  { id: 'l4', name: 'Westerns', items: [film(30, 'Rio Bravo')], updatedAt: '2026-08-01T00:00:00Z' },
  {
    id: 'l5',
    name: 'Comédies',
    items: [film(31, 'Tootsie'), film(32, 'Big')],
    updatedAt: '2026-07-01T00:00:00Z',
  },
  { id: 'l6', name: 'Anime', items: [], updatedAt: '2026-06-01T00:00:00Z' },
  {
    id: 'l7',
    name: 'Polars',
    items: [{ ...film(33, 'Heat'), isWatched: true }],
    updatedAt: '2026-05-01T00:00:00Z',
  },
];

const HARRY_POTTER: MockSavedList = {
  id: 's1',
  sourceType: 'tmdbCollection',
  sourceId: '1241',
  name: 'Harry Potter - Saga',
  createdAt: '2026-10-15T00:00:00Z',
  items: [
    { ...film(671, 'Harry Potter 1', '/hp1.jpg'), isWatched: true },
    { ...film(672, 'Harry Potter 2', '/hp2.jpg'), isWatched: true },
    film(673, 'Harry Potter 3', '/hp3.jpg'),
  ],
};

const FRISSONS: MockSavedList = {
  id: 's2',
  sourceType: 'explorerTheme',
  sourceId: 'frissons',
  name: 'frissons',
  createdAt: '2026-11-10T00:00:00Z',
  items: [film(694, 'Shining', '/shining.jpg')],
};

const FRISSONS_LABEL = "Frissons d'automne";

const KOREAN: MockSavedList = {
  id: 's3',
  sourceType: 'memberList',
  sourceId: 'l9',
  name: 'Ciné coréen',
  creator: { handle: 'alice2', displayName: 'Alice Martin', avatarId: null },
  createdAt: '2026-11-12T00:00:00Z',
  items: [film(500, 'Old Boy', '/oldboy.jpg')],
};

const ALICE = { userId: 'u1', handle: 'alice', displayName: 'Alice', avatarId: null };
const LEA = { userId: 'u2', handle: 'lea', displayName: 'Léa Moreau', avatarId: null };
const TOM = { userId: 'u3', handle: 'tom', displayName: 'Tom', avatarId: null };

function fullServer(saved: MockSavedList[] = [], lists: MockList[] = LISTS) {
  return [
    authedUser(),
    ...createWatchlistHandlers(WATCHLIST),
    ...createListsHandlers(lists),
    ...createWatchedHandlers(WATCHED),
    ...createSavedListsHandlers(saved),
  ];
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/listes']}>
        <Routes>
          <Route path="/listes" element={<MyListsPage />} />
          <Route path="/listes/:listId" element={<p>Page de la liste</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

async function rowNames(section: string) {
  const list = await screen.findByRole('list', { name: section });
  return within(list)
    .getAllByRole('link')
    .map((link) => link.querySelector('[class*="rowNameText"]')?.textContent);
}

function rowOf(section: string, name: RegExp) {
  return within(screen.getByRole('list', { name: section })).getByRole('link', { name });
}

async function chooseSort(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  option: string
) {
  await user.click(screen.getByRole('button', { name: `Trier : ${current}` }));
  await user.click(await screen.findByRole('menuitem', { name: option }));
}

describe('MyListsPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('puts À voir and Films vus first as shortcuts, then one row per list, the latest updated first', async () => {
    server.use(...fullServer());

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mes listes' })
    ).toBeInTheDocument();
    const watchlist = await screen.findByRole('link', { name: /à voir/i });
    expect(watchlist).toHaveAttribute('href', '/watchlist');
    expect(within(watchlist).getByText('2 titres à voir')).toBeInTheDocument();
    const watched = screen.getByRole('link', { name: /films vus/i });
    expect(watched).toHaveAttribute('href', '/listes/films-vus');
    expect(within(watched).getByText('2 films vus')).toBeInTheDocument();

    expect(await rowNames('Vos listes')).toEqual(['Films cultes', 'Halloween', 'Ghibli']);
    expect(screen.getByRole('heading', { level: 2, name: /^Vos listes/ })).toHaveTextContent('3');
    expect(rowOf('Vos listes', /halloween/i)).toHaveAttribute('href', '/listes/l1');
    expect(screen.queryByText(/^\d+ listes/)).toBeNull();
  });

  it('says how many films of each list are watched, with a bar under its posters only once one is', async () => {
    server.use(...fullServer());

    renderPage();

    await screen.findByRole('list', { name: 'Vos listes' });
    const halloween = rowOf('Vos listes', /halloween/i);
    const cultes = rowOf('Vos listes', /films cultes/i);
    const ghibli = rowOf('Vos listes', /ghibli/i);
    expect(within(halloween).getByText('1 film, 1 vu')).toBeInTheDocument();
    expect(within(cultes).getByText('3 films, 1 vu')).toBeInTheDocument();
    expect(
      within(ghibli).getByText('Vide, ajoutez des films depuis leur fiche')
    ).toBeInTheDocument();
    expect(halloween.querySelector('[class*="progress"]')).not.toBeNull();
    expect(ghibli.querySelector('[class*="progress"]')).toBeNull();
  });

  it('marks a public list as such', async () => {
    server.use(...fullServer([], [{ ...LISTS[0]!, isPublic: true }, LISTS[1]!]));

    renderPage();

    await screen.findByRole('list', { name: 'Vos listes' });
    expect(within(rowOf('Vos listes', /halloween/i)).getByText('Publique')).toBeInTheDocument();
    expect(rowOf('Vos listes', /films cultes/i).textContent).not.toContain('Publique');
  });

  it('says on À voir and Films vus that they sync with Letterboxd', async () => {
    server.use(
      authedUser({ letterboxdUsername: 'alice_lb' }),
      ...createWatchlistHandlers(WATCHLIST),
      ...createListsHandlers(LISTS),
      ...createWatchedHandlers(WATCHED),
      ...createSavedListsHandlers()
    );

    renderPage();

    const watchlist = await screen.findByRole('link', { name: /à voir/i });
    expect(within(watchlist).getByText('Synchronisée avec Letterboxd')).toBeInTheDocument();
    expect(
      within(screen.getByRole('link', { name: /films vus/i })).getByText(
        'Synchronisée avec Letterboxd'
      )
    ).toBeInTheDocument();
  });

  it.each([
    { off: 'letterboxdSyncWatchlist', untagged: /à voir/i, tagged: /films vus/i },
    { off: 'letterboxdSyncWatched', untagged: /films vus/i, tagged: /à voir/i },
  ])(
    'drops the Letterboxd line of a shortcut once $off is off',
    async ({ off, untagged, tagged }) => {
      server.use(
        authedUser({ letterboxdUsername: 'alice_lb', [off]: false }),
        ...createWatchlistHandlers(WATCHLIST),
        ...createListsHandlers(LISTS),
        ...createWatchedHandlers(WATCHED),
        ...createSavedListsHandlers()
      );

      renderPage();

      const taggedCard = await screen.findByRole('link', { name: tagged });
      expect(within(taggedCard).getByText('Synchronisée avec Letterboxd')).toBeInTheDocument();
      expect(
        within(screen.getByRole('link', { name: untagged })).queryByText(
          'Synchronisée avec Letterboxd'
        )
      ).toBeNull();
    }
  );

  it('welcomes a new account with a single create button, no tools and no empty section', async () => {
    server.use(
      authedUser(),
      ...createWatchlistHandlers([]),
      ...createListsHandlers(),
      ...createWatchedHandlers(),
      ...createSavedListsHandlers()
    );
    const user = userEvent.setup();
    renderPage();

    const watchlist = await screen.findByRole('link', { name: /à voir/i });
    expect(within(watchlist).getByText('Vide')).toBeInTheDocument();
    expect(
      within(screen.getByRole('link', { name: /films vus/i })).getByText('Vide')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rangez vos films à votre façon : une liste pour Halloween, une pour les classiques à rattraper.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Trouver des sagas et des sélections' })
    ).toHaveAttribute('href', '/films/collections');
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.getAllByRole('button', { name: /liste/i })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Nouvelle liste' }));

    expect(await screen.findByRole('heading', { name: 'Nouvelle liste' })).toBeInTheDocument();
  });

  it('keeps search and sort away below seven lists', async () => {
    server.use(...fullServer([HARRY_POTTER]));

    renderPage();

    await screen.findByRole('list', { name: 'Vos listes' });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Trier/ })).toBeNull();
  });

  it('searches the lists by name from seven lists, the shortcuts staying in place', async () => {
    server.use(...fullServer([HARRY_POTTER], SEVEN_LISTS));
    const user = userEvent.setup();
    renderPage();
    const search = await screen.findByRole('searchbox', { name: 'Rechercher une liste' });

    await user.type(search, 'hallo');

    await waitFor(async () => expect(await rowNames('Vos listes')).toEqual(['Halloween']));
    expect(screen.queryByRole('list', { name: 'Enregistrées' })).toBeNull();
    expect(screen.getByRole('link', { name: /à voir/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /films vus/i })).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'zombies');

    expect(await screen.findByText('Aucune liste ne s’appelle « zombies »')).toBeInTheDocument();
    expect(
      screen.getByText(
        'La recherche porte sur le nom des listes, pas sur les films qu’elles contiennent.'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }));

    expect(search).toHaveValue('');
    expect(await rowNames('Vos listes')).toHaveLength(7);
  });

  it('sorts each section by the chosen criterion, in the chosen order', async () => {
    server.use(...fullServer([HARRY_POTTER, FRISSONS], SEVEN_LISTS));
    const user = userEvent.setup();
    renderPage();
    expect(await rowNames('Vos listes')).toEqual([
      'Films cultes',
      'Halloween',
      'Ghibli',
      'Westerns',
      'Comédies',
      'Anime',
      'Polars',
    ]);
    expect(await rowNames('Enregistrées')).toEqual([FRISSONS_LABEL, 'Harry Potter']);

    await chooseSort(user, 'Récentes', 'Nom');

    expect(await rowNames('Vos listes')).toEqual([
      'Anime',
      'Comédies',
      'Films cultes',
      'Ghibli',
      'Halloween',
      'Polars',
      'Westerns',
    ]);
    expect(await rowNames('Enregistrées')).toEqual([FRISSONS_LABEL, 'Harry Potter']);

    await chooseSort(user, 'Nom', 'De Z à A');

    expect((await rowNames('Vos listes'))[0]).toBe('Westerns');
    expect(await rowNames('Enregistrées')).toEqual(['Harry Potter', FRISSONS_LABEL]);

    await chooseSort(user, 'Nom', 'Avancée');

    expect((await rowNames('Vos listes')).slice(0, 2)).toEqual(['Halloween', 'Polars']);
    expect(await rowNames('Enregistrées')).toEqual(['Harry Potter', FRISSONS_LABEL]);
  });

  it('opens the new list once created', async () => {
    server.use(...fullServer());
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('list', { name: 'Vos listes' });

    await user.click(screen.getByRole('button', { name: 'Nouvelle liste' }));
    await user.type(await screen.findByRole('textbox', { name: 'Nom de la liste' }), 'Marathon');
    await user.click(screen.getByRole('button', { name: 'Créer la liste' }));

    expect(await screen.findByText('Page de la liste')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/listes/l4');
  });

  it('keeps the full create label on a phone', async () => {
    stubMatchMedia(true);
    server.use(...fullServer());
    renderPage();

    expect(await screen.findByRole('button', { name: 'Nouvelle liste' })).toBeInTheDocument();
  });

  it('offers to try again when the lists do not load', async () => {
    let calls = 0;
    server.use(
      authedUser(),
      ...createWatchlistHandlers(WATCHLIST),
      ...createWatchedHandlers(WATCHED),
      ...createSavedListsHandlers(),
      http.get(`${TEST_API_V1}/lists`, () => {
        calls += 1;
        return calls === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json({ items: [] });
      })
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('link', { name: /à voir/i })).toBeInTheDocument();
  });

  describe('shared lists', () => {
    it('files a list I joined under Partagées avec vous, with the people I fill it with', async () => {
      server.use(
        ...fullServer(
          [],
          [
            ...LISTS,
            {
              id: 'l4',
              name: 'Ciné du dimanche',
              items: [film(20, 'Past Lives')],
              role: 'member',
              owner: LEA,
              memberCount: 2,
              memberPreview: [LEA, ALICE],
              updatedAt: '2026-08-01T00:00:00Z',
            },
          ]
        )
      );
      renderPage();

      expect(await rowNames('Partagées avec vous')).toEqual(['Ciné du dimanche']);
      expect(await rowNames('Vos listes')).not.toContain('Ciné du dimanche');
      const joined = rowOf('Partagées avec vous', /ciné du dimanche/i);
      expect(joined).toHaveAttribute('href', '/listes/l4');
      expect(within(joined).getByText('Avec Léa')).toBeInTheDocument();
    });

    it('says with whom I share one of my lists', async () => {
      server.use(
        ...fullServer(
          [],
          [{ ...LISTS[0]!, memberCount: 3, memberPreview: [ALICE, LEA, TOM] }, LISTS[1]!]
        )
      );
      renderPage();

      await screen.findByRole('list', { name: 'Vos listes' });
      expect(
        within(rowOf('Vos listes', /halloween/i)).getByText('Avec Léa et Tom')
      ).toBeInTheDocument();
      expect(rowOf('Vos listes', /films cultes/i).textContent).not.toContain('Avec');
      expect(screen.queryByRole('list', { name: 'Partagées avec vous' })).toBeNull();
    });
  });

  describe('saved lists', () => {
    it('files the saved lists under Enregistrées, each saying where it comes from', async () => {
      server.use(...fullServer([HARRY_POTTER, FRISSONS]));

      renderPage();

      expect(await rowNames('Enregistrées')).toEqual([FRISSONS_LABEL, 'Harry Potter']);
      expect(screen.getByRole('heading', { level: 2, name: /^Enregistrées/ })).toHaveTextContent(
        '2'
      );
      expect(
        screen.getByRole('link', { name: 'Trouver des sagas et des sélections' })
      ).toHaveAttribute('href', '/films/collections');
      const harryPotter = rowOf('Enregistrées', /harry potter/i);
      expect(harryPotter).toHaveAttribute('href', '/listes/enregistrees/s1');
      expect(within(harryPotter).getByText('3 films, 2 vus')).toBeInTheDocument();
      expect(within(harryPotter).getByText('Saga')).toBeInTheDocument();
      expect(
        within(rowOf('Enregistrées', /frissons/i)).getByText('Sélection d’Explorer')
      ).toBeInTheDocument();
    });

    it('hides the section while no list is saved', async () => {
      server.use(...fullServer());

      renderPage();

      await screen.findByRole('list', { name: 'Vos listes' });
      expect(screen.queryByRole('heading', { name: /enregistrées/i })).toBeNull();
    });

    it('says by whom a saved list of a member was made', async () => {
      server.use(...fullServer([KOREAN]));

      renderPage();

      await screen.findByRole('list', { name: 'Enregistrées' });
      const card = rowOf('Enregistrées', /ciné coréen/i);
      expect(within(card).getByText('Par Alice')).toBeInTheDocument();
      expect(within(card).getByText('1 film')).toBeInTheDocument();
    });

    it('says a saved list is unavailable rather than empty', async () => {
      server.use(...fullServer([{ ...HARRY_POTTER, unavailable: true }]));

      renderPage();

      await screen.findByRole('list', { name: 'Enregistrées' });
      const card = rowOf('Enregistrées', /harry potter/i);
      expect(within(card).getByText('Indisponible pour le moment')).toBeInTheDocument();
      expect(within(card).queryByText(/^Vide/)).toBeNull();
    });

    it('turns a list its creator made private into a line atop Enregistrées, and offers to keep a copy', async () => {
      server.use(
        ...fullServer([
          HARRY_POTTER,
          { ...KOREAN, unavailable: true, unavailableReason: 'private', copyAvailable: true },
        ])
      );
      const user = userEvent.setup();
      renderPage();

      expect(await rowNames('Enregistrées')).toEqual(['Harry Potter']);
      expect(await screen.findByText(/n’est plus visible/)).toHaveTextContent(
        'Ciné coréen n’est plus visible : Alice l’a rendue privée.'
      );
      expect(screen.getByRole('button', { name: 'Ne plus enregistrer' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Garder une copie' }));
      const dialog = await screen.findByRole('dialog', { name: 'Copier dans une nouvelle liste' });
      expect(within(dialog).getByRole('textbox', { name: 'Nom de la liste' })).toHaveValue(
        'Ciné coréen'
      );
      await user.click(within(dialog).getByRole('button', { name: 'Créer la copie' }));

      expect(await screen.findByText('Page de la liste')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/listes/copy1');
    });

    it('offers only to stop saving a deleted list that left nothing to copy', async () => {
      server.use(
        ...fullServer([
          {
            ...KOREAN,
            name: null,
            creator: null,
            unavailable: true,
            unavailableReason: 'deleted',
            copyAvailable: false,
          },
        ])
      );
      const user = userEvent.setup();
      renderPage();

      expect(
        await screen.findByText('Une liste que vous suiviez a été supprimée.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Garder une copie' })).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Ne plus enregistrer' }));

      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: /enregistrées/i })).toBeNull()
      );
    });

    it('keeps the created lists when the saved ones do not load, and offers to try again', async () => {
      let calls = 0;
      server.use(
        http.get(`${TEST_API_V1}/saved-lists`, () => {
          calls += 1;
          return calls === 1 ? new HttpResponse(null, { status: 500 }) : undefined;
        }),
        ...fullServer([HARRY_POTTER])
      );
      const user = userEvent.setup();
      renderPage();

      expect(await rowNames('Vos listes')).toHaveLength(3);
      expect(
        screen.getByText('Impossible de charger vos listes enregistrées.')
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Réessayer' }));

      expect(await rowNames('Enregistrées')).toEqual(['Harry Potter']);
    });
  });
});
