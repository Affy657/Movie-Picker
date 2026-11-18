import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubHoverCapability, stubMatchMedia } from '@/test-utils/matchMedia';
import {
  createListsHandlers,
  createSavedListsHandlers,
  createWatchlistHandlers,
  TEST_API_V1,
  type MockSavedList,
} from '@/mocks/handlers';
import SavedListPage from './SavedListPage';

const PROFILE = {
  userId: 'u1',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  ratingScale: 'ten',
};

const authedUser = http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(PROFILE));

function film(tmdbId: number, title: string, year: string, isWatched = false) {
  return {
    tmdbId,
    mediaType: 'movie' as const,
    title,
    year,
    posterPath: null,
    voteAverage: 7,
    runtimeMinutes: 150,
    isWatched,
  };
}

const HARRY_POTTER: MockSavedList = {
  id: 's1',
  sourceType: 'tmdbCollection',
  sourceId: '1241',
  name: 'Harry Potter - Saga',
  items: [
    film(671, 'À l’école des sorciers', '2001', true),
    film(672, 'La Chambre des secrets', '2002', true),
    film(673, 'Le Prisonnier d’Azkaban', '2004'),
  ],
};

const FRISSONS: MockSavedList = {
  id: 's2',
  sourceType: 'explorerTheme',
  sourceId: 'frissons',
  name: 'frissons',
  items: [film(694, 'Shining', '1980')],
};

