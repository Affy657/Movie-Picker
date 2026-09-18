import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { EventMoviesSectionProps } from '@/features/events/pages/event-detail/EventMoviesSection';

const track = vi.fn();
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track }),
}));

import EventMoviesSection from '@/features/events/pages/event-detail/EventMoviesSection';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubHoverCapability, stubMatchMedia } from '@/test-utils/matchMedia';
import { TEST_API_V1 } from '@/mocks/handlers';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';

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

function watchlistHandler(items: unknown[]) {
  return http.get(`${TEST_API_V1}/watchlist`, () => HttpResponse.json({ items }));
}

const EVENT: EventData = {
  id: 'evt1',
  title: 'Soirée ciné',
  date: '2035-08-01',
  time: '22:00',
  slug: 'soiree-cine',
  isFinished: false,
  myParticipant: { id: 'p1', pseudo: 'Alice' },
  participants: [],
};

const MOVIE: MovieData = {
  id: 'm1',
  eventId: 'evt1',
  participantId: 'p1',
  tmdbId: 42,
  mediaType: 'movie',
  title: 'Matrix',
  year: '1999',
  posterPath: null,
  proposerPseudo: 'Alice',
  score: 0,
  up: 0,
  down: 0,
  voteAverage: 8.3,
  runtimeMinutes: 136,
};

