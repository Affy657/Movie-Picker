import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubHoverCapability, stubMatchMedia } from '@/test-utils/matchMedia';
import {
  createListMembershipHandlers,
  createListsHandlers,
  createWatchlistHandlers,
  TEST_API_V1,
  type MockList,
  type MockListPerson,
  type MockWatchlistItem,
} from '@/mocks/handlers';
import MovieListPage from './MovieListPage';

const PROFILE = {
  userId: 'u1',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  ratingScale: 'ten',
};

function authedUserWith(extra: Record<string, unknown> = {}) {
  return http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({ ...PROFILE, ...extra }));
}

const authedUser = authedUserWith();

function film(tmdbId: number, title: string, extra: Record<string, unknown> = {}) {
  return {
    tmdbId,
    mediaType: 'movie' as const,
    title,
    year: '1996',
    posterPath: null,
    voteAverage: 7,
    runtimeMinutes: 100,
    createdAt: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

const SCREAM = film(4232, 'Scream', { createdAt: '2026-02-01T00:00:00Z' });
const THE_THING = film(1091, 'The Thing');

const HALLOWEEN: MockList = {
  id: 'l1',
  name: 'Halloween',
  description: 'Nos films pour la nuit du 31.',
  items: [THE_THING, SCREAM],
};

const HALLOWEEN_HALF_SEEN: MockList = {
  ...HALLOWEEN,
  items: [THE_THING, { ...SCREAM, isWatched: true }],
};

const ALICE: MockListPerson = {
  userId: 'u1',
  handle: 'alice',
  displayName: 'Alice',
  avatarId: null,
};
const LEA: MockListPerson = {
  userId: 'u2',
  handle: 'lea',
  displayName: 'Léa Moreau',
  avatarId: null,
};
const TOM: MockListPerson = { userId: 'u3', handle: 'tom', displayName: 'Tom', avatarId: null };

const SHARED_HALLOWEEN: MockList = {
  ...HALLOWEEN,
  memberCount: 3,
  memberPreview: [ALICE, LEA, TOM],
  items: [
    { ...THE_THING, addedBy: ALICE },
    { ...SCREAM, addedBy: LEA },
  ],
};

const SUNDAY_CINEMA: MockList = {
  id: 'l1',
  name: 'Ciné du dimanche',
  role: 'member',
  owner: LEA,
  memberCount: 2,
  memberPreview: [LEA, ALICE],
  items: [
    { ...THE_THING, addedBy: LEA },
    { ...SCREAM, addedBy: ALICE },
  ],
};

function withPercentSpace(text: string | null | undefined) {
  return (text ?? '').replaceAll(/\p{Zs}/gu, ' ');
}

function progressText(expected: string) {
  return screen.getByText(
    (_, element) =>
      element?.lastElementChild?.tagName === 'STRONG' &&
      withPercentSpace(element.textContent) === expected
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderPage(path = '/listes/l1') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/listes/:listId" element={<MovieListPage />} />
          <Route path="/listes" element={<p>Sommaire des listes</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function useServer(lists: MockList[] = [HALLOWEEN], watchlist: MockWatchlistItem[] = []) {
  return [authedUser, ...createWatchlistHandlers(watchlist), ...createListsHandlers(lists)];
}

describe('MovieListPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows the list under a link back to Mes listes, with its count, description and films', async () => {
    server.use(...useServer());

    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Halloween' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes listes' })).toHaveAttribute('href', '/listes');
    expect(screen.getByText('2 films')).toBeInTheDocument();
    expect(screen.getByText('Nos films pour la nuit du 31.')).toBeInTheDocument();
    const grid = await screen.findByRole('list', { name: 'Films de « Halloween »' });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('searchbox', { name: 'Rechercher dans la liste' })).toHaveAttribute(
      'placeholder',
      'Rechercher dans Halloween…'
    );
    expect(screen.getByRole('button', { name: 'Piocher un film' })).toBeInTheDocument();
  });

  it('tags a public list discreetly', async () => {
    server.use(...useServer([{ ...HALLOWEEN, isPublic: true }]));
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Halloween' });
    expect(screen.getByText('Publique')).toBeInTheDocument();
  });

  it('does not tag a private list', async () => {
    server.use(...useServer());
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Halloween' });
    expect(screen.queryByText('Publique')).toBeNull();
  });

  it('copies the link of its public page from the ⋯ menu of a public list', async () => {
    server.use(...useServer([{ ...HALLOWEEN, isPublic: true }]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Modifier la liste',
      'Copier le lien',
      'Membres',
      'Supprimer la liste',
    ]);
    await user.click(screen.getByRole('menuitem', { name: 'Copier le lien' }));

    expect((await screen.findByText('Lien copié')).closest('output')).not.toBeNull();
    expect(await navigator.clipboard.readText()).toBe(
      'https://www.movie-picker.fr/u/alice/listes/l1'
    );
  });

  it('sorts by addition, title, rating, runtime and release, without availability', async () => {
    server.use(...useServer());
    renderPage();

    const sorts = await screen.findByRole('toolbar', { name: /trier par/i });

    expect(
      within(sorts)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Ajout', 'Titre', 'Note', 'Durée', 'Sortie']);
  });

  it('keeps the sort chosen on a list to that list', async () => {
    const items = [film(1, 'Zodiac', { createdAt: '2026-02-01T00:00:00Z' }), film(2, 'Alien')];
    server.use(
      ...useServer([
        { id: 'l1', name: 'Halloween', items },
        { id: 'l2', name: 'Noël', items },
      ])
    );
    const firstTitle = async (name: string) =>
      within(await screen.findByRole('list', { name: `Films de « ${name} »` })).getAllByRole(
        'listitem'
      )[0]?.textContent;
    const user = userEvent.setup();
    const halloween = renderPage('/listes/l1');
    expect(await firstTitle('Halloween')).toContain('Zodiac');

    await user.click(screen.getByRole('button', { name: 'Titre' }));
    await waitFor(async () => expect(await firstTitle('Halloween')).toContain('Alien'));
    halloween.unmount();
    renderPage('/listes/l2');

    expect(await firstTitle('Noël')).toContain('Zodiac');
  });

  it('says so when the list holds no film', async () => {
    server.use(...useServer([{ id: 'l1', name: 'Ghibli' }]));

    renderPage();

    expect(await screen.findByText('Cette liste est vide')).toBeInTheDocument();
    expect(
      screen.getByText('Ajoutez un film avec « Ajouter un film » ou depuis la fiche d’un film.')
    ).toBeInTheDocument();
    expect(screen.getByText('Vide')).toBeInTheDocument();
  });

  it('says the list no longer exists when the API does not find it', async () => {
    server.use(...useServer([]));

    renderPage('/listes/inconnue');

    expect(await screen.findByText('Cette liste n’existe plus.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à Mes listes' })).toHaveAttribute(
      'href',
      '/listes'
    );
  });

  it('edits the list from the ⋯ menu', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Modifier la liste' }));
    const name = await screen.findByRole('textbox', { name: 'Nom de la liste' });
    expect(name).toHaveValue('Halloween');
    await user.clear(name);
    await user.type(name, 'Nuit du 31');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nuit du 31' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Nom de la liste' })).toBeNull()
    );
  });

  it('deletes the list after a confirmation, then goes back to Mes listes', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer la liste' }));

    const dialog = await screen.findByRole('dialog', { name: 'Supprimer « Halloween » ?' });
    expect(
      within(dialog).getByText(
        'La liste et ses 2 films disparaissent de Mes listes. Les films restent dans vos autres listes. Cette action est définitive.'
      )
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer la liste' }));

    expect(await screen.findByText('Sommaire des listes')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/listes');
  });

  it('adds a film to this list from the search panel', async () => {
    let added: Record<string, unknown> | null = null;
    server.use(
      http.post(`${TEST_API_V1}/lists/l1/items`, async ({ request }) => {
        added = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(added, { status: 201 });
      }),
      http.get(`${TEST_API_V1}/movies/search`, () =>
        HttpResponse.json({
          items: [
            {
              id: 100,
              title: 'Film Test',
              year: '2024',
              posterPath: null,
              voteAverage: 7.5,
              runtimeMinutes: 112,
              genreIds: [27],
              watchProviders: [],
              tmdbWatchPageUrl: null,
            },
          ],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: '',
        })
      ),
      ...useServer()
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Ajouter un film' }));
    expect(
      await screen.findByRole('heading', { name: 'Ajouter un film à « Halloween »' })
    ).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/rechercher un film à ajouter/i), 'Film Test');
    await user.click(await screen.findByRole('button', { name: /^ajouter « film test/i }));

    await waitFor(() => expect(added).toMatchObject({ tmdbId: 100, genreIds: [27] }));
  });

  it('marks the films already in À voir and adds one there from its poster', async () => {
    stubHoverCapability();
    let addedToWatchlist: Record<string, unknown> | null = null;
    server.use(
      http.post(`${TEST_API_V1}/watchlist`, async ({ request }) => {
        addedToWatchlist = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(addedToWatchlist, { status: 201 });
      }),
      ...useServer([HALLOWEEN], [SCREAM])
    );
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('list', { name: 'Films de « Halloween »' });
    expect(screen.getAllByRole('img', { name: 'Déjà dans votre liste' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Ajouter « The Thing » à ma liste' }));

    await waitFor(() => expect(addedToWatchlist).toMatchObject({ tmdbId: 1091 }));
  });

  it('takes a film out of the list from the kebab of the table view', async () => {
    stubHoverCapability();
    localStorage.setItem('watchlist-view', 'list');
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: /plus d.actions pour «\s*scream\s*»/i })
    );
    await user.click(screen.getByRole('menuitem', { name: 'Retirer « Scream » de la liste' }));

    await waitFor(() => expect(screen.queryByText('Scream')).toBeNull());
    expect(screen.getByText('1 film')).toBeInTheDocument();
  });

  it('on a phone, puts the actions under the name and shortens the search', async () => {
    stubMatchMedia(true);
    server.use(...useServer());
    renderPage();

    expect(await screen.findByRole('button', { name: 'Piocher' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions de la liste' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Rechercher dans la liste' })).toHaveAttribute(
      'placeholder',
      'Rechercher…'
    );
  });

  it('shows how much of the list is watched under its description', async () => {
    server.use(...useServer([HALLOWEEN_HALF_SEEN]));

    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Halloween' });
    expect(progressText('1 sur 2 vu, 50 %')).toBeInTheDocument();
  });

  it('shows no progress on an empty list', async () => {
    server.use(...useServer([{ id: 'l1', name: 'Ghibli' }]));

    renderPage();

    await screen.findByText('Cette liste est vide');
    expect(screen.queryByText(/sur 0 vu/)).toBeNull();
  });

  it('dims the watched films once Griser les vus is on, and keeps the choice on the account', async () => {
    let patched: unknown = null;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ ...PROFILE, dimWatched: true });
      }),
      ...useServer([HALLOWEEN_HALF_SEEN])
    );
    const user = userEvent.setup();
    renderPage();

    const toggle = await screen.findByRole('switch', { name: 'Griser les vus' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByRole('button', { name: 'Voir les détails de « Scream »' })
    ).toBeInTheDocument();

    await user.click(toggle);

    expect(
      await screen.findByRole('button', { name: 'Voir les détails de « Scream », déjà vu' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Voir les détails de « The Thing »' })
    ).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Griser les vus' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await waitFor(() => expect(patched).toEqual({ dimWatched: true }));
  });

  it('opens already dimmed when the account asks for it', async () => {
    server.use(
      authedUserWith({ dimWatched: true }),
      ...createWatchlistHandlers([]),
      ...createListsHandlers([HALLOWEEN_HALF_SEEN])
    );

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Voir les détails de « Scream », déjà vu' })
    ).toBeInTheDocument();
  });

  it('on a phone, dims the watched films from the eye button of the toolbar', async () => {
    stubMatchMedia(true);
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ ...PROFILE, dimWatched: true })
      ),
      ...useServer([HALLOWEEN_HALF_SEEN])
    );
    const user = userEvent.setup();
    renderPage();

    const eye = await screen.findByRole('button', { name: 'Griser les vus' });
    expect(eye).toHaveAttribute('aria-pressed', 'false');

    await user.click(eye);

    expect(screen.getByRole('button', { name: 'Griser les vus' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      await screen.findByRole('button', { name: 'Voir les détails de « Scream », déjà vu' })
    ).toBeInTheDocument();
  });

  describe('shared with other people', () => {
    it('shows who else is in the list under its description, and opens the members from there', async () => {
      server.use(
        ...useServer([SHARED_HALLOWEEN]),
        ...createListMembershipHandlers('l1', {
          members: [
            { ...ALICE, isOwner: true },
            { ...LEA, isOwner: false },
            { ...TOM, isOwner: false },
          ],
        })
      );
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Avec Léa et Tom' }));

      expect(
        await screen.findByRole('dialog', { name: 'Membres de « Halloween »' })
      ).toBeInTheDocument();
    });

    it('shows no members on a list kept to oneself', async () => {
      server.use(...useServer());
      renderPage();

      await screen.findByRole('heading', { level: 1, name: 'Halloween' });
      expect(screen.queryByRole('button', { name: /^avec/i })).toBeNull();
    });

    it('offers the creator editing, the members and deletion in the ⋯ menu', async () => {
      server.use(...useServer([SHARED_HALLOWEEN]));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));

      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Modifier la liste',
        'Membres',
        'Supprimer la liste',
      ]);
    });

    it('tells a member who created the list, and still lets them add and pick a film', async () => {
      server.use(...useServer([SUNDAY_CINEMA]));
      renderPage();

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Ciné du dimanche' })
      ).toBeInTheDocument();
      expect(screen.getByText('Créée par Léa')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Avec Léa' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ajouter un film' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Piocher un film' })).toBeInTheDocument();
    });

    it('offers a member only the members and leaving in the ⋯ menu', async () => {
      server.use(...useServer([SUNDAY_CINEMA]));
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));

      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Membres',
        'Quitter la liste',
      ]);
    });

    it('lets a member leave after a confirmation, then goes back to Mes listes', async () => {
      let left = false;
      server.use(
        http.post(`${TEST_API_V1}/lists/l1/leave`, () => {
          left = true;
          return new HttpResponse(null, { status: 204 });
        }),
        ...useServer([SUNDAY_CINEMA])
      );
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
      await user.click(screen.getByRole('menuitem', { name: 'Quitter la liste' }));

      const dialog = await screen.findByRole('dialog', {
        name: 'Quitter « Ciné du dimanche » ?',
      });
      expect(
        within(dialog).getByText(
          'La liste disparaît de Mes listes. Les films que vous y avez ajoutés restent, et Léa pourra vous inviter de nouveau.'
        )
      ).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Quitter la liste' }));

      expect(await screen.findByText('Sommaire des listes')).toBeInTheDocument();
      expect(left).toBe(true);
    });

    it('marks each poster with who added the film', async () => {
      server.use(...useServer([SHARED_HALLOWEEN]));
      renderPage();

      await screen.findByRole('list', { name: 'Films de « Halloween »' });
      expect(screen.getByRole('img', { name: 'Ajouté par Léa' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Ajouté par vous' })).toBeInTheDocument();
    });

    it('shows no adder on the posters of a list kept to oneself', async () => {
      server.use(...useServer([{ ...HALLOWEEN, items: [{ ...THE_THING, addedBy: ALICE }] }]));
      renderPage();

      await screen.findByRole('list', { name: 'Films de « Halloween »' });
      expect(screen.queryByRole('img', { name: /ajouté par/i })).toBeNull();
    });

    it('turns the adder into a column of the table view', async () => {
      localStorage.setItem('watchlist-view', 'list');
      server.use(...useServer([SHARED_HALLOWEEN]));
      renderPage();

      const table = await screen.findByRole('list', { name: 'Films de « Halloween »' });
      expect(screen.getByText('Ajouté par')).toBeInTheDocument();
      expect(within(table).getByText('Ajouté par Léa')).toBeInTheDocument();
      expect(within(table).getByText('Ajouté par vous')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /ajouté par/i })).toBeNull();
    });

    it('lets a member take a film out of the list', async () => {
      stubHoverCapability();
      localStorage.setItem('watchlist-view', 'list');
      server.use(...useServer([SUNDAY_CINEMA]));
      const user = userEvent.setup();
      renderPage();

      await user.click(
        await screen.findByRole('button', { name: /plus d.actions pour «\s*scream\s*»/i })
      );
      await user.click(screen.getByRole('menuitem', { name: 'Retirer « Scream » de la liste' }));

      await waitFor(() => expect(screen.queryByText('Scream')).toBeNull());
    });
  });
});
