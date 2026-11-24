import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import EventDetail from '@/features/events/pages/EventDetail';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { buildUserProfile } from '@/test-utils/userProfile';
import { apiErrorJson, apiJson, type ApiSchemas } from '@/mocks/apiJson';
import {
  TEST_API_V1,
  authMeGuestHandler,
  createEventDetailHandlers,
  createJoinHandler,
} from '@/mocks/handlers';

const SLUG = 'soiree-invitation';

const signedInBob = http.get(`${TEST_API_V1}/auth/me`, () =>
  apiJson<'UserProfileResponse'>(buildUserProfile({ userId: 'u-bob', displayName: 'Bob' }))
);

function LocationSearch() {
  return <output data-testid="location-search">{useLocation().search}</output>;
}

function renderNight(path: string) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/e/:slug" element={<EventDetail />} />
        </Routes>
        <LocationSearch />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('EventDetail: joining on the way back from the invitation card', () => {
  const joinCalls: string[] = [];
  const server = setupServer(...createEventDetailHandlers({ slug: SLUG, title: 'Soirée horreur' }));

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    joinCalls.length = 0;
    localStorage.clear();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  server.events.on('request:start', ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith(`/events/${SLUG}/join`)) {
      joinCalls.push(request.url);
    }
  });

  it('joins the night once the account is back, drops the request from the address and says so', async () => {
    server.use(signedInBob, createJoinHandler(SLUG));

    renderNight(`/e/${SLUG}?rejoindre=1`);

    expect(
      await screen.findByRole('region', { name: 'Vous avez rejoint la soirée' })
    ).toBeInTheDocument();
    expect(screen.getByText('Proposez vos films et votez pour ceux des autres.')).toBeVisible();
    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent(''));
    expect(screen.queryByRole('heading', { name: 'Rejoindre la soirée' })).toBeNull();
    expect(joinCalls).toHaveLength(1);
  });

  it('drops the request from the address as soon as the join starts, not when it answers', async () => {
    server.use(
      signedInBob,
      http.post(`${TEST_API_V1}/events/${SLUG}/join`, () => new Promise<never>(() => undefined))
    );

    renderNight(`/e/${SLUG}?rejoindre=1`);

    await waitFor(() => expect(joinCalls).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent(''));
  });

  it('leaves a visitor who came back without an account in front of the card', async () => {
    server.use(authMeGuestHandler, createJoinHandler(SLUG));

    renderNight(`/e/${SLUG}?rejoindre=1`);

    expect(await screen.findByRole('link', { name: 'Créer un compte' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent(''));
    expect(joinCalls).toHaveLength(0);
    expect(screen.queryByRole('region', { name: 'Vous avez rejoint la soirée' })).toBeNull();
  });

  it('does not join again an account that already takes part', async () => {
    server.use(
      signedInBob,
      createJoinHandler(SLUG),
      http.get(`${TEST_API_V1}/events/slug/${SLUG}`, () =>
        apiJson<'EventDetailResponse'>(nightWithBob())
      )
    );

    renderNight(`/e/${SLUG}?rejoindre=1`);

    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent(''));
    expect(screen.queryByRole('heading', { name: 'Rejoindre la soirée' })).toBeNull();
    expect(joinCalls).toHaveLength(0);
  });

  it('does not try to join a night that is over', async () => {
    server.use(
      signedInBob,
      createJoinHandler(SLUG),
      ...createEventDetailHandlers({ slug: SLUG, title: 'Soirée horreur', isFinished: true })
    );

    renderNight(`/e/${SLUG}?rejoindre=1`);

    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent(''));
    expect(joinCalls).toHaveLength(0);
  });

  it('says why when the night filled up in the meantime', async () => {
    server.use(
      signedInBob,
      http.post(`${TEST_API_V1}/events/${SLUG}/join`, () =>
        apiErrorJson(409, 'event_full', { max: 4 })
      )
    );

    renderNight(`/e/${SLUG}?rejoindre=1`);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La soirée est complète (4 participants maximum).'
    );
    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent(''));
    expect(joinCalls).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Vous avez rejoint la soirée' })).toBeNull();
  });

  it('confirms a join made from the card as well', async () => {
    server.use(signedInBob, createJoinHandler(SLUG));
    const user = userEvent.setup();

    renderNight(`/e/${SLUG}`);

    await user.click(await screen.findByRole('button', { name: 'Rejoindre' }));

    expect(
      await screen.findByRole('region', { name: 'Vous avez rejoint la soirée' })
    ).toBeInTheDocument();
    expect(joinCalls).toHaveLength(1);
  });
});

function nightWithBob(): ApiSchemas['EventDetailResponse'] {
  const at = '2026-11-01T00:00:00Z';
  const person = (_id: string, pseudo: string, isCreator: boolean) => ({
    _id,
    pseudo,
    isCreator,
    avatarId: '',
    handle: null,
    accentColor: null,
  });
  return {
    _id: 'evt-msw',
    title: 'Soirée horreur',
    date: '2030-12-15',
    time: '21:00',
    slug: SLUG,
    recapSlug: null,
    closedAt: null,
    viewerRemoved: false,
    myParticipant: {
      _id: 'p-bob',
      eventId: 'evt-msw',
      pseudo: 'Bob',
      createdAt: at,
      updatedAt: at,
    },
    createdAt: at,
    updatedAt: at,
    isHost: false,
    isFinished: false,
    lifecycle: 'live',
    winners: [],
    participantCount: 2,
    movieCount: 0,
    votersCount: 0,
    participants: [person('p-host', 'Hôte', true), person('p-bob', 'Bob', false)],
    config: {
      theme: null,
      maxProposalsPerParticipant: null,
      maxParticipants: null,
      maxVotesPerParticipant: null,
      wheelMode: 'strictRandom',
      themeColor: null,
      recurrence: null,
      winnerCount: 1,
      richSharePreview: false,
      allowSeries: false,
      hasNextOccurrence: false,
      groupId: null,
    },
  };
}
