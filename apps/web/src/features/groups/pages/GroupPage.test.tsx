import { buttonClass } from '@/shared/components/Button';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import { buildMyEventSummary } from '@/test-utils/myEventSummary';
import { buildUserProfile } from '@/test-utils/userProfile';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import {
  createGroupMembershipHandlers,
  createGroupsHandlers,
  TEST_API_V1,
  type MockGroup,
  type MockListPerson,
} from '@/mocks/handlers';
import { CreateEventDialogContext } from '@/features/events/components/create-event/createEventDialogContext';
import type { FriendGroupMemberStats } from '@/features/groups/api/groupsApi';
import GroupPage from './GroupPage';

const ALICE: MockListPerson = {
  userId: 'u1',
  handle: 'alice',
  displayName: 'Alice',
  avatarId: null,
};
const LEA: MockListPerson = {
  userId: 'u2',
  handle: 'lea',
  displayName: 'Léa Moreau',
  avatarId: null,
};
const SAM: MockListPerson = { userId: 'u3', handle: 'sam', displayName: 'Sam', avatarId: null };
const HUGO: MockListPerson = { userId: 'u4', handle: 'hugo', displayName: 'Hugo', avatarId: null };

function signedInAs(person: MockListPerson) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    apiJson<'UserProfileResponse'>(
      buildUserProfile({
        userId: person.userId,
        displayName: person.displayName,
        ratingScale: 'five',
      })
    )
  );
}

const JEUDI = buildMyEventSummary({
  id: 'e1',
  slug: 'jeudi',
  title: 'Jeudi ciné',
  date: '2030-11-28',
  time: '21:00',
  theme: 'Polars',
  movieCount: 2,
  participantCount: 3,
  topMovies: [
    { title: 'Heat', posterPath: '/heat.jpg' },
    { title: 'Collateral', posterPath: null },
  ],
  groupId: 'g1',
  groupName: 'Les jeudis ciné',
});

const SAMEDI = buildMyEventSummary({
  id: 'e2',
  slug: 'samedi',
  title: 'Halloween en retard',
  date: '2030-11-30',
  isParticipant: false,
  participantCount: 3,
  groupId: 'g1',
  groupName: 'Les jeudis ciné',
});

const PAST = buildMyEventSummary({
  id: 'e3',
  slug: 'phare',
  title: 'Soirée phare',
  date: '2026-11-19',
  lifecycle: 'finished',
  winnerMovies: [{ title: 'Les Enfants du phare', posterPath: '/phare.jpg' }],
  averageRating: 8.2,
  myRating: 8,
  groupId: 'g1',
});

const TO_RATE = buildMyEventSummary({
  id: 'e4',
  slug: 'kyoto',
  title: 'Soirée Kyoto',
  date: '2026-11-12',
  lifecycle: 'finished',
  winnerMovies: [{ title: 'Minuit à Kyoto', posterPath: null }],
  averageRating: 9,
  hasWinnerToRate: true,
  groupId: 'g1',
});

const ON_HOLD = buildMyEventSummary({
  id: 'e6',
  slug: 'suspens',
  title: 'Soirée du jeudi 19 novembre',
  date: '2026-11-19',
  lifecycle: 'pending',
  movieCount: 0,
  participantCount: 1,
  groupId: 'g1',
  groupName: 'Les jeudis ciné',
});

const JEUDIS: MockGroup = {
  id: 'g1',
  name: 'Les jeudis ciné',
  role: 'member',
  owner: LEA,
  members: [{ ...LEA, role: 'owner' }, ALICE, SAM, HUGO],
  upcomingNights: [JEUDI, SAMEDI],
  nextNightParticipantIds: ['u2', 'u1', 'u3'],
  pastNights: [PAST, TO_RATE],
};

const PICTURED_JEUDIS: MockGroup = {
  ...JEUDIS,
  stats: {
    nightCount: 16,
    filmCount: 17,
    firstNightDate: '2024-09-05',
    averageRating: 7.8,
    usualWeekday: 4,
  },
  cover: {
    tmdbId: 101,
    mediaType: 'movie',
    title: 'Les Enfants du phare',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/phare.jpg',
  },
};

const MORE = 'Plus d’actions sur le groupe';

function memberStats(
  userId: string,
  overrides: Partial<FriendGroupMemberStats> = {}
): FriendGroupMemberStats {
  return {
    userId,
    proposedCount: 0,
    winningCount: 0,
    ratedWinningCount: 0,
    proposalsAverageRating: null,
    upVotesReceived: 0,
    upVotesCast: 0,
    upVotesOnWinner: 0,
    freshProposalCount: 0,
    nightsAttended: 0,
    nightsSinceJoined: 0,
    nightsHosted: 0,
    ratingsGiven: 0,
    averageRatingGiven: null,
    ...overrides,
  };
}

