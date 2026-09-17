import { beforeAll, afterEach, afterAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import WatchlistPage from '@/features/watchlist/pages/WatchlistPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubHoverCapability, stubMatchMedia } from '@/test-utils/matchMedia';
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

const KEBAB_A = /plus d.actions.*ancien mais bien noté/i;
const POSTER_A = /voir les détails de « ancien mais bien noté »/i;

function watchlistHandler(items: unknown[]) {
  return http.get(`${TEST_API_V1}/watchlist`, () => HttpResponse.json({ items }));
}

const detailsHandler = http.get(`${TEST_API_V1}/movies/tmdb/200/details`, () =>
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
    watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
    tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/200/watch',
  })
);

function proposeHandlers(onProposed: (body: Record<string, unknown>) => void) {
  return [
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
      onProposed((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ _id: 'm1', title: 'Ancien Mais Bien Noté' }, { status: 201 });
    }),
  ];
}

function removeHandler(onRemoved: () => void) {
  return http.delete(`${TEST_API_V1}/watchlist/200`, () => {
    onRemoved();
    return new HttpResponse(null, { status: 204 });
  });
}

const previouslyFocused = new WeakMap<HTMLDialogElement, Element | null>();
const globalShowModal = HTMLDialogElement.prototype.showModal;
const globalClose = HTMLDialogElement.prototype.close;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    previouslyFocused.set(this, document.activeElement);
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    const previous = previouslyFocused.get(this);
    previouslyFocused.delete(this);
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    this.dispatchEvent(new Event('close'));
  };
});

afterAll(() => {
  HTMLDialogElement.prototype.showModal = globalShowModal;
  HTMLDialogElement.prototype.close = globalClose;
});

