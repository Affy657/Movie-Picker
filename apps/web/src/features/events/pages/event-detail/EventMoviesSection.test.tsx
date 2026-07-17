import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
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

function renderSection(props: { movies?: MovieData[]; watchlistItems?: unknown[] } = {}) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <EventMoviesSection
          slug="soiree-cine"
          event={EVENT}
          participant={{ participantId: 'p1', pseudo: 'Alice' }}
          hostToken={null}
          movies={props.movies ?? [MOVIE]}
          moviesQuery={{
            isPending: false,
            isError: false,
            isSuccess: true,
            error: null,
            refetch: vi.fn(),
          }}
          actionError={null}
          onDismissActionError={() => undefined}
          setActionError={() => undefined}
          refreshAll={() => undefined}
          viewMode="grid"
          onViewModeChange={() => undefined}
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
    await user.click(await screen.findByRole('menuitem', { name: /ajouter à ma watchlist/i }));

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
    await user.click(await screen.findByRole('menuitem', { name: /retirer de ma watchlist/i }));

    await waitFor(() => expect(removeCalled).toBe(true));
  });
});
