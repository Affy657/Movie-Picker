import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { onlineManager, type QueryClient } from '@tanstack/react-query';
import EventDetail from '@/features/events/pages/EventDetail';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { FakeEventSource } from '@/test-utils/fakeEventSource';
import { TEST_API_V1 } from '@/mocks/handlers';
import { setStoredParticipant } from '@/shared/utils/eventIdentityStorage';
import { readLastEventSnapshot, readQueuedVotes } from '@/shared/utils/offlineEventStorage';

const slug = 'soiree-live';

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

const eventPayload = {
  _id: 'evt-live',
  title: 'Soirée en direct',
  date: '2030-12-15',
  time: '21:00',
  slug,
  isHost: false,
  isFinished: false,
  lifecycle: 'live',
  winners: [],
  participantCount: 3,
  movieCount: 1,
  participants: [
    { _id: 'p-host', pseudo: 'Hôte', isCreator: true },
    { _id: 'p-alice', pseudo: 'Alice' },
    { _id: 'p-bob', pseudo: 'Bob' },
  ],
  myParticipant: { _id: 'p-alice', pseudo: 'Alice' },
  config: {
    theme: null,
    maxProposalsPerParticipant: null,
    maxParticipants: null,
    maxVotesPerParticipant: null,
    wheelMode: 'strictRandom',
    winnerCount: 1,
  },
};

const moviePayload = {
  _id: 'm-alien',
  eventId: 'evt-live',
  participantId: 'p-host',
  tmdbId: 348,
  mediaType: 'movie',
  title: 'Alien',
  year: '1979',
  posterPath: null,
  proposerPseudo: 'Hôte',
  score: 1,
  up: 1,
  down: 0,
  myVote: null,
};

const votes: Array<{ movieId: string; body: unknown }> = [];
const presenceCalls: unknown[] = [];

const server = setupServer(
  http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
      userId: 'u-alice',
      displayName: 'Alice',
      emailMasked: 'a***@test.local',
      uiTheme: 'system',
      accentColor: 'default',
    })
  ),
  http.get(`${TEST_API_V1}/events/slug/${slug}`, () => HttpResponse.json(eventPayload)),
  http.get(`${TEST_API_V1}/events/${slug}/movies`, () => HttpResponse.json([moviePayload])),
  http.post(`${TEST_API_V1}/events/${slug}/movies/:movieId/vote`, async ({ params, request }) => {
    votes.push({ movieId: String(params.movieId), body: await request.json() });
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${TEST_API_V1}/events/${slug}/presence`, async ({ request }) => {
    presenceCalls.push(await request.json());
    return new HttpResponse(null, { status: 204 });
  })
);

function renderNight(client: QueryClient = createTestQueryClient()) {
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter initialEntries={[`/e/${slug}`]}>
        <Routes>
          <Route path="/e/:slug" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

async function visitOnlineThenLeave(): Promise<void> {
  const { unmount } = renderNight();
  expect(await screen.findByRole('heading', { name: 'Alien' })).toBeInTheDocument();
  await waitFor(() => expect(readLastEventSnapshot(slug)?.movies).toHaveLength(1));
  unmount();
}

describe('EventDetail, live and offline', () => {
  beforeAll(() => server.listen());
  beforeEach(() => {
    FakeEventSource.install();
    setStoredParticipant(slug, 'p-alice', 'Alice');
    votes.length = 0;
    presenceCalls.length = 0;
  });
  afterEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    onlineManager.setOnline(true);
  });
  afterAll(() => server.close());

  it('reopens the last night viewed without network, read-only, with the cached-data banner', async () => {
    await visitOnlineThenLeave();
    onlineManager.setOnline(false);

    renderNight();

    expect(await screen.findByRole('heading', { name: 'Soirée en direct' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alien' })).toBeInTheDocument();
    expect(screen.getByText('Données en cache, reconnexion en cours.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /proposer un film/i })).not.toBeInTheDocument();
  });

  it('keeps a vote cast offline pending, then sends it once back online and says so', async () => {
    const user = userEvent.setup();
    await visitOnlineThenLeave();
    onlineManager.setOnline(false);
    renderNight();

    await user.click(await screen.findByRole('button', { name: /voter pour alien/i }));

    expect(
      await screen.findByRole('img', { name: 'Vote en attente du réseau' })
    ).toBeInTheDocument();
    expect(votes).toEqual([]);
    expect(readQueuedVotes(slug)).toHaveLength(1);

    act(() => onlineManager.setOnline(true));

    expect(
      await screen.findByText('Votre vote fait hors ligne a été enregistré.')
    ).toBeInTheDocument();
    expect(votes).toEqual([{ movieId: 'm-alien', body: { participantId: 'p-alice', value: 1 } }]);
    expect(readQueuedVotes(slug)).toEqual([]);
  });

  it('shows who is online and who is proposing a movie', async () => {
    renderNight();
    expect(await screen.findByRole('heading', { name: 'Alien' })).toBeInTheDocument();

    act(() =>
      FakeEventSource.latest().emit('presence', {
        participants: [
          { participantId: 'p-alice', proposing: false },
          { participantId: 'p-bob', proposing: true },
          { participantId: 'p-gone', proposing: false },
        ],
      })
    );

    expect(screen.getByTestId('participants-online')).toHaveTextContent('2 en ligne');
    expect(screen.getByText('Bob propose un film…')).toBeInTheDocument();
  });

  it('does not tell me that I am the one proposing', async () => {
    renderNight();
    expect(await screen.findByRole('heading', { name: 'Alien' })).toBeInTheDocument();

    act(() =>
      FakeEventSource.latest().emit('presence', {
        participants: [{ participantId: 'p-alice', proposing: true }],
      })
    );

    expect(screen.queryByText(/propose un film…/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('participants-online')).not.toBeInTheDocument();
  });

  it('tells the others while my proposal window is open', async () => {
    const user = userEvent.setup();
    renderNight();
    expect(await screen.findByRole('heading', { name: 'Alien' })).toBeInTheDocument();

    const header = screen.getByRole('banner');
    await user.click(within(header).getByRole('button', { name: /proposer un film/i }));

    await waitFor(() => expect(presenceCalls).toContainEqual({ proposing: true }));
  });
});