function renderSection(
  props: {
    initialEntry?: string;
    movies?: MovieData[];
    watchlistItems?: unknown[];
    event?: EventData;
    refreshAll?: () => void;
    moviesQuery?: EventMoviesSectionProps['moviesQuery'];
    actionError?: string | null;
    viewMode?: 'grid' | 'list';
    winnerMovieIds?: string[];
    onRequestRemove?: (movie: MovieData) => void;
    participant?: { participantId: string; pseudo: string } | null;
    onAddMovieOpenChange?: (open: boolean) => void;
  } = {}
) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[props.initialEntry ?? '/e/soiree-cine']}>
        <EventMoviesSection
          slug="soiree-cine"
          event={props.event ?? EVENT}
          participant={
            props.participant === undefined
              ? { participantId: 'p1', pseudo: 'Alice' }
              : props.participant
          }
          hostToken={null}
          movies={props.movies ?? [MOVIE]}
          moviesQuery={
            props.moviesQuery ?? {
              isPending: false,
              isError: false,
              isSuccess: true,
              error: null,
              refetch: vi.fn(),
            }
          }
          actionError={props.actionError ?? null}
          onDismissActionError={() => undefined}
          setActionError={() => undefined}
          refreshAll={props.refreshAll ?? (() => undefined)}
          onRequestRemove={props.onRequestRemove ?? (() => undefined)}
          viewMode={props.viewMode ?? 'grid'}
          addMovieOpen={false}
          onAddMovieOpenChange={props.onAddMovieOpenChange ?? (() => undefined)}
          addMovieTriggerRef={{ current: null }}
          winnerMovieIds={props.winnerMovieIds}
        />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('EventMoviesSection (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => track.mockReset());
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  describe('empty state', () => {
    it('invites a participant to propose the first movie, with the button inside', async () => {
      const user = userEvent.setup();
      server.use(authedUserHandler, watchlistHandler([]));
      const onAddMovieOpenChange = vi.fn();
      renderSection({ movies: [], onAddMovieOpenChange });

      expect(screen.getByText('Aucun film proposé')).toBeInTheDocument();
      expect(
        screen.getByText('Proposez le premier film, la roue viendra ensuite.')
      ).toBeInTheDocument();
      await user.click(
        within(screen.getByRole('region', { name: 'Films proposés' })).getByRole('button', {
          name: 'Proposer un film',
        })
      );
      expect(onAddMovieOpenChange).toHaveBeenCalledWith(true);
    });

    it('tells a visitor to join first and offers no proposal button', () => {
      server.use(authedUserHandler, watchlistHandler([]));
      renderSection({ movies: [], participant: null });

      expect(
        screen.getByText('Rejoignez la soirée pour proposer le premier film.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Proposer un film' })).not.toBeInTheDocument();
    });

    it('shows nothing for a finished movie night, the closed state speaks instead', () => {
      server.use(authedUserHandler, watchlistHandler([]));
      renderSection({ movies: [], event: { ...EVENT, isFinished: true } });

      expect(screen.queryByText('Aucun film proposé')).not.toBeInTheDocument();
    });
  });

  it('adds a movie to the watchlist with vote/runtime from the movie night page', async () => {
    stubHoverCapability();
    let addedBody: Record<string, unknown> | null = null;
    server.use(
      authedUserHandler,
      watchlistHandler([]),
      http.post(`${TEST_API_V1}/watchlist`, async ({ request }) => {
        addedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { tmdbId: 42, mediaType: 'movie', title: 'Matrix', year: '1999' },
          { status: 201 }
        );
      })
    );

    renderSection();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /plus d.actions.*matrix/i }));
    await user.click(await screen.findByRole('menuitem', { name: /ajouter à ma liste/i }));

    await waitFor(() => expect(addedBody).not.toBeNull());
    expect(addedBody).toMatchObject({
      tmdbId: 42,
      voteAverage: 8.3,
      runtimeMinutes: 136,
    });
  });

  it('removes a movie from the watchlist from the movie night page', async () => {
    stubHoverCapability();
    let removeCalled = false;
    server.use(
      authedUserHandler,
      watchlistHandler([
        {
          tmdbId: 42,
          mediaType: 'movie',
          title: 'Matrix',
          year: '1999',
          posterPath: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]),
      http.delete(`${TEST_API_V1}/watchlist/42`, () => {
        removeCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderSection();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /plus d.actions.*matrix/i }));
    await user.click(await screen.findByRole('menuitem', { name: /retirer de ma liste/i }));

    await waitFor(() => expect(removeCalled).toBe(true));
  });
  it('the host excludes a movie from the draw through the card menu', async () => {
    stubHoverCapability();
    let excludedBody: Record<string, unknown> | null = null;
    const refreshAll = vi.fn();
    server.use(
      authedUserHandler,
      watchlistHandler([]),
      http.put(
        `${TEST_API_V1}/events/soiree-cine/movies/m1/wheel-exclusion`,
        async ({ request }) => {
          excludedBody = (await request.json()) as Record<string, unknown>;
          return new HttpResponse(null, { status: 204 });
        }
      )
    );

    renderSection({ event: { ...EVENT, isHost: true }, refreshAll });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /plus d.actions.*matrix/i }));
    await user.click(await screen.findByRole('menuitem', { name: /exclure du tirage/i }));

    await waitFor(() => expect(excludedBody).toEqual({ excluded: true }));
    await waitFor(() => expect(refreshAll).toHaveBeenCalled());
  });

  it('removing a movie from the card menu asks for confirmation instead of removing it directly', async () => {
    stubHoverCapability();
    let removeCalled = false;
    server.use(
      authedUserHandler,
      watchlistHandler([]),
      http.delete(`${TEST_API_V1}/events/soiree-cine/movies/m1`, () => {
        removeCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const onRequestRemove = vi.fn();
    renderSection({ onRequestRemove });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /plus d.actions.*matrix/i }));
    await user.click(await screen.findByRole('menuitem', { name: /^retirer matrix$/i }));

    expect(onRequestRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    expect(removeCalled).toBe(false);
  });

  it('a non-host participant has no exclusion action', async () => {
    stubHoverCapability();
    server.use(authedUserHandler, watchlistHandler([]));

    renderSection();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /plus d.actions.*matrix/i }));
    expect(screen.queryByRole('menuitem', { name: /tirage/i })).not.toBeInTheDocument();
  });

  it('without hover capability: no kebab, the poster still opens the details', async () => {
    server.use(
      authedUserHandler,
      watchlistHandler([]),
      http.get(`${TEST_API_V1}/movies/tmdb/42/details`, () =>
        HttpResponse.json({ tmdbId: 42, watchProviders: [] })
      )
    );
    renderSection();
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Matrix' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /plus d.actions.*matrix/i })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voir les détails de « matrix »/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter à ma liste' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Proposer dans une soirée' })
    ).not.toBeInTheDocument();
  });

  it('a ?film address opens the details of that movie of the night, and closing clears it', async () => {
    server.use(
      authedUserHandler,
      watchlistHandler([]),
      http.get(`${TEST_API_V1}/movies/tmdb/42/details`, () =>
        HttpResponse.json({ tmdbId: 42, title: 'Matrix', watchProviders: [] })
      )
    );
    renderSection({ initialEntry: '/e/soiree-cine?film=42' });
    const user = userEvent.setup();

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Matrix', level: 2 })).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: /la soirée/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await user.click(within(dialog).getByRole('button', { name: /fermer/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('hover, host: the kebab lists the items in the unified order', async () => {
    stubHoverCapability();
    server.use(authedUserHandler, watchlistHandler([]));
    renderSection({ event: { ...EVENT, isHost: true } });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /plus d.actions.*matrix/i }));
    const names = screen
      .getAllByRole('menuitem')
      .map((item) => item.getAttribute('aria-label') ?? item.textContent);
    expect(names).toEqual([
      'Voir les détails',
      'Ajouter à ma liste',
      'Exclure du tirage',
      'Ouvrir sur Letterboxd',
      'Retirer Matrix',
    ]);
    expect(
      screen.queryByRole('menuitem', { name: /proposer dans une soirée/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /imdb|allociné|tmdb/i })).not.toBeInTheDocument();
  });

  it('affiche le chargement et le bandeau d’erreur', () => {
    server.use(authedUserHandler, watchlistHandler([]));
    renderSection({
      moviesQuery: {
        isPending: true,
        isError: false,
        isSuccess: false,
        error: null,
        refetch: vi.fn(),
      },
      actionError: 'Vote impossible',
      movies: [],
    });

    expect(screen.getByText(/chargement des films/i)).toBeInTheDocument();
    expect(screen.getByText('Vote impossible')).toBeInTheDocument();
  });

  it('permet de trier en vue grille', async () => {
    server.use(authedUserHandler, watchlistHandler([]));
    const second: MovieData = { ...MOVIE, id: 'm2', title: 'Inception', score: 4 };
    renderSection({
      movies: [MOVIE, second],
      viewMode: 'grid',
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /^votes$/i }));
    expect(screen.getByRole('button', { name: /^votes$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('offers no grid/list toggle on mobile and lays the movies out as a list whatever is stored', () => {
    stubMatchMedia(true);
    server.use(authedUserHandler, watchlistHandler([]));
    renderSection({ movies: [MOVIE], viewMode: 'grid' });

    expect(screen.queryByRole('button', { name: /affichage liste/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plus d.actions.*matrix/i })).toHaveAttribute(
      'aria-haspopup',
      'menu'
    );
  });

  it('on mobile, the seen chip shows a count only once someone has seen the movie', () => {
    stubMatchMedia(true);
    server.use(authedUserHandler, watchlistHandler([]));
    renderSection({ movies: [MOVIE, { ...MOVIE, id: 'm2', title: 'Alien', seenCount: 2 }] });

    expect(
      screen.getByRole('button', { name: /marquer « déjà vu » pour matrix/i })
    ).toHaveTextContent(/^Déjà vu$/);
    expect(
      screen.getByRole('button', { name: /marquer « déjà vu » pour alien/i })
    ).toHaveTextContent('Déjà vu (2)');
  });

  it('does not show the grid/list toggle on desktop (moved to the header)', () => {
    server.use(authedUserHandler, watchlistHandler([]));
    renderSection({ movies: [MOVIE], viewMode: 'grid' });

    expect(screen.queryByRole('button', { name: /affichage liste/i })).not.toBeInTheDocument();
  });

  it('affiche le tri en vue liste sur mobile (colonnes triables absentes sur mobile)', () => {
    stubMatchMedia(true);
    server.use(authedUserHandler, watchlistHandler([]));
    const second: MovieData = { ...MOVIE, id: 'm2', title: 'Inception', score: 4 };
    renderSection({ movies: [MOVIE, second], viewMode: 'list' });

    expect(screen.getByRole('button', { name: /votes/i })).toBeInTheDocument();
  });

  it("n'affiche pas le composant de tri en vue liste sur desktop (colonnes triables au clic)", () => {
    server.use(authedUserHandler, watchlistHandler([]));
    const second: MovieData = { ...MOVIE, id: 'm2', title: 'Inception', score: 4 };
    renderSection({ movies: [MOVIE, second], viewMode: 'list' });

    expect(screen.queryByRole('toolbar', { name: /trier par/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^votes$/i })).not.toBeInTheDocument();
  });

  it('pins the winning movie at the top and shows its badge', () => {
    server.use(authedUserHandler, watchlistHandler([]));
    const later: MovieData = {
      ...MOVIE,
      id: 'm2',
      title: 'Inception',
      createdAt: '2030-01-02',
    };
    const earlier: MovieData = { ...MOVIE, createdAt: '2030-01-01' };
    renderSection({
      movies: [earlier, later],
      viewMode: 'list',
      winnerMovieIds: ['m2'],
    });

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0]).toHaveTextContent('Inception');
    expect(screen.getByText('Film gagnant')).toBeInTheDocument();
  });

  it('pins the winners in draw order, not in sort order', () => {
    server.use(authedUserHandler, watchlistHandler([]));
    const second: MovieData = { ...MOVIE, id: 'm2', title: 'Inception', createdAt: '2030-01-02' };
    const third: MovieData = { ...MOVIE, id: 'm3', title: 'Whiplash', createdAt: '2030-01-03' };
    renderSection({
      movies: [MOVIE, second, third],
      viewMode: 'list',
      winnerMovieIds: ['m3', 'm2'],
    });

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0]).toHaveTextContent('Whiplash');
    expect(headings[1]).toHaveTextContent('Inception');
    expect(screen.getByText('Gagnant 1')).toBeInTheDocument();
    expect(screen.getByText('Gagnant 2')).toBeInTheDocument();
  });

  it('sends vote_cast after voting for a movie', async () => {
    let voted: Record<string, unknown> | null = null;
    server.use(
      authedUserHandler,
      watchlistHandler([]),
      http.post(`${TEST_API_V1}/events/soiree-cine/movies/m1/vote`, async ({ request }) => {
        voted = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderSection();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /voter pour matrix/i }));

    await waitFor(() => expect(voted).toEqual({ participantId: 'p1', value: 1 }));
    expect(track).toHaveBeenCalledWith('vote_cast', { value: 1 });
  });

  it('sends vote_cast cleared when the same vote is removed', async () => {
    let cleared = false;
    server.use(
      authedUserHandler,
      watchlistHandler([]),
      http.delete(`${TEST_API_V1}/events/soiree-cine/movies/m1/vote`, () => {
        cleared = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderSection({ movies: [{ ...MOVIE, myVote: 1 }] });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /retirer mon vote pour/i }));

    await waitFor(() => expect(cleared).toBe(true));
    expect(track).toHaveBeenCalledWith('vote_cast', { value: 1, cleared: true });
  });

  describe('limite de votes', () => {
    const SECOND_MOVIE: MovieData = { ...MOVIE, id: 'm2', tmdbId: 43, title: 'Alien' };
    const limitedEvent = (max: number): EventData => ({
      ...EVENT,
      config: {
        theme: null,
        maxProposalsPerParticipant: null,
        maxParticipants: null,
        maxVotesPerParticipant: max,
        wheelMode: 'weightedByVotes',
        winnerCount: 1,
      },
    });

    it('sous la limite, le vote part normalement', async () => {
      let voted = false;
      server.use(
        authedUserHandler,
        watchlistHandler([]),
        http.post(`${TEST_API_V1}/events/soiree-cine/movies/m2/vote`, () => {
          voted = true;
          return new HttpResponse(null, { status: 204 });
        })
      );
      renderSection({ event: limitedEvent(2), movies: [{ ...MOVIE, myVote: 1 }, SECOND_MOVIE] });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /voter pour alien/i }));

      await waitFor(() => expect(voted).toBe(true));
      expect(screen.getByTestId('vote-limit-dialog')).not.toHaveAttribute('open');
    });

    it('affiche le quota de votes du participant', () => {
      server.use(authedUserHandler, watchlistHandler([]));
      renderSection({ event: limitedEvent(2), movies: [{ ...MOVIE, myVote: 1 }, SECOND_MOVIE] });

      expect(screen.getByTestId('vote-quota')).toHaveTextContent('Votes posés : 1 sur 2');
    });

    it('limit reached: the thumbs of the other movies are disabled and explained', () => {
      server.use(authedUserHandler, watchlistHandler([]));
      renderSection({ event: limitedEvent(1), movies: [{ ...MOVIE, myVote: -1 }, SECOND_MOVIE] });

      const upvote = screen.getByRole('button', { name: /voter pour alien/i });
      expect(upvote).toBeDisabled();
      expect(screen.getByRole('button', { name: /voter contre alien/i })).toBeDisabled();
      expect(screen.getByRole('toolbar', { name: /votes pour « alien »/i })).toHaveAttribute(
        'title',
        'Votre vote est posé. Retirez-le pour voter pour ce film.'
      );
      expect(
        screen.getByRole('button', { name: /retirer mon vote contre « matrix »/i })
      ).toBeEnabled();
      expect(screen.getByTestId('vote-quota')).toHaveTextContent('Votes posés : 1 sur 1');
      expect(screen.getByTestId('vote-limit-dialog')).not.toHaveAttribute('open');
    });

    it('limit reached: removing or changing a vote already cast stays possible', async () => {
      let cleared = false;
      let flipped = false;
      server.use(
        authedUserHandler,
        watchlistHandler([]),
        http.delete(`${TEST_API_V1}/events/soiree-cine/movies/m1/vote`, () => {
          cleared = true;
          return new HttpResponse(null, { status: 204 });
        }),
        http.post(`${TEST_API_V1}/events/soiree-cine/movies/m2/vote`, () => {
          flipped = true;
          return new HttpResponse(null, { status: 204 });
        })
      );
      renderSection({
        event: limitedEvent(2),
        movies: [
          { ...MOVIE, myVote: -1 },
          { ...SECOND_MOVIE, myVote: -1 },
        ],
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /retirer mon vote contre « matrix »/i }));
      await waitFor(() => expect(cleared).toBe(true));

      await user.click(screen.getByRole('button', { name: /voter pour alien/i }));
      await waitFor(() => expect(flipped).toBe(true));
      expect(screen.getByTestId('vote-limit-dialog')).not.toHaveAttribute('open');
    });

    it('a 409 from the API on a new vote opens the window and resynchronises the list', async () => {
      const refreshAll = vi.fn();
      server.use(
        authedUserHandler,
        watchlistHandler([]),
        http.post(`${TEST_API_V1}/events/soiree-cine/movies/m2/vote`, () =>
          HttpResponse.json(
            {
              error: 'Limite de 2 vote(s) par participant atteinte.',
              code: 409,
              reason: 'vote-limit-reached',
            },
            { status: 409 }
          )
        )
      );
      renderSection({
        event: limitedEvent(2),
        movies: [{ ...MOVIE, myVote: 1 }, SECOND_MOVIE],
        refreshAll,
        viewMode: 'list',
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /voter pour alien/i }));

      await waitFor(() => expect(screen.getByTestId('vote-limit-dialog')).toHaveAttribute('open'));
      expect(refreshAll).toHaveBeenCalled();
      expect(screen.queryByText(/limite de 2 vote\(s\)/i)).not.toBeInTheDocument();
    });

    it('another 409 on a new vote does not open the limit window but shows the error', async () => {
      server.use(
        authedUserHandler,
        watchlistHandler([]),
        http.post(`${TEST_API_V1}/events/soiree-cine/movies/m2/vote`, () =>
          HttpResponse.json(
            { error: 'La roue a déjà été lancée : les votes sont figés.', code: 409 },
            { status: 409 }
          )
        )
      );
      renderSection({
        event: limitedEvent(2),
        movies: [{ ...MOVIE, myVote: 1 }, SECOND_MOVIE],
        viewMode: 'list',
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /voter pour alien/i }));

      expect(await screen.findByText(/la roue a déjà été lancée/i)).toBeInTheDocument();
      expect(screen.getByTestId('vote-limit-dialog')).not.toHaveAttribute('open');
    });

    it('the message uses the plural when the limit exceeds one vote', () => {
      server.use(authedUserHandler, watchlistHandler([]));
      renderSection({
        event: limitedEvent(2),
        movies: [
          { ...MOVIE, myVote: 1 },
          { ...SECOND_MOVIE, myVote: 1 },
          { ...MOVIE, id: 'm3', title: 'Heat' },
        ],
      });

      expect(screen.getByRole('button', { name: /voter pour heat/i })).toBeDisabled();
      expect(screen.getByRole('toolbar', { name: /votes pour « heat »/i })).toHaveAttribute(
        'title',
        'Vos 2 votes sont posés. Retirez-en un pour voter pour ce film.'
      );
    });
  });

  it('vote failure in list view: the error appears on the row, not in the global banner, and Retry casts the vote again', async () => {
    let attempts = 0;
    server.use(
      authedUserHandler,
      watchlistHandler([]),
      http.post(`${TEST_API_V1}/events/soiree-cine/movies/m1/vote`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json({ message: 'Erreur serveur' }, { status: 500 });
        }
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderSection({ viewMode: 'list' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /voter pour matrix/i }));

    const retryButton = await screen.findByRole('button', { name: /réessayer/i });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(retryButton);
    await waitFor(() => expect(attempts).toBe(2));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument()
    );
  });
});
