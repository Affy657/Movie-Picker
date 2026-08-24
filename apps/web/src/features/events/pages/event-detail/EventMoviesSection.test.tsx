import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import EventMoviesSection from '@/features/events/pages/event-detail/EventMoviesSection';
import type { EventMoviesSectionProps } from '@/features/events/pages/event-detail/EventMoviesSection';
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
          viewMode={props.viewMode ?? 'grid'}
          onViewModeChange={props.onViewModeChange ?? (() => undefined)}
          addMovieOpen={false}
          onAddMovieOpenChange={() => undefined}
          addMovieTriggerRef={{ current: null }}
        />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('EventMoviesSection (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
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

  it('permet de trier et de passer en vue liste', async () => {
    server.use(authedUserHandler, watchlistHandler([]));
    const onViewModeChange = vi.fn();
    const second: MovieData = { ...MOVIE, id: 'm2', title: 'Inception', score: 4 };
    renderSection({
      movies: [MOVIE, second],
      viewMode: 'grid',
      onViewModeChange,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /^votes$/i }));
    expect(screen.getByRole('button', { name: /^votes$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await user.click(screen.getByRole('button', { name: /affichage liste/i }));
    expect(onViewModeChange).toHaveBeenCalledWith('list');
  });
});
