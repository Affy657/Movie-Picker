import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
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
    movies?: MovieData[];
    watchlistItems?: unknown[];
    event?: EventData;
    refreshAll?: () => void;
    moviesQuery?: EventMoviesSectionProps['moviesQuery'];
    actionError?: string | null;
    viewMode?: 'grid' | 'list';
    onViewModeChange?: (mode: 'grid' | 'list') => void;
    winnerMovieIds?: string[];
    onRequestRemove?: (movie: MovieData) => void;
  } = {}
) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <EventMoviesSection
          slug="soiree-cine"
          event={props.event ?? EVENT}
          participant={{ participantId: 'p1', pseudo: 'Alice' }}
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
          onViewModeChange={props.onViewModeChange ?? (() => undefined)}
          addMovieOpen={false}
          onAddMovieOpenChange={() => undefined}
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

  it('ajoute un film à la watchlist avec vote/durée depuis la page soirée', async () => {
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

  it('retire un film de la watchlist depuis la page soirée', async () => {
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
  it("l'hôte exclut un film du tirage depuis le menu de la card", async () => {
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

  it('retirer un film depuis le menu de la carte demande confirmation au lieu de le retirer directement', async () => {
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

  it("un participant non hôte n'a pas l'action d'exclusion", async () => {
    server.use(authedUserHandler, watchlistHandler([]));

    renderSection();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /plus d.actions.*matrix/i }));
    expect(screen.queryByRole('menuitem', { name: /tirage/i })).not.toBeInTheDocument();
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

  it('affiche la bascule grille/liste en vue mobile uniquement', () => {
    stubMatchMedia(true);
    server.use(authedUserHandler, watchlistHandler([]));
    const onViewModeChange = vi.fn();
    renderSection({ movies: [MOVIE], viewMode: 'grid', onViewModeChange });

    expect(screen.getByRole('button', { name: /affichage liste/i })).toBeInTheDocument();
  });

  it("n'affiche pas la bascule grille/liste sur desktop (déplacée dans l'en-tête)", () => {
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
    expect(screen.getByRole('button', { name: /affichage grille/i })).toBeInTheDocument();
  });

  it("n'affiche pas le composant de tri en vue liste sur desktop (colonnes triables au clic)", () => {
    server.use(authedUserHandler, watchlistHandler([]));
    const second: MovieData = { ...MOVIE, id: 'm2', title: 'Inception', score: 4 };
    renderSection({ movies: [MOVIE, second], viewMode: 'list' });

    expect(screen.queryByRole('toolbar', { name: /trier par/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^votes$/i })).not.toBeInTheDocument();
  });

  it('épingle le film gagnant en tête et affiche son badge', () => {
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

  it('épingle les gagnants dans l ordre des tirages, pas dans celui du tri', () => {
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

  it('envoie vote_cast après un vote pour un film', async () => {
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

  it('envoie vote_cast cleared quand le même vote est retiré', async () => {
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

  it("échec de vote en vue liste : l'erreur apparaît sur la ligne, pas dans le bandeau global, et Réessayer relance le vote", async () => {
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
