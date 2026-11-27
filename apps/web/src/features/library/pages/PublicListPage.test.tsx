import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { buildUserProfile } from '@/test-utils/userProfile';
import { openSortMenu, sortChoices } from '@/test-utils/sortMenu';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubHoverCapability } from '@/test-utils/matchMedia';
import {
  authMeGuestHandler,
  createListsHandlers,
  createPublicListsHandlers,
  createSavedListsHandlers,
  createWatchlistHandlers,
  TEST_API_V1,
  type MockListCreator,
  type MockPublicList,
  publicListOf,
} from '@/mocks/handlers';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import PublicListPage from './PublicListPage';

const LEA: MockListCreator = { handle: 'lea', displayName: 'Léa Moreau', avatarId: null };

const signedIn = http.get(`${TEST_API_V1}/auth/me`, () =>
  apiJson<'UserProfileResponse'>(
    buildUserProfile({
      userId: 'u1',
      displayName: 'Alice',
      emailMasked: 'a***@test.local',
      uiTheme: 'system',
      accentColor: 'default',
      ratingScale: 'ten',
      handle: 'alice',
    })
  )
);

function film(tmdbId: number, title: string, year: string, isWatched = false) {
  return {
    tmdbId,
    mediaType: 'movie' as const,
    title,
    year,
    posterPath: null,
    voteAverage: 8,
    runtimeMinutes: 120,
    isWatched,
  };
}