function withPercentSpace(text: string | null | undefined) {
  return (text ?? '').replaceAll(/\p{Zs}/gu, ' ');
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderPage(path = '/listes/enregistrees/s1') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/listes/enregistrees/:savedListId" element={<SavedListPage />} />
          <Route path="/listes/:listId" element={<p>Liste créée</p>} />
          <Route path="/listes" element={<p>Sommaire des listes</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function useServer(saved: MockSavedList[] = [HARRY_POTTER]) {
  return [
    authedUser,
    ...createWatchlistHandlers([]),
    ...createListsHandlers([]),
    ...createSavedListsHandlers(saved),
  ];
}

function gridTitles(name: string) {
  return within(screen.getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '');
}

describe('SavedListPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows the saved saga under Mes listes, its films in the order of the saga and its progress', async () => {
    server.use(...useServer());

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Harry Potter' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes listes' })).toHaveAttribute('href', '/listes');
    expect(screen.getByText('Saga enregistrée')).toBeInTheDocument();
    expect(screen.getByText('3 films')).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          withPercentSpace(element?.textContent) === '2 sur 3 vus, 67 %' &&
          element?.lastElementChild?.tagName === 'STRONG'
      )
    ).toBeInTheDocument();
    await screen.findByRole('list', { name: 'Films de « Harry Potter »' });
    const titles = gridTitles('Films de « Harry Potter »');
    expect(titles[0]).toContain('À l’école des sorciers');
    expect(titles[2]).toContain('Le Prisonnier d’Azkaban');
    expect(screen.getByRole('button', { name: 'Enregistrée' })).not.toHaveAttribute('aria-pressed');
    expect(screen.getByRole('button', { name: 'Piocher un film' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter un film' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Griser les vus' })).toBeInTheDocument();
  });

  it('sorts by relevance, title and year, relevance first, the latest film first by year', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    const sorts = await screen.findByRole('toolbar', { name: /trier par/i });
    expect(
      within(sorts)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Pertinence', 'Titre', 'Année']);
    expect(within(sorts).getByRole('button', { name: /pertinence/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(within(sorts).getByRole('button', { name: /année/i }));

    expect(gridTitles('Films de « Harry Potter »')[0]).toContain('Le Prisonnier d’Azkaban');
  });

  it('offers no way to take a film out of the saga', async () => {
    stubHoverCapability();
    localStorage.setItem('watchlist-view', 'list');
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', {
        name: /plus d.actions pour «\s*à l’école des sorciers\s*»/i,
      })
    );

    expect(screen.queryByRole('menuitem', { name: /retirer/i })).toBeNull();
  });

  it('names a saved selection by its theme and leads back to it in Explorer', async () => {
    server.use(...useServer([FRISSONS]));
    const user = userEvent.setup();
    renderPage('/listes/enregistrees/s2');

    expect(
      await screen.findByRole('heading', { level: 1, name: "Frissons d'automne" })
    ).toBeInTheDocument();
    expect(screen.getByText('Sélection enregistrée')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));

    expect(
      screen.getByRole('menuitem', { name: 'Voir la sélection dans Explorer' })
    ).toHaveAttribute('href', '/films/theme/frissons');
  });

  it('lists the copy, the saga in Explorer and the unsaving in the ⋯ menu', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Copier dans une nouvelle liste',
      'Voir la saga dans Explorer',
      'Ne plus enregistrer',
    ]);
    expect(screen.getByRole('menuitem', { name: 'Voir la saga dans Explorer' })).toHaveAttribute(
      'href',
      '/films/collection/1241'
    );
  });

  it('stops saving the saga from the ⋯ menu, then goes back to Mes listes', async () => {
    let deleted = false;
    server.use(
      http.delete(`${TEST_API_V1}/saved-lists/s1`, () => {
        deleted = true;
      }),
      ...useServer()
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Ne plus enregistrer' }));

    expect(await screen.findByText('Sommaire des listes')).toBeInTheDocument();
    expect(deleted).toBe(true);
  });

  it('stops saving the saga from the Enregistrée button, then goes back to Mes listes', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Enregistrée' }));

    expect(await screen.findByText('Sommaire des listes')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/listes');
  });

  it('copies the saga into a new list named after it, then opens that list', async () => {
    server.use(...useServer());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copier dans une nouvelle liste' }));

    const dialog = await screen.findByRole('dialog', { name: 'Copier dans une nouvelle liste' });
    expect(within(dialog).getByRole('textbox', { name: 'Nom de la liste' })).toHaveValue(
      'Harry Potter'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Créer la copie' }));

    expect(await screen.findByText('Liste créée')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/listes/copy1');
  });

  it('says when the saga cannot be read for now, lets retry, and keeps the menu to unsave it', async () => {
    let reads = 0;
    server.use(
      http.get(`${TEST_API_V1}/saved-lists/s1`, () => {
        reads += 1;
        if (reads > 1) return undefined;
        return HttpResponse.json({
          id: 's1',
          sourceType: 'tmdbCollection',
          sourceId: '1241',
          name: 'Harry Potter',
          itemCount: 0,
          posterPaths: [],
          watchedCount: 0,
          createdAt: '2026-11-01T00:00:00Z',
          unavailable: true,
          items: [],
        });
      }),
      ...useServer()
    );
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByText('Cette saga n’est pas disponible pour le moment')
    ).toBeInTheDocument();
    expect(screen.queryByText('Vide')).toBeNull();
    expect(screen.getByRole('button', { name: 'Actions de la liste' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(
      await screen.findByRole('list', { name: 'Films de « Harry Potter »' })
    ).toBeInTheDocument();
  });

  describe('list of a member', () => {
    const KOREAN: MockSavedList = {
      id: 's3',
      sourceType: 'memberList',
      sourceId: 'l9',
      name: 'Ciné coréen',
      creator: { handle: 'alice2', displayName: 'Alice Martin', avatarId: null },
      items: [film(670, 'Old Boy', '2003', true), film(4553, 'Memories of Murder', '2003')],
    };

    it('says whose list it is and leads to it on the profile of its creator', async () => {
      server.use(...useServer([KOREAN]));
      const user = userEvent.setup();
      renderPage('/listes/enregistrees/s3');

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Ciné coréen' })
      ).toBeInTheDocument();
      expect(screen.getByText('Liste de @alice2 enregistrée')).toBeInTheDocument();
      expect(screen.getByText('2 films')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));

      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Copier dans une nouvelle liste',
        'Voir la liste sur le profil d’Alice',
        'Ne plus enregistrer',
      ]);
      expect(
        screen.getByRole('menuitem', { name: 'Voir la liste sur le profil d’Alice' })
      ).toHaveAttribute('href', '/u/alice2/listes/l9');
    });

    it('says the creator made the list private, and offers to keep a copy of it', async () => {
      server.use(
        ...useServer([
          { ...KOREAN, unavailable: true, unavailableReason: 'private', copyAvailable: true },
        ])
      );
      const user = userEvent.setup();
      renderPage('/listes/enregistrees/s3');

      expect(await screen.findByText('Alice a rendu cette liste privée')).toBeInTheDocument();
      expect(
        screen.getByText('Gardez-en une copie dans Mes listes, ou ne l’enregistrez plus.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Ne plus enregistrer' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Garder une copie' }));
      const dialog = await screen.findByRole('dialog', { name: 'Copier dans une nouvelle liste' });
      await user.click(within(dialog).getByRole('button', { name: 'Créer la copie' }));

      expect(await screen.findByText('Liste créée')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/listes/copy1');
    });

    it('offers only to stop saving a deleted list that left nothing to copy', async () => {
      server.use(
        ...useServer([
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
      renderPage('/listes/enregistrees/s3');

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Liste supprimée' })
      ).toBeInTheDocument();
      expect(screen.getByText('Cette liste a été supprimée')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Garder une copie' })).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Ne plus enregistrer',
      ]);
      await user.click(screen.getByRole('menuitem', { name: 'Ne plus enregistrer' }));

      expect(await screen.findByText('Sommaire des listes')).toBeInTheDocument();
    });
  });

  it('says the list is no longer saved when the API does not find it', async () => {
    server.use(...useServer([]));

    renderPage('/listes/enregistrees/inconnue');

    expect(await screen.findByText('Cette liste n’est plus enregistrée.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à Mes listes' })).toHaveAttribute(
      'href',
      '/listes'
    );
  });

  it('on a phone, puts Enregistrée, Piocher and the menu under the name', async () => {
    stubMatchMedia(true);
    server.use(...useServer());
    renderPage();

    expect(await screen.findByRole('button', { name: 'Enregistrée' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Piocher' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions de la liste' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter' })).toBeNull();
  });
});