const RANKED_JEUDIS: MockGroup = {
  ...JEUDIS,
  ranking: {
    nightCount: 16,
    members: [
      memberStats('u2', {
        proposedCount: 18,
        winningCount: 6,
        ratedWinningCount: 6,
        proposalsAverageRating: 8.6,
        nightsAttended: 15,
        nightsSinceJoined: 16,
      }),
      memberStats('u1', {
        proposedCount: 14,
        winningCount: 4,
        ratedWinningCount: 4,
        proposalsAverageRating: 7.8,
        nightsAttended: 8,
        nightsSinceJoined: 16,
      }),
      memberStats('u3', {
        proposedCount: 21,
        winningCount: 2,
        ratedWinningCount: 2,
        proposalsAverageRating: 6.8,
        nightsAttended: 8,
        nightsSinceJoined: 8,
      }),
      memberStats('u4', { proposedCount: 3, nightsAttended: 3, nightsSinceJoined: 16 }),
    ],
  },
};

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.state ? JSON.stringify(location.state) : ''}
    </output>
  );
}

function renderPage(
  { path = '/groupes/g1', state }: { path?: string; state?: unknown } = {},
  openCreateEvent = vi.fn()
) {
  render(
    <AppTestProviders>
      <CreateEventDialogContext.Provider value={{ open: openCreateEvent, dismiss: vi.fn() }}>
        <MemoryRouter initialEntries={[{ pathname: path, state }]}>
          <Routes>
            <Route path="/groupes/:groupId" element={<GroupPage />} />
            <Route path="/groupes" element={<p>Mes groupes</p>} />
            <Route path="/e/:slug" element={<p>Page de la soirée</p>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </CreateEventDialogContext.Provider>
    </AppTestProviders>
  );
  return { openCreateEvent };
}

describe('GroupPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  it('heads the page with the group and its people, and opens a new night already in the group', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    const { openCreateEvent } = renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Les jeudis ciné' })
    ).toBeInTheDocument();
    expect(screen.getByText('Vous, Léa, Sam et Hugo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes groupes' })).toHaveAttribute('href', '/groupes');
    expect(screen.queryByTestId('faded-banner-image')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Le groupe en chiffres' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Inviter' })).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex'
    );

    await user.click(screen.getByRole('button', { name: 'Soirée du groupe' }));

    expect(openCreateEvent).toHaveBeenCalledWith({ groupId: 'g1' });
  });

  it('shows the last film of the group as a banner, then the group in figures', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([PICTURED_JEUDIS]));
    renderPage();

    expect(await screen.findByTestId('faded-banner-image')).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w1280/phare.jpg'
    );
    expect(
      screen.getByRole('link', {
        name: 'Image tirée de Les Enfants du phare, le dernier film du groupe',
      })
    ).toHaveAttribute('href', expect.stringContaining('/film/101'));
    const figures = screen.getByRole('list', { name: 'Le groupe en chiffres' });
    const items = within(figures).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      '16soirées depuis septembre 2024',
      '17films gagnants',
      '3,9/5note moyenne des films',
      'Jeudile soir le plus fréquent',
    ]);
  });

  it('lets the creator invite people from the head of the page', async () => {
    server.use(
      signedInAs(LEA),
      ...createGroupsHandlers([{ ...JEUDIS, role: 'owner' }]),
      ...createGroupMembershipHandlers('g1', { members: [{ ...LEA, role: 'owner' }, ALICE] })
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Inviter' }));

    expect(
      await screen.findByRole('heading', { name: 'Membres de « Les jeudis ciné »' })
    ).toBeInTheDocument();
  });

  it('shows the next night with who comes, its films, and the way to vote or propose', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    renderPage();

    const upcoming = await screen.findByRole('region', { name: 'À venir' });
    const next = within(upcoming).getByRole('article');
    expect(within(next).getByRole('heading', { name: 'Jeudi ciné' })).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: 'Jeudi ciné' })).toHaveAttribute(
      'href',
      '/e/jeudi'
    );
    expect(next).toHaveTextContent('Polars');
    expect(next).toHaveTextContent('Vous, Léa et Sam viennent');
    expect(next).toHaveTextContent('Hugo n’a pas encore rejoint');
    expect(next).toHaveTextContent('21h, dans');
    const films = within(next).getByRole('list', { name: 'Films proposés' });
    expect(within(films).getAllByRole('listitem')).toHaveLength(2);
    expect(films).toHaveTextContent('Heat');
    expect(within(next).getByRole('link', { name: 'Voter' })).toHaveAttribute('href', '/e/jeudi');
    expect(within(next).getByRole('link', { name: 'Proposer un film' })).toHaveAttribute(
      'href',
      '/e/jeudi'
    );
  });

  it('counts who comes on a phone', async () => {
    stubMatchMedia((query) => query.includes('max-width: 767px'));
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    renderPage();

    const next = within(await screen.findByRole('region', { name: 'À venir' })).getByRole(
      'article'
    );
    expect(next).toHaveTextContent('3 sur 4 viennent');
    expect(next).toHaveTextContent('Hugo n’a pas encore rejoint');
  });

  it('leads with proposing a film while the next night has none', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([
        { ...JEUDIS, upcomingNights: [{ ...JEUDI, movieCount: 0, topMovies: [] }] },
      ])
    );
    renderPage();

    const next = await screen.findByRole('article');
    expect(within(next).queryByRole('link', { name: 'Voter' })).toBeNull();
    expect(within(next).getByRole('link', { name: 'Proposer un film' })).toHaveClass(
      buttonClass({ variant: 'primary' })
    );
  });

  it('opens the night ready to propose a film', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('link', { name: 'Proposer un film' }));

    expect(await screen.findByText('Page de la soirée')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/e/jeudi{"openPropose":true}');
  });

  it('joins the next night in one click when the viewer is not in it yet, then opens it', async () => {
    let joined = false;
    server.use(
      signedInAs(HUGO),
      http.post(`${TEST_API_V1}/events/jeudi/join`, () => {
        joined = true;
        return apiJson<'JoinEventResult'>(
          {
            participant: {
              _id: 'p9',
              eventId: 'e1',
              pseudo: 'Hugo',
              createdAt: '2026-11-01T00:00:00Z',
              updatedAt: '2026-11-01T00:00:00Z',
            },
            isNew: true,
            message: '',
          },
          { status: 201 }
        );
      }),
      ...createGroupsHandlers([{ ...JEUDIS, upcomingNights: [{ ...JEUDI, isParticipant: false }] }])
    );
    const user = userEvent.setup();
    renderPage();

    const next = await screen.findByRole('article');
    expect(within(next).queryByRole('link', { name: 'Voter' })).toBeNull();
    await user.click(within(next).getByRole('button', { name: 'Rejoindre la soirée Jeudi ciné' }));

    expect(await screen.findByText('Page de la soirée')).toBeInTheDocument();
    expect(joined).toBe(true);
    expect(screen.getByTestId('location')).toHaveTextContent('/e/jeudi');
  });

  it('lists the nights after the next one, joinable or open', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([
        {
          ...JEUDIS,
          upcomingNights: [
            JEUDI,
            SAMEDI,
            {
              ...SAMEDI,
              id: 'e5',
              slug: 'mardi',
              title: 'Mardi cinéphile',
              isParticipant: true,
              isCreator: true,
            },
          ],
        },
      ])
    );
    renderPage();

    const upcoming = await screen.findByRole('region', { name: 'À venir' });
    expect(
      within(upcoming).getByRole('button', { name: 'Rejoindre la soirée Halloween en retard' })
    ).toBeInTheDocument();
    expect(upcoming).toHaveTextContent('3 participants');
    expect(within(upcoming).getByRole('link', { name: /Mardi cinéphile/ })).toHaveAttribute(
      'href',
      '/e/mardi'
    );
  });

  it('names who comes to a later night', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([
        {
          ...JEUDIS,
          upcomingNights: [
            JEUDI,
            {
              ...SAMEDI,
              participantsPreview: [
                { pseudo: 'Léa Moreau', avatarId: '' },
                { pseudo: 'Inès', avatarId: '' },
                { pseudo: 'Hugo', avatarId: '' },
              ],
            },
          ],
        },
      ])
    );
    renderPage();

    expect(await screen.findByRole('region', { name: 'À venir' })).toHaveTextContent(
      'Léa, Inès et Hugo viennent'
    );
  });

  it('keeps a night on hold out of the next night, and lists it apart', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([{ ...JEUDIS, upcomingNights: [ON_HOLD, JEUDI, SAMEDI] }])
    );
    renderPage();

    const user = userEvent.setup();
    const upcoming = await screen.findByRole('region', { name: 'À venir' });
    const next = within(upcoming).getByRole('article');
    expect(next).toHaveTextContent('Jeudi ciné');
    expect(next).not.toHaveTextContent('Soirée du jeudi 19 novembre');
    expect(upcoming).toHaveTextContent('Soirée du jeudi 19 novembre en suspens, sans film choisi.');
    expect(
      within(upcoming).getByRole('link', { name: 'Ouvrir la soirée Soirée du jeudi 19 novembre' })
    ).toHaveAttribute('href', '/e/suspens');
    await user.click(screen.getByRole('tab', { name: /Membres/ }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Vient jeudi');
  });

  it('shows no next night while the only night left is on hold', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([
        { ...JEUDIS, upcomingNights: [ON_HOLD], nextNightParticipantIds: [] },
      ])
    );
    renderPage();

    const upcoming = await screen.findByRole('region', { name: 'À venir' });
    expect(upcoming).toHaveTextContent('Aucune soirée prévue');
    expect(upcoming).toHaveTextContent('Soirée du jeudi 19 novembre en suspens');
    expect(within(upcoming).queryByRole('article')).toBeNull();
    expect(screen.queryByText('Pas encore rejoint')).toBeNull();
  });

  it('shows the films the group watched with their ratings', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    renderPage();

    expect(await screen.findByRole('tab', { name: /Films/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const films = screen.getByRole('tabpanel');
    const phare = within(films).getByRole('link', { name: /Les Enfants du phare/ });
    expect(phare).toHaveAttribute('href', '/e/phare');
    expect(phare).toHaveTextContent('Vous 4/5');
    expect(phare).toHaveTextContent('Note moyenne du groupe : 4,1/5');
    const kyoto = within(films).getByRole('link', { name: /Minuit à Kyoto/ });
    expect(kyoto).toHaveTextContent('À noter');
  });

  it('tells which members come to the next night', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: /Membres/ }));
    const members = screen.getByRole('tabpanel');
    const rows = within(members).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('Léa Moreau');
    expect(rows[0]).toHaveTextContent('Créateur');
    expect(rows[0]).toHaveTextContent('Vient jeudi');
    expect(rows[1]).toHaveTextContent('Vous');
    expect(rows[3]).toHaveTextContent('Hugo');
    expect(rows[3]).toHaveTextContent('Pas encore rejoint');
  });

  it('offers a new night when none is planned, and hides the films until there are some', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([{ ...JEUDIS, upcomingNights: [], pastNights: [] }])
    );
    const user = userEvent.setup();
    const { openCreateEvent } = renderPage();

    const upcoming = await screen.findByRole('region', { name: 'À venir' });
    expect(upcoming).toHaveTextContent('Aucune soirée prévue');
    await user.click(within(upcoming).getByRole('button', { name: 'Nouvelle soirée' }));
    expect(openCreateEvent).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Les films gagnants du groupe arriveront ici après sa première soirée.'
    );
    expect(screen.queryByText('Pas encore rejoint')).toBeNull();
  });

  it('lets a member leave the group, then goes back to My groups', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: MORE }));
    expect(screen.queryByRole('menuitem', { name: 'Renommer' })).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: 'Quitter le groupe' }));
    const dialog = await screen.findByTestId('leave-group-dialog');
    expect(dialog).toHaveTextContent('Quitter « Les jeudis ciné » ?');
    expect(dialog).toHaveTextContent('Léa pourra vous inviter de nouveau');
    await user.click(within(dialog).getByRole('button', { name: 'Quitter le groupe' }));

    expect(await screen.findByText('Mes groupes')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/groupes$/);
  });

  it('lets a member leave the group from the members tab', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: /Membres/ }));
    await user.click(
      within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Quitter le groupe' })
    );

    expect(await screen.findByTestId('leave-group-dialog')).toBeInTheDocument();
  });

  it('lets the creator rename and delete the group', async () => {
    server.use(signedInAs(LEA), ...createGroupsHandlers([{ ...JEUDIS, role: 'owner' }]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: MORE }));
    expect(screen.queryByRole('menuitem', { name: 'Quitter le groupe' })).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: 'Renommer' }));
    const name = await screen.findByRole('textbox', { name: 'Nom' });
    await user.clear(name);
    await user.type(name, 'Les vendredis ciné');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Les vendredis ciné' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: MORE }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer le groupe' }));
    const dialog = await screen.findByTestId('delete-group-dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer le groupe' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/groupes$/));
  });

  it('opens the members dialog from the settings menu', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([JEUDIS]),
      ...createGroupMembershipHandlers('g1', { members: [{ ...LEA, role: 'owner' }, ALICE] })
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: MORE }));
    await user.click(screen.getByRole('menuitem', { name: 'Membres' }));

    expect(
      await screen.findByRole('heading', { name: 'Membres de « Les jeudis ciné »' })
    ).toBeInTheDocument();
  });

  it('opens the members dialog right away for a group just created', async () => {
    server.use(
      signedInAs(LEA),
      ...createGroupsHandlers([{ ...JEUDIS, role: 'owner' }]),
      ...createGroupMembershipHandlers('g1', { members: [{ ...LEA, role: 'owner' }] })
    );
    renderPage({ state: { openMembers: true } });

    expect(
      await screen.findByRole('heading', { name: 'Membres de « Les jeudis ciné »' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/groupes\/g1$/)
    );
  });

  it('ranks the members on the rating of their films, the viewer named and the rest not ranked yet', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([RANKED_JEUDIS]));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('tab', { name: 'Classement' }));
    const ranking = screen.getByRole('tabpanel');
    expect(
      await within(ranking).findByText('Qui propose les meilleurs films ?')
    ).toBeInTheDocument();
    expect(ranking).toHaveTextContent(
      'Sur les 16 soirées terminées de ses membres, tous groupes confondus.'
    );
    expect(within(ranking).getByRole('button', { name: 'Note de ses films' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const podium = within(ranking).getByRole('list', { name: 'Podium' });
    const places = within(podium).getAllByRole('listitem');
    expect(places).toHaveLength(3);
    expect(places[0]).toHaveTextContent(/1re place.*Léa Moreau.*4,3\/5.*6 films notés/);
    expect(places[1]).toHaveTextContent(/2e place.*Vous.*3,9\/5.*4 films notés/);
    expect(places[2]).toHaveTextContent(/3e place.*Sam.*3,4\/5.*2 films notés/);
    expect(ranking).toHaveTextContent('Pas encore classés');
    expect(ranking).toHaveTextContent('Aucun film gagnant pour l’instant');
  });

  it('switches the compared stat from its chips, members on a tie sharing a place', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([RANKED_JEUDIS]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Classement' }));
    const ranking = screen.getByRole('tabpanel');
    await user.click(await within(ranking).findByRole('button', { name: 'Soirées' }));

    expect(within(ranking).getByRole('button', { name: 'Soirées' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(ranking).getByText('Qui a fait le plus de soirées ?')).toBeInTheDocument();
    const rows = within(ranking).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Léa Moreau'),
      expect.stringContaining('Vous'),
      expect.stringContaining('Sam'),
      expect.stringContaining('Hugo'),
    ]);
    expect(rows[1]).toHaveTextContent('Ex æquo, soirées terminées');
    expect(rows[2]).toHaveTextContent('Ex æquo, soirées terminées');
    expect(rows[3]).toHaveTextContent(/4.*Hugo.*soirées terminées.*3/);
  });

  it('says the ranking starts after the first finished night of the group', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Classement' }));
    const ranking = screen.getByRole('tabpanel');
    expect(
      await within(ranking).findByText(
        'Le classement démarre après la première soirée terminée d’un membre, quand un film a gagné.'
      )
    ).toBeInTheDocument();
    expect(within(ranking).queryByRole('button', { name: 'Note de ses films' })).toBeNull();
  });

  it('offers to try the ranking again when it does not load, the rest of the page staying', async () => {
    let attempts = 0;
    server.use(
      signedInAs(ALICE),
      http.get(`${TEST_API_V1}/groups/g1/ranking`, () => {
        attempts += 1;
        return attempts === 1
          ? apiErrorJson(500, 'internal_error')
          : apiJson<'FriendGroupRankingResponse'>(RANKED_JEUDIS.ranking!);
      }),
      ...createGroupsHandlers([RANKED_JEUDIS])
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Classement' }));
    const ranking = screen.getByRole('tabpanel');
    expect(
      await within(ranking).findByText('Impossible de charger le classement.')
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'À venir' })).toBeInTheDocument();

    await user.click(within(ranking).getByRole('button', { name: 'Réessayer' }));

    expect(
      await within(ranking).findByText('Qui propose les meilleurs films ?')
    ).toBeInTheDocument();
  });

  it('says the group cannot be found, without crashing', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([]));
    renderPage({ path: '/groupes/inconnu' });

    expect(await screen.findByText('Groupe introuvable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes groupes' })).toHaveAttribute('href', '/groupes');
  });
});
