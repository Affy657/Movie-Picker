import { afterEach, afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { QueryClient } from '@tanstack/react-query';
import ProposeToEventModal from '@/features/events/components/ProposeToEventModal';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { authMeGuestHandler, TEST_API_V1 } from '@/mocks/handlers';
import type { WatchlistItem } from '@/features/movies/api/watchlistApi';

const MOVIE: WatchlistItem = {
  tmdbId: 200,
  mediaType: 'movie',
  title: 'Un Film',
  year: '2020',
  posterPath: null,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderModal(onClose = vi.fn(), client?: QueryClient) {
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter>
        <ProposeToEventModal open movie={MOVIE} onClose={onClose} />
      </MemoryRouter>
    </AppTestProviders>
  );
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

describe('ProposeToEventModal (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le titre avec le nom du film', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
    );

    renderModal();

    expect(
      await screen.findByText(/proposer «\s*un film\s*» dans une soirée/i)
    ).toBeInTheDocument();
  });

  it('shows a message when there is no eligible movie night', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
    );

    renderModal();

    expect(await screen.findByText(/aucune soirée active/i)).toBeInTheDocument();
  });

  it('affiche un lien "voir plus" quand hasMore est vrai', async () => {
    server.use(
      authMeGuestHandler,
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
          hasMore: true,
        })
      )
    );

    renderModal();

    expect(await screen.findByRole('link', { name: /voir toutes mes soirées/i })).toHaveAttribute(
      'href',
      '/my-events'
    );
  });

  it('shows an inline error when the proposal fails', async () => {
    server.use(
      authMeGuestHandler,
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
      http.post(`${TEST_API_V1}/events/ma-soiree/movies`, () =>
        HttpResponse.json({ error: 'Déjà proposé', code: 409 }, { status: 409 })
      )
    );

    renderModal();
    const user = userEvent.setup();
    const eventButton = await screen.findByRole('button', { name: /chez moi/i });
    await user.click(eventButton);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('refreshes the movie night lists and the night itself once the film is proposed', async () => {
    server.use(
      authMeGuestHandler,
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
      http.post(`${TEST_API_V1}/events/ma-soiree/movies`, () =>
        HttpResponse.json({ ok: true }, { status: 201 })
      )
    );
    const client = createTestQueryClient();
    const myActiveEvents = queryKeys.myEvents.active;
    const eventMovies = [...queryKeys.movies.list('ma-soiree'), 'p1'];
    const eventDetail = queryKeys.event.detail('ma-soiree', null);
    const otherEventMovies = [...queryKeys.movies.list('autre-soiree'), 'p1'];
    for (const key of [myActiveEvents, eventMovies, eventDetail, otherEventMovies]) {
      client.setQueryData(key, { cached: true });
    }

    renderModal(vi.fn(), client);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /chez moi/i }));
    await screen.findByText('Proposé');

    expect(client.getQueryState(myActiveEvents)?.isInvalidated).toBe(true);
    expect(client.getQueryState(eventMovies)?.isInvalidated).toBe(true);
    expect(client.getQueryState(eventDetail)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherEventMovies)?.isInvalidated).toBe(false);
  });

  it('appelle onClose depuis le bouton fermer', async () => {
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/events/mine`, () => HttpResponse.json({ events: [] }))
    );
    const onClose = vi.fn();

    renderModal(onClose);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /fermer/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