const CLASSICS: MockPublicList = {
  id: 'l1',
  name: 'Les classiques à voir',
  description: 'Ceux qu’il faut avoir vus au moins une fois.',
  items: [
    film(238, 'Le Parrain', '1972', true),
    film(15, 'Citizen Kane', '1941'),
    film(426, 'Vertigo', '1958'),
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(path = '/u/lea/listes/l1') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/u/:handle/listes/:listId" element={<PublicListPage />} />
          <Route path="/listes/:listId" element={<p>Page de travail</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function memberServer(list: MockPublicList = CLASSICS) {
  return [
    signedIn,
    ...createWatchlistHandlers([]),
    ...createListsHandlers([]),
    ...createSavedListsHandlers([]),
    ...createPublicListsHandlers(LEA, [list]),
  ];
}

function visitorServer() {
  return [
    authMeGuestHandler,
    ...createPublicListsHandlers(LEA, [CLASSICS], { viewerSignedIn: false }),
  ];
}

function gridTitles() {
  return within(screen.getByRole('list', { name: 'Films de « Les classiques à voir »' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '');
}

describe('PublicListPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows the list of a member under her name, with a way back to her lists', async () => {
    server.use(...memberServer());

    renderPage();

    expect(await screen.findByRole('link', { name: 'Les listes de Léa' })).toHaveAttribute(
      'href',
      '/u/lea/listes'
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Les classiques à voir' })
    ).toBeInTheDocument();
    expect(screen.getByText('Par Léa')).toBeInTheDocument();
    expect(screen.getByText('3 films, 1 vu')).toBeInTheDocument();
    expect(screen.getByText('Ceux qu’il faut avoir vus au moins une fois.')).toBeInTheDocument();
    expect(await screen.findByRole('switch', { name: 'Griser les vus' })).toBeInTheDocument();
  });

  it('keeps the order of its creator by default, then sorts by title or year', async () => {
    server.use(...memberServer());
    const user = userEvent.setup();
    renderPage();

    const sorts = await openSortMenu(user, 'Ordre de Léa');
    expect(sortChoices(sorts)).toEqual(['Ordre de Léa', 'Titre', 'Année']);
    expect(within(sorts).getByRole('menuitemradio', { name: /ordre de léa/i })).toBeChecked();
    expect(gridTitles()[0]).toContain('Le Parrain');
    expect(gridTitles()[2]).toContain('Vertigo');

    await user.click(within(sorts).getByRole('menuitemradio', { name: /titre/i }));

    expect(gridTitles()[0]).toContain('Citizen Kane');
  });

  it('offers neither adding nor removing a film, nor who added it', async () => {
    stubHoverCapability();
    localStorage.setItem('watchlist-view', 'list');
    server.use(...memberServer({ ...CLASSICS, memberCount: 3 }));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Les classiques à voir' });
    expect(screen.queryByRole('button', { name: 'Ajouter un film' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Ajouté par' })).toBeNull();

    await user.click(
      await screen.findByRole('button', { name: /plus d.actions pour «\s*le parrain\s*»/i })
    );
    expect(screen.queryByRole('menuitem', { name: /retirer/i })).toBeNull();
  });

  it('saves the list into Mes listes, then says it is saved', async () => {
    let body: unknown = null;
    server.use(
      http.post(`${TEST_API_V1}/saved-lists`, async ({ request }) => {
        body = await request.clone().json();
      }),
      ...memberServer()
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Enregistrer dans Mes listes' }));

    expect(await screen.findByRole('button', { name: 'Enregistrée' })).not.toHaveAttribute(
      'aria-pressed'
    );
    expect(body).toEqual({ sourceType: 'memberList', sourceId: 'l1' });
  });

  it('copies the list into a new list of mine from the ⋯ menu, then opens it', async () => {
    server.use(...memberServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Copier dans une nouvelle liste',
      'Copier le lien',
    ]);
    await user.click(screen.getByRole('menuitem', { name: 'Copier dans une nouvelle liste' }));

    const dialog = await screen.findByRole('dialog', { name: 'Copier dans une nouvelle liste' });
    expect(within(dialog).getByRole('textbox', { name: 'Nom de la liste' })).toHaveValue(
      'Les classiques à voir'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Créer la copie' }));

    expect(await screen.findByText('Page de travail')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/listes/publicCopy1');
  });

  it('copies the link of the page from the ⋯ menu', async () => {
    server.use(...memberServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copier le lien' }));

    expect((await screen.findByText('Lien copié')).closest('output')).not.toBeNull();
    expect(await navigator.clipboard.readText()).toBe(
      'https://www.movie-picker.fr/u/lea/listes/l1'
    );
  });

  it('lets a visitor read the list, and offers an account to save it, coming back to the list', async () => {
    server.use(...visitorServer());
    const user = userEvent.setup();
    renderPage();

    const save = await screen.findByRole('link', { name: 'Enregistrer dans Mes listes' });
    expect(save).toHaveAttribute('href', '/register?returnTo=%2Fu%2Flea%2Flistes%2Fl1');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Les classiques à voir' })
    ).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: /films de/i })).toBeInTheDocument();
    expect(screen.getByText('3 films')).toBeInTheDocument();
    expect(screen.queryByText('3 films, 1 vu')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Griser les vus' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Copier le lien',
    ]);
    await user.keyboard('{Escape}');

    await user.click(save);

    const dialog = await screen.findByRole('dialog', { name: 'Enregistrer cette liste' });
    expect(within(dialog).getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fu%2Flea%2Flistes%2Fl1'
    );
    expect(within(dialog).getByRole('link', { name: 'J’ai déjà un compte' })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fu%2Flea%2Flistes%2Fl1'
    );
  });

  it('sends the creator or a member to the working page of the list', async () => {
    server.use(...memberServer({ ...CLASSICS, viewerRole: 'member' }));

    renderPage();

    expect(await screen.findByText('Page de travail')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/listes/l1'));
  });

  it('offers to try again when the list could not be loaded, and keeps the page out of the index', async () => {
    let failures = 1;
    server.use(
      http.get(`${TEST_API_V1}/users/lea/lists/l1`, () => {
        if (failures-- <= 0) return undefined;
        return apiErrorJson(503, 'internal_error');
      }),
      ...memberServer()
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Impossible de charger cette liste.')).toBeInTheDocument();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex'
    );

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Les classiques à voir' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
        'index, follow'
      )
    );
  });

  it('gives the address under the handle the API returns, as canonical and as copied link', async () => {
    server.use(
      http.get(`${TEST_API_V1}/users/LEA/lists/l1`, () =>
        apiJson<'PublicListResponse'>(
          publicListOf(LEA, {
            ...CLASSICS,
            createdAt: '2026-11-01T00:00:00Z',
            updatedAt: '2026-11-01T00:00:00Z',
          })
        )
      ),
      ...memberServer()
    );
    const user = userEvent.setup();
    renderPage('/u/LEA/listes/l1');

    await screen.findByRole('heading', { level: 1, name: 'Les classiques à voir' });
    await waitFor(() =>
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        'https://www.movie-picker.fr/u/lea/listes/l1'
      )
    );

    await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copier le lien' }));

    await screen.findByText('Lien copié');
    expect(await navigator.clipboard.readText()).toBe(
      'https://www.movie-picker.fr/u/lea/listes/l1'
    );
  });

  it('shows the progress of a visitor as soon as she signs in with her password', async () => {
    const twoFilms = (godfatherWatched: boolean): MockPublicList => ({
      id: 'l1',
      name: 'Les classiques à voir',
      items: [film(238, 'Le Parrain', '1972', godfatherWatched), film(15, 'Citizen Kane', '1941')],
    });
    server.use(
      authMeGuestHandler,
      ...createPublicListsHandlers(LEA, [twoFilms(false)], { viewerSignedIn: false })
    );
    let login: ReturnType<typeof useAuth>['login'] | undefined;
    function ExposeLogin() {
      login = useAuth().login;
      return null;
    }
    render(
      <AppTestProviders>
        <MemoryRouter initialEntries={['/u/lea/listes/l1']}>
          <Routes>
            <Route path="/u/:handle/listes/:listId" element={<PublicListPage />} />
          </Routes>
          <ExposeLogin />
        </MemoryRouter>
      </AppTestProviders>
    );
    expect(await screen.findByRole('list', { name: /films de/i })).toBeInTheDocument();
    server.use(
      signedIn,
      http.post(`${TEST_API_V1}/auth/login`, () =>
        apiJson<'LoginResponse'>({ userId: 'u1', displayName: 'Alice', twoFactorRequired: false })
      ),
      ...createWatchlistHandlers([]),
      ...createListsHandlers([]),
      ...createSavedListsHandlers([]),
      ...createPublicListsHandlers(LEA, [twoFilms(true)])
    );

    await act(async () => {
      await login!('alice@test.local', 'secret');
    });

    expect(await screen.findByText('2 films, 1 vu')).toBeInTheDocument();
  });

  it('says clearly when the list is private or does not exist', async () => {
    server.use(...memberServer());

    renderPage('/u/lea/listes/inconnue');

    expect(await screen.findByText('Cette liste n’est pas disponible')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le profil de @lea' })).toHaveAttribute(
      'href',
      '/u/lea'
    );
  });
});
