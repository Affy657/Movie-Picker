import { afterEach, afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import WatchlistProposeSubmenu from '@/features/watchlist/components/WatchlistProposeSubmenu';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';

const MOVIE: WatchlistItem = {
  tmdbId: 200,
  mediaType: 'movie',
  title: 'Un Film',
  year: '2020',
  posterPath: null,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderSubmenu(onDone = () => {}) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <WatchlistProposeSubmenu movie={MOVIE} onDone={onDone} />
      </MemoryRouter>
    </AppTestProviders>
  );
}

const eligibleEventsHandler = http.get(`${TEST_API_V1}/events/mine`, () =>
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
);

describe('WatchlistProposeSubmenu (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('ne charge pas les soirées avant le survol', () => {
    server.use(authMeGuestHandler, eligibleEventsHandler);

    renderSubmenu();

    expect(screen.queryByText('Chez moi')).not.toBeInTheDocument();
  });

  it('affiche le flyout au survol avec la soirée éligible', async () => {
    server.use(authMeGuestHandler, eligibleEventsHandler);

    renderSubmenu();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /proposer dans une soirée/i }));

    expect(await screen.findByText('Chez moi')).toBeInTheDocument();
  });

  it('affiche le flyout au focus (accessibilité clavier)', async () => {
    server.use(authMeGuestHandler, eligibleEventsHandler);

    renderSubmenu();
    fireEvent.focus(screen.getByRole('button', { name: /proposer dans une soirée/i }));

    expect(await screen.findByText('Chez moi')).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucune soirée éligible", async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
    );

    renderSubmenu();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /proposer dans une soirée/i }));

    expect(await screen.findByText(/aucune soirée active/i)).toBeInTheDocument();
  });

  it('propose le film à la soirée choisie et appelle onDone', async () => {
    let proposedBody: Record<string, unknown> | null = null;
    let onDoneCalled = false;
    server.use(
      authMeGuestHandler,
      eligibleEventsHandler,
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
        return HttpResponse.json({ _id: 'm1', title: 'Un Film' }, { status: 201 });
      })
    );

    renderSubmenu(() => {
      onDoneCalled = true;
    });
    fireEvent.mouseEnter(screen.getByRole('button', { name: /proposer dans une soirée/i }));
    const eventCard = await screen.findByText('Chez moi');

    const user = userEvent.setup();
    await user.click(eventCard.closest('button')!);

    await waitFor(() => expect(proposedBody).not.toBeNull());
    expect(proposedBody).toMatchObject({ tmdbId: 200, participantId: 'p1' });
    await waitFor(() => expect(onDoneCalled).toBe(true));
  });

  it("affiche une erreur si la proposition échoue et n'appelle pas onDone", async () => {
    let onDoneCalled = false;
    server.use(
      authMeGuestHandler,
      eligibleEventsHandler,
      http.get(`${TEST_API_V1}/events/slug/ma-soiree`, () =>
        HttpResponse.json({ error: 'Soirée introuvable', code: 404 }, { status: 404 })
      )
    );

    renderSubmenu(() => {
      onDoneCalled = true;
    });
    fireEvent.mouseEnter(screen.getByRole('button', { name: /proposer dans une soirée/i }));
    const eventCard = await screen.findByText('Chez moi');

    const user = userEvent.setup();
    await user.click(eventCard.closest('button')!);

    await screen.findByRole('alert');
    expect(onDoneCalled).toBe(false);
  });
});
