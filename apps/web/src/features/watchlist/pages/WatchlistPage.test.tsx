import { beforeAll, afterEach, afterAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import WatchlistPage from '@/features/watchlist/pages/WatchlistPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/watchlist']}>
        <WatchlistPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

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

const ITEM_A = {
  tmdbId: 200,
  mediaType: 'movie',
  title: 'Ancien Mais Bien Noté',
  year: '2000',
  posterPath: null,
  voteAverage: 9.0,
  runtimeMinutes: 90,
  createdAt: '2026-01-01T00:00:00Z',
};

const ITEM_B = {
  tmdbId: 201,
  mediaType: 'movie',
  title: 'Recent Mais Mal Noté',
  year: '2010',
  posterPath: null,
  voteAverage: 3.0,
  runtimeMinutes: 200,
  createdAt: '2026-02-01T00:00:00Z',
};

function watchlistHandler(items: unknown[]) {
  return http.get(`${TEST_API_V1}/watchlist`, () => HttpResponse.json({ items }));
}

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
});

describe('WatchlistPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche un empty state quand la watchlist est vide', async () => {
    server.use(authedUserHandler, watchlistHandler([]));

    renderPage();

    expect(await screen.findByText(/votre liste est vide/i)).toBeInTheDocument();
  });

  it('filtre la liste par note minimum puis réinitialise', async () => {
    server.use(authedUserHandler, watchlistHandler([ITEM_A, ITEM_B]));

    renderPage();

    const list = await screen.findByRole('list', { name: /films de ma liste/i });
    const titlesInOrder = () =>
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent ?? '');

    await waitFor(() => expect(titlesInOrder()).toHaveLength(2));

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^filtres$/i }));

    await user.click(screen.getByRole('button', { name: /8\+/ }));
    await waitFor(() => {
      const titles = titlesInOrder();
      expect(titles).toHaveLength(1);
      expect(titles[0]).toContain('Ancien Mais Bien Noté');
    });
    expect(screen.getByText('1 sur 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /réinitialiser les filtres/i }));
    await waitFor(() => expect(titlesInOrder()).toHaveLength(2));
  });

  it('recherche un titre dans la liste et efface tout depuis le compteur', async () => {
    server.use(authedUserHandler, watchlistHandler([ITEM_A, ITEM_B]));

    renderPage();

    const list = await screen.findByRole('list', { name: /films de ma liste/i });
    const titlesInOrder = () =>
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent ?? '');

    await waitFor(() => expect(titlesInOrder()).toHaveLength(2));
    expect(screen.queryByText(/sur 2/)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: /rechercher dans ma liste/i }), 'Ancien');

    await waitFor(() => {
      const titles = titlesInOrder();
      expect(titles).toHaveLength(1);
      expect(titles[0]).toContain('Ancien Mais Bien Noté');
    });
    expect(screen.getByText('1 sur 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tout effacer/i }));
    await waitFor(() => expect(titlesInOrder()).toHaveLength(2));
  });

  it("n'affiche aucun résultat quand la recherche ne correspond à rien, avec un bouton de réinitialisation", async () => {
    server.use(authedUserHandler, watchlistHandler([ITEM_A, ITEM_B]));

    renderPage();

    await screen.findByRole('list', { name: /films de ma liste/i });

    const user = userEvent.setup();
    await user.type(
      screen.getByRole('searchbox', { name: /rechercher dans ma liste/i }),
      'Introuvable'
    );

    expect(await screen.findByText(/aucun titre ne correspond/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /réinitialiser les filtres/i }));

    expect(await screen.findByRole('list', { name: /films de ma liste/i })).toBeInTheDocument();
  });

  it('trie par ajout (défaut), note et durée, et inverse le sens au second clic', async () => {
    server.use(authedUserHandler, watchlistHandler([ITEM_A, ITEM_B]));

    renderPage();

    const list = await screen.findByRole('list', { name: /films de ma liste/i });
    const titlesInOrder = () =>
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent ?? '');

    await waitFor(() => {
      const [first, second] = titlesInOrder();
      expect(first).toContain('Recent Mais Mal Noté');
      expect(second).toContain('Ancien Mais Bien Noté');
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^note$/i }));
    await waitFor(() => {
      const [first, second] = titlesInOrder();
      expect(first).toContain('Ancien Mais Bien Noté');
      expect(second).toContain('Recent Mais Mal Noté');
    });

    await user.click(screen.getByRole('button', { name: /^durée$/i }));
    await waitFor(() => {
      const [first, second] = titlesInOrder();
      expect(first).toContain('Ancien Mais Bien Noté');
      expect(second).toContain('Recent Mais Mal Noté');
    });

    await user.click(screen.getByRole('button', { name: /^durée$/i }));
    await waitFor(() => {
      const [first, second] = titlesInOrder();
      expect(first).toContain('Recent Mais Mal Noté');
      expect(second).toContain('Ancien Mais Bien Noté');
    });
  });

  it('recherche un film, l’ajoute avec note/durée, ferme la recherche', async () => {
    let addedBody: Record<string, unknown> | null = null;
    server.use(
      authedUserHandler,
      watchlistHandler([]),
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
              watchProviders: [],
              tmdbWatchPageUrl: null,
            },
          ],
          watchProvidersRegion: 'FR',
          disclaimer: '',
          tmdbAttributionUrl: '',
        })
      ),
      http.post(`${TEST_API_V1}/watchlist`, async ({ request }) => {
        addedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { tmdbId: 100, mediaType: 'movie', title: 'Film Test', year: '2024' },
          { status: 201 }
        );
      })
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /ajouter un film/i }));
    await user.type(screen.getByPlaceholderText(/rechercher un film à ajouter/i), 'Film Test');
    expect(await screen.findByText('Film Test', {}, { timeout: 3000 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));

    await waitFor(() => expect(addedBody).not.toBeNull());
    expect(addedBody).toMatchObject({
      tmdbId: 100,
      title: 'Film Test',
      voteAverage: 7.5,
      runtimeMinutes: 112,
    });

    // The search bar clears/closes once the movie has been added.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^ajouter$/i })).not.toBeInTheDocument()
    );
  });

  it('retire un film via le menu kebab', async () => {
    let removeCalled = false;
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      http.delete(`${TEST_API_V1}/watchlist/200`, () => {
        removeCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(
      screen.getByRole('button', { name: /plus d.actions.*ancien mais bien noté/i })
    );
    await user.click(screen.getByRole('menuitem', { name: /retirer/i }));

    await waitFor(() => expect(removeCalled).toBe(true));
  });

  it('affiche les détails d’un film', async () => {
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      http.get(`${TEST_API_V1}/movies/tmdb/200/details`, () =>
        HttpResponse.json({
          tmdbId: 200,
          title: 'Ancien Mais Bien Noté',
          overview: 'Un synopsis de test.',
          tagline: null,
          director: 'Une Réalisatrice',
          cast: ['Acteur A'],
          runtimeMinutes: 90,
          genres: ['Drame'],
          releaseDate: '2000-01-01',
          trailerUrl: null,
        })
      )
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(screen.getByRole('button', { name: /détails/i }));

    expect(await screen.findByText('Une Réalisatrice')).toBeInTheDocument();
    expect(screen.getByText(/un synopsis de test/i)).toBeInTheDocument();
  });

  it('propose un film à une soirée depuis la modal (fallback tactile)', async () => {
    let proposedBody: Record<string, unknown> | null = null;
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      http.get(`${TEST_API_V1}/events/mine`, () =>
        HttpResponse.json({
          events: [
            {
              id: 'e1',
              slug: 'ma-soiree',
              title: 'Chez moi',
              date: '2035-08-01',
              time: '22:00',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
              isCreator: true,
              isParticipant: true,
              lifecycle: 'upcoming',
              participantCount: 1,
              movieCount: 0,
            },
          ],
        })
      ),
      http.get(`${TEST_API_V1}/events/slug/ma-soiree`, () =>
        HttpResponse.json({
          _id: 'e1',
          title: 'Chez moi',
          date: '2035-08-01',
          time: '22:00',
          slug: 'ma-soiree',
          isFinished: false,
          myParticipant: { _id: 'p1', pseudo: 'Alice' },
          participantCount: 1,
          movieCount: 0,
          participants: [],
          config: {},
        })
      ),
      http.post(`${TEST_API_V1}/events/ma-soiree/movies`, async ({ request }) => {
        proposedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ _id: 'm1', title: 'Ancien Mais Bien Noté' }, { status: 201 });
      })
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(
      screen.getByRole('button', { name: /plus d.actions.*ancien mais bien noté/i })
    );
    await user.click(screen.getByRole('menuitem', { name: /proposer dans une soirée/i }));

    await screen.findByText(/proposer «\s*ancien mais bien noté\s*» dans une soirée/i);
    await user.click(screen.getByRole('button', { name: /chez moi/i }));

    await waitFor(() => expect(proposedBody).not.toBeNull());
    expect(proposedBody).toMatchObject({ tmdbId: 200, participantId: 'p1' });
    expect(await screen.findByText(/^proposé$/i)).toBeInTheDocument();
  });

  it('propose un film via le sous-menu au survol (desktop)', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    let proposedBody: Record<string, unknown> | null = null;
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      http.get(`${TEST_API_V1}/events/mine`, () =>
        HttpResponse.json({
          events: [
            {
              id: 'e1',
              slug: 'ma-soiree',
              title: 'Chez moi',
              date: '2035-08-01',
              time: '22:00',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
              isCreator: true,
              isParticipant: true,
              lifecycle: 'upcoming',
              participantCount: 1,
              movieCount: 0,
            },
          ],
        })
      ),
      http.get(`${TEST_API_V1}/events/slug/ma-soiree`, () =>
        HttpResponse.json({
          _id: 'e1',
          title: 'Chez moi',
          date: '2035-08-01',
          time: '22:00',
          slug: 'ma-soiree',
          isFinished: false,
          myParticipant: { _id: 'p1', pseudo: 'Alice' },
          participantCount: 1,
          movieCount: 0,
          participants: [],
          config: {},
        })
      ),
      http.post(`${TEST_API_V1}/events/ma-soiree/movies`, async ({ request }) => {
        proposedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ _id: 'm1', title: 'Ancien Mais Bien Noté' }, { status: 201 });
      })
    );

    renderPage();
    await screen.findByText('Ancien Mais Bien Noté');

    expect(
      screen.queryByRole('menuitem', { name: /proposer dans une soirée/i })
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole('button', { name: /proposer dans une soirée/i }));
    const eventButton = await screen.findByText('Chez moi');

    const user = userEvent.setup();
    await user.click(eventButton);

    await waitFor(() => expect(proposedBody).not.toBeNull());
    expect(proposedBody).toMatchObject({ tmdbId: 200, participantId: 'p1' });

    vi.unstubAllGlobals();
  });

  it("propose l'import Letterboxd quand aucun pseudo n'est configuré, et ouvre la modale de connexion", async () => {
    server.use(authedUserHandler, watchlistHandler([ITEM_A]));

    renderPage();

    const trigger = await screen.findByRole('button', { name: /importer depuis letterboxd/i });
    const user = userEvent.setup();
    await user.click(trigger);

    expect(
      await screen.findByRole('heading', { name: /importer depuis letterboxd/i })
    ).toBeInTheDocument();
  });

  it("masque l'incitation Letterboxd une fois le pseudo configuré", async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u1',
          displayName: 'Alice',
          emailMasked: 'a***@test.local',
          uiTheme: 'system',
          accentColor: 'default',
          ratingScale: 'ten',
          letterboxdUsername: 'alice_lb',
        })
      ),
      watchlistHandler([ITEM_A])
    );

    renderPage();

    await screen.findByText(ITEM_A.title);
    expect(
      screen.queryByRole('button', { name: /importer depuis letterboxd/i })
    ).not.toBeInTheDocument();
  });

  it('sur mobile, affiche Importer à côté de Ajouter avec un libellé court', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    server.use(authedUserHandler, watchlistHandler([ITEM_A]));

    renderPage();

    const importBtn = await screen.findByRole('button', { name: 'Importer' });
    const addBtn = screen.getByRole('button', { name: 'Ajouter' });
    expect(importBtn.parentElement).toBe(addBtn.parentElement);
    expect(screen.queryByText('Importer depuis Letterboxd')).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
