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

const LISTS = [
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

function fullServer(saved: MockSavedList[] = []) {
  return [
    authedUser(),
    ...createWatchlistHandlers(WATCHLIST),
    ...createListsHandlers(LISTS),
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

async function cardNames(gridName = 'Mes listes') {
  const grid = await screen.findByRole('list', { name: gridName });
  return within(grid)
    .getAllByRole('link')
    .map((link) => link.querySelector('[class*="name"]')?.textContent);
}

function withPercentSpace(text: string | null | undefined) {
  return (text ?? '').replaceAll(/\p{Zs}/gu, ' ');
}

describe('MyListsPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('counts every list, À voir and Films vus included, and shows them first then the latest updated', async () => {
    server.use(...fullServer());

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mes listes' })
    ).toBeInTheDocument();
    expect(await screen.findByText('5 listes')).toBeInTheDocument();
    expect(await cardNames()).toEqual([
      'À voir',
      'Films vus',
      'Films cultes',
      'Halloween',
      'Ghibli',
    ]);

    const grid = screen.getByRole('list', { name: 'Mes listes' });
    const watchlist = within(grid).getByRole('link', { name: /à voir/i });
    expect(watchlist).toHaveAttribute('href', '/watchlist');
    expect(within(watchlist).getByText('2 titres à voir')).toBeInTheDocument();
    expect(within(grid).getByRole('link', { name: /halloween/i })).toHaveAttribute(
      'href',
      '/listes/l1'
    );
    expect(within(grid).getByText('1 film')).toBeInTheDocument();
    expect(within(grid).getByText('3 films')).toBeInTheDocument();
    expect(within(grid).getByText('Vide')).toBeInTheDocument();
    expect(within(grid).queryByText('Letterboxd')).toBeNull();
  });

  it('opens Films vus from its card, which counts the watched films', async () => {
    server.use(...fullServer());

    renderPage();

    const grid = await screen.findByRole('list', { name: 'Mes listes' });
    const watched = await within(grid).findByRole('link', { name: /films vus/i });
    expect(watched).toHaveAttribute('href', '/listes/films-vus');
    expect(within(watched).getByText('2 films vus')).toBeInTheDocument();
  });

  it('shows how much of each created list is watched, never on the system lists nor an empty list', async () => {
    server.use(...fullServer());

    renderPage();

    const grid = await screen.findByRole('list', { name: 'Mes listes' });
    const halloween = await within(grid).findByRole('link', { name: /halloween/i });
    const cultes = within(grid).getByRole('link', { name: /films cultes/i });
    expect(withPercentSpace(halloween.textContent)).toContain('100 % vus');
    expect(withPercentSpace(cultes.textContent)).toContain('33 % vus');
    for (const name of [/ghibli/i, /à voir/i, /films vus/i]) {
      expect(within(grid).getByRole('link', { name }).textContent).not.toContain('%');
    }
  });

  it('tags À voir with Letterboxd once the account syncs with it', async () => {
    server.use(
      authedUser({ letterboxdUsername: 'alice_lb' }),
      ...createWatchlistHandlers(WATCHLIST),
      ...createListsHandlers(LISTS),
      ...createWatchedHandlers(WATCHED),
      ...createSavedListsHandlers()
    );

    renderPage();

    const watchlist = await screen.findByRole('link', { name: /à voir/i });
    expect(within(watchlist).getByText('Letterboxd')).toBeInTheDocument();
    expect(
      within(screen.getByRole('link', { name: /films vus/i })).getByText('Letterboxd')
    ).toBeInTheDocument();
  });

  it.each([
    { off: 'letterboxdSyncWatchlist', untagged: /à voir/i, tagged: /films vus/i },
    { off: 'letterboxdSyncWatched', untagged: /films vus/i, tagged: /à voir/i },
  ])('drops the Letterboxd tag of a list once $off is off', async ({ off, untagged, tagged }) => {
    server.use(
      authedUser({ letterboxdUsername: 'alice_lb', [off]: false }),
      ...createWatchlistHandlers(WATCHLIST),
      ...createListsHandlers(LISTS),
      ...createWatchedHandlers(WATCHED),
      ...createSavedListsHandlers()
    );

    renderPage();

    const taggedCard = await screen.findByRole('link', { name: tagged });
    expect(within(taggedCard).getByText('Letterboxd')).toBeInTheDocument();
    expect(
      within(screen.getByRole('link', { name: untagged })).queryByText('Letterboxd')
    ).toBeNull();
  });

  it('sorts by name, by number of films and by progress, the system lists staying first', async () => {
    server.use(...fullServer());
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('5 listes');

    await user.click(screen.getByRole('button', { name: 'Nom' }));
    expect(await cardNames()).toEqual([
      'À voir',
      'Films vus',
      'Films cultes',
      'Ghibli',
      'Halloween',
    ]);

    await user.click(screen.getByRole('button', { name: 'Nombre de films' }));
    expect(await cardNames()).toEqual([
      'À voir',
      'Films vus',
      'Films cultes',
      'Halloween',
      'Ghibli',
    ]);

    await user.click(screen.getByRole('button', { name: 'Avancée' }));
    expect(await cardNames()).toEqual([
      'À voir',
      'Films vus',
      'Halloween',
      'Films cultes',
      'Ghibli',
    ]);
  });

  it('searches the lists by name, Films vus included', async () => {
    server.use(...fullServer());
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('5 listes');
    const search = screen.getByRole('searchbox', { name: 'Rechercher une liste' });

    await user.type(search, 'hallo');

    await waitFor(async () => expect(await cardNames()).toEqual(['Halloween']));
    expect(screen.getByText('1 sur 5')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'vus');

    await waitFor(async () => expect(await cardNames()).toEqual(['Films vus']));
  });

  it('invites to create a first list when there are only the system lists', async () => {
    server.use(
      authedUser(),
      ...createWatchlistHandlers([]),
      ...createListsHandlers(),
      ...createWatchedHandlers(),
      ...createSavedListsHandlers()
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('2 listes')).toBeInTheDocument();
    expect(await cardNames()).toEqual(['À voir', 'Films vus']);
    expect(screen.getByText('Aucun film vu')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rangez vos films à votre façon : une liste pour Halloween, une pour les classiques à rattraper.'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Créer une liste' }));

    expect(await screen.findByRole('heading', { name: 'Nouvelle liste' })).toBeInTheDocument();
  });

  it('opens the new list once created', async () => {
    server.use(...fullServer());
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('5 listes');

    await user.click(screen.getByRole('button', { name: 'Nouvelle liste' }));
    await user.type(await screen.findByRole('textbox', { name: 'Nom de la liste' }), 'Marathon');
    await user.click(screen.getByRole('button', { name: 'Créer la liste' }));

    expect(await screen.findByText('Page de la liste')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/listes/l4');
  });

  it('shortens the create button on a phone', async () => {
    stubMatchMedia(true);
    server.use(...fullServer());
    renderPage();

    expect(await screen.findByRole('button', { name: 'Nouvelle' })).toBeInTheDocument();
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

    expect(await screen.findByText('2 listes')).toBeInTheDocument();
  });

  describe('saved lists', () => {
    it('files the saved lists on their own floor, counted once under the title', async () => {
      server.use(...fullServer([HARRY_POTTER, FRISSONS]));

      renderPage();

      expect(await screen.findByText('7 listes, dont 2 enregistrées')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Mes listes' })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Listes enregistrées' })
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Parcourir les sagas' })).toHaveAttribute(
        'href',
        '/films/collections'
      );
      expect(await cardNames()).toEqual([
        'À voir',
        'Films vus',
        'Films cultes',
        'Halloween',
        'Ghibli',
      ]);
      expect(await cardNames('Listes enregistrées')).toEqual([FRISSONS_LABEL, 'Harry Potter']);

      const saved = screen.getByRole('list', { name: 'Listes enregistrées' });
      const harryPotter = within(saved).getByRole('link', { name: /harry potter/i });
      expect(harryPotter).toHaveAttribute('href', '/listes/enregistrees/s1');
      expect(within(harryPotter).getByText('3 films')).toBeInTheDocument();
      expect(withPercentSpace(harryPotter.textContent)).toContain('67 % vus');
      expect(within(harryPotter).getByText('Saga')).toBeInTheDocument();
      const frissons = within(saved).getByRole('link', { name: /frissons/i });
      expect(within(frissons).getByText('Explorer')).toBeInTheDocument();
    });

    it('counts a single saved list in the singular', async () => {
      server.use(...fullServer([HARRY_POTTER]));

      renderPage();

      expect(await screen.findByText('6 listes, dont 1 enregistrée')).toBeInTheDocument();
    });

    it('searches both floors and hides a floor without any match', async () => {
      server.use(...fullServer([HARRY_POTTER, FRISSONS]));
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('7 listes, dont 2 enregistrées');
      const search = screen.getByRole('searchbox', { name: 'Rechercher une liste' });

      await user.type(search, 'harry');

      await waitFor(async () =>
        expect(await cardNames('Listes enregistrées')).toEqual(['Harry Potter'])
      );
      expect(screen.queryByRole('list', { name: 'Mes listes' })).toBeNull();
      expect(screen.getByText('1 sur 7')).toBeInTheDocument();

      await user.clear(search);
      await user.type(search, 'hallo');

      await waitFor(async () => expect(await cardNames()).toEqual(['Halloween']));
      expect(screen.queryByRole('list', { name: 'Listes enregistrées' })).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Listes enregistrées' })).toBeNull();
    });

    it('sorts the saved lists with the same criteria, progress included', async () => {
      server.use(...fullServer([HARRY_POTTER, FRISSONS]));
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('7 listes, dont 2 enregistrées');

      await user.click(screen.getByRole('button', { name: 'Avancée' }));
      expect(await cardNames('Listes enregistrées')).toEqual(['Harry Potter', FRISSONS_LABEL]);

      await user.click(screen.getByRole('button', { name: 'Nom' }));
      expect(await cardNames('Listes enregistrées')).toEqual([FRISSONS_LABEL, 'Harry Potter']);
    });

    it('reminds where to save a saga while none is saved', async () => {
      server.use(...fullServer());

      renderPage();

      expect(await screen.findByText('5 listes')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Listes enregistrées' })
      ).toBeInTheDocument();
      expect(
        screen.getByText('Enregistrez une saga ou une sélection d’Explorer pour la suivre ici.')
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Parcourir les sagas' })).toBeInTheDocument();
    });

    it('says a saved list is unavailable rather than empty', async () => {
      server.use(...fullServer([{ ...HARRY_POTTER, unavailable: true }]));

      renderPage();

      const saved = await screen.findByRole('list', { name: 'Listes enregistrées' });
      const card = within(saved).getByRole('link', { name: /harry potter/i });
      expect(within(card).getByText('Indisponible pour le moment')).toBeInTheDocument();
      expect(within(card).queryByText('Vide')).toBeNull();
    });

    const KOREAN: MockSavedList = {
      id: 's3',
      sourceType: 'memberList',
      sourceId: 'l9',
      name: 'Ciné coréen',
      creator: { handle: 'alice2', displayName: 'Alice Martin', avatarId: null },
      createdAt: '2026-11-12T00:00:00Z',
      items: [film(500, 'Old Boy', '/oldboy.jpg')],
    };

    it('tags the saved list of a member with the name of its creator, elision included', async () => {
      server.use(...fullServer([KOREAN]));

      renderPage();

      const saved = await screen.findByRole('list', { name: 'Listes enregistrées' });
      const card = within(saved).getByRole('link', { name: /ciné coréen/i });
      expect(within(card).getByText('Liste d’Alice')).toBeInTheDocument();
      expect(within(card).getByText('1 film')).toBeInTheDocument();
    });

    it('says on its card that the creator made the list private, and offers to keep a copy', async () => {
      server.use(
        ...fullServer([
          { ...KOREAN, unavailable: true, unavailableReason: 'private', copyAvailable: true },
        ])
      );
      const user = userEvent.setup();
      renderPage();

      const saved = await screen.findByRole('list', { name: 'Listes enregistrées' });
      const card = within(saved).getByRole('link', { name: /ciné coréen/i });
      expect(within(card).getByText('Alice a rendu cette liste privée')).toBeInTheDocument();
      expect(
        within(saved).getByRole('button', { name: 'Ne plus enregistrer' })
      ).toBeInTheDocument();

      await user.click(within(saved).getByRole('button', { name: 'Garder une copie' }));
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

      const saved = await screen.findByRole('list', { name: 'Listes enregistrées' });
      const card = within(saved).getByRole('link', { name: /liste supprimée/i });
      expect(within(card).getByText('Cette liste a été supprimée')).toBeInTheDocument();
      expect(within(saved).queryByRole('button', { name: 'Garder une copie' })).toBeNull();

      await user.click(within(saved).getByRole('button', { name: 'Ne plus enregistrer' }));

      expect(
        await screen.findByText(
          'Enregistrez une saga ou une sélection d’Explorer pour la suivre ici.'
        )
      ).toBeInTheDocument();
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

      expect(await screen.findByText('5 listes')).toBeInTheDocument();
      expect(await cardNames()).toHaveLength(5);
      expect(
        screen.getByText('Impossible de charger vos listes enregistrées.')
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Réessayer' }));

      expect(await screen.findByText('6 listes, dont 1 enregistrée')).toBeInTheDocument();
    });
  });

  describe('shared lists', () => {
    const ALICE = { userId: 'u1', handle: 'alice', displayName: 'Alice', avatarId: null };
    const LEA = { userId: 'u2', handle: 'lea', displayName: 'Léa Moreau', avatarId: null };
    const TOM = { userId: 'u3', handle: 'tom', displayName: 'Tom', avatarId: null };

    it('files a list I joined among Mes listes, under the name of its creator', async () => {
      server.use(
        authedUser(),
        ...createWatchlistHandlers(WATCHLIST),
        ...createListsHandlers([
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
        ]),
        ...createWatchedHandlers(WATCHED),
        ...createSavedListsHandlers([])
      );
      renderPage();

      expect(await cardNames()).toContain('Ciné du dimanche');
      const grid = screen.getByRole('list', { name: 'Mes listes' });
      const joined = within(grid).getByRole('link', { name: /ciné du dimanche/i });
      expect(joined).toHaveAttribute('href', '/listes/l4');
      expect(within(joined).getByText('Liste de Léa')).toBeInTheDocument();
      expect(within(grid).getByRole('link', { name: /halloween/i }).textContent).not.toContain(
        'Liste de'
      );
    });

    it('shows the faces of the people I share one of my lists with', async () => {
      server.use(
        authedUser(),
        ...createWatchlistHandlers(WATCHLIST),
        ...createListsHandlers([
          { ...LISTS[0]!, memberCount: 3, memberPreview: [ALICE, LEA, TOM] },
          LISTS[1]!,
        ]),
        ...createWatchedHandlers(WATCHED),
        ...createSavedListsHandlers([])
      );
      renderPage();

      const grid = await screen.findByRole('list', { name: 'Mes listes' });
      const halloween = await within(grid).findByRole('link', { name: /halloween/i });
      expect(within(halloween).getByText('Avec Léa et Tom')).toBeInTheDocument();
      expect(within(grid).getByRole('link', { name: /films cultes/i }).textContent).not.toContain(
        'Avec'
      );
    });
  });
});