describe('WatchlistPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    localStorage.removeItem('watchlist-view');
  });
  afterAll(() => server.close());

  it('affiche un empty state quand la watchlist est vide', async () => {
    server.use(authedUserHandler, watchlistHandler([]));

    renderPage();

    expect(await screen.findByText(/votre liste est vide/i)).toBeInTheDocument();
  });

  it('filters the list by minimum rating then resets', async () => {
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

  it('shows no result when the search matches nothing, with a reset button', async () => {
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

  it('sorts by addition (default), rating and runtime, and reverses the direction on the second click', async () => {
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

  it('searches for a movie, adds it with rating/runtime, closes the search', async () => {
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

    await user.click(screen.getByRole('button', { name: /^ajouter « /i }));

    await waitFor(() => expect(addedBody).not.toBeNull());
    expect(addedBody).toMatchObject({
      tmdbId: 100,
      title: 'Film Test',
      voteAverage: 7.5,
      runtimeMinutes: 112,
    });

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^ajouter « /i })).not.toBeInTheDocument()
    );
  });

  it('hover: removes a movie from the kebab through the watchlist toggle', async () => {
    stubHoverCapability();
    let removeCalled = false;
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      removeHandler(() => {
        removeCalled = true;
      })
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(screen.getByRole('button', { name: KEBAB_A }));
    await user.click(screen.getByRole('menuitem', { name: /retirer de ma liste/i }));

    await waitFor(() => expect(removeCalled).toBe(true));
  });

  it('hover: the kebab lists details, the watchlist toggle, the proposal and Letterboxd in order', async () => {
    stubHoverCapability();
    server.use(authedUserHandler, watchlistHandler([ITEM_A]));

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(screen.getByRole('button', { name: KEBAB_A }));

    const names = screen
      .getAllByRole('menuitem')
      .map((item) => item.getAttribute('aria-label') ?? item.textContent?.trim());
    expect(names).toEqual([
      'Voir les détails',
      'Retirer de ma liste',
      'Proposer dans une soirée',
      'Ouvrir sur Letterboxd',
    ]);
    expect(screen.queryByRole('menuitem', { name: /^retirer$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /imdb|allociné|tmdb/i })).not.toBeInTheDocument();
  });

  it('shows the details of a movie from the poster', async () => {
    server.use(authedUserHandler, watchlistHandler([ITEM_A]), detailsHandler);

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(screen.getByRole('button', { name: POSTER_A }));

    expect(await screen.findByText('Une Réalisatrice')).toBeInTheDocument();
    expect(screen.getByText(/un synopsis de test/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /où regarder/i }));
    expect(await screen.findByText('Netflix')).toBeInTheDocument();
  });

  it('touch: mounts no kebab, the poster trigger opens the details', async () => {
    server.use(authedUserHandler, watchlistHandler([ITEM_A]));

    renderPage();

    await screen.findByText('Ancien Mais Bien Noté');
    expect(screen.queryByRole('button', { name: /plus d.actions/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: POSTER_A })).toBeInTheDocument();
  });

  it('touch: proposes from the details modal footer, after the details dialog closed', async () => {
    let proposedBody: Record<string, unknown> | null = null;
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      detailsHandler,
      ...proposeHandlers((body) => {
        proposedBody = body;
      })
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(screen.getByRole('button', { name: POSTER_A }));
    await screen.findByRole('heading', { name: 'Ancien Mais Bien Noté', level: 2 });

    await user.click(screen.getByRole('button', { name: 'Proposer dans une soirée' }));

    await screen.findByText(/proposer «\s*ancien mais bien noté\s*» dans une soirée/i);
    expect(
      screen.queryByRole('heading', { name: 'Ancien Mais Bien Noté', level: 2 })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /chez moi/i }));

    await waitFor(() => expect(proposedBody).not.toBeNull());
    expect(proposedBody).toMatchObject({ tmdbId: 200, participantId: 'p1' });
    expect(await screen.findByText(/^proposé$/i)).toBeInTheDocument();
  });

  it('touch: the details modal footer removes the movie from the watchlist', async () => {
    let removeCalled = false;
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      detailsHandler,
      removeHandler(() => {
        removeCalled = true;
      })
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(screen.getByRole('button', { name: POSTER_A }));
    await screen.findByRole('heading', { name: 'Ancien Mais Bien Noté', level: 2 });

    await user.click(screen.getByRole('button', { name: 'Retirer de ma liste' }));

    await waitFor(() => expect(removeCalled).toBe(true));
  });

  it('hover: proposes from the kebab through the modal, the flyout is gone', async () => {
    stubHoverCapability();
    let proposedBody: Record<string, unknown> | null = null;
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      ...proposeHandlers((body) => {
        proposedBody = body;
      })
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    expect(screen.queryByRole('button', { name: /^proposer$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: KEBAB_A }));
    await user.click(screen.getByRole('menuitem', { name: /proposer dans une soirée/i }));

    await screen.findByText(/proposer «\s*ancien mais bien noté\s*» dans une soirée/i);
    await user.click(screen.getByRole('button', { name: /chez moi/i }));

    await waitFor(() => expect(proposedBody).not.toBeNull());
    expect(proposedBody).toMatchObject({ tmdbId: 200, participantId: 'p1' });
    expect(await screen.findByText(/^proposé$/i)).toBeInTheDocument();
  });

  it('hover: closing the propose modal reached from the details footer lands the focus back on the kebab', async () => {
    stubHoverCapability();
    server.use(
      authedUserHandler,
      watchlistHandler([ITEM_A]),
      detailsHandler,
      ...proposeHandlers(() => {})
    );

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(screen.getByRole('button', { name: KEBAB_A }));
    await user.click(screen.getByRole('menuitem', { name: 'Voir les détails' }));
    await screen.findByRole('heading', { name: 'Ancien Mais Bien Noté', level: 2 });

    await user.click(screen.getByRole('button', { name: 'Proposer dans une soirée' }));
    await screen.findByText(/proposer «\s*ancien mais bien noté\s*» dans une soirée/i);
    expect(
      screen.queryByRole('heading', { name: 'Ancien Mais Bien Noté', level: 2 })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fermer/i }));

    await waitFor(() =>
      expect(
        screen.queryByText(/proposer «\s*ancien mais bien noté\s*» dans une soirée/i)
      ).not.toBeInTheDocument()
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: KEBAB_A }));
  });

  it('hover, list view: the kebab keeps every action', async () => {
    localStorage.setItem('watchlist-view', 'list');
    stubHoverCapability();
    server.use(authedUserHandler, watchlistHandler([ITEM_A]));

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Ancien Mais Bien Noté');
    await user.click(screen.getByRole('button', { name: KEBAB_A }));

    expect(screen.getByRole('menuitem', { name: 'Voir les détails' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Retirer de ma liste' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Proposer dans une soirée' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /letterboxd/i })).toBeInTheDocument();
  });

  it('offers the Letterboxd import when no username is configured, and opens the connection modal', async () => {
    server.use(authedUserHandler, watchlistHandler([ITEM_A]));

    renderPage();

    const trigger = await screen.findByRole('button', { name: /importer depuis letterboxd/i });
    const user = userEvent.setup();
    await user.click(trigger);

    expect(
      await screen.findByRole('heading', { name: /importer depuis letterboxd/i })
    ).toBeInTheDocument();
  });

  it('hides the Letterboxd prompt once the username is configured', async () => {
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

  it('on mobile, shows Import next to Add with a short label', async () => {
    stubMatchMedia(true);
    server.use(authedUserHandler, watchlistHandler([ITEM_A]));

    renderPage();

    const importBtn = await screen.findByRole('button', { name: 'Importer' });
    const addBtn = screen.getByRole('button', { name: 'Ajouter' });
    expect(importBtn.parentElement).toBe(addBtn.parentElement);
    expect(screen.queryByText('Importer depuis Letterboxd')).not.toBeInTheDocument();
  });
});
