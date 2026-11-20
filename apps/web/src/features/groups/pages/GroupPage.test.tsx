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
import { apiJson } from '@/mocks/apiJson';
import {
  createGroupMembershipHandlers,
  createGroupsHandlers,
  TEST_API_V1,
  type MockGroup,
  type MockListPerson,
} from '@/mocks/handlers';
import { CreateEventDialogContext } from '@/features/events/components/create-event/createEventDialogContext';
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

  it('heads the page with the group, and opens a new night already in the group', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    const { openCreateEvent } = renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Les jeudis ciné' })
    ).toBeInTheDocument();
    expect(screen.getByText('Groupe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes groupes' })).toHaveAttribute('href', '/groupes');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex'
    );

    await user.click(screen.getAllByRole('button', { name: 'Nouvelle soirée' })[0]!);

    expect(openCreateEvent).toHaveBeenCalledWith({ groupId: 'g1' });
  });

  it('shows the next night with who comes, its films, and the way to vote or propose', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    renderPage();

    const next = await screen.findByRole('region', { name: 'Prochaine soirée' });
    expect(within(next).getByRole('heading', { name: 'Jeudi ciné' })).toBeInTheDocument();
    expect(next).toHaveTextContent('Polars');
    expect(next).toHaveTextContent('3 membres sur 4 y sont');
    expect(next).toHaveTextContent('21h, dans');
    const films = within(next).getByRole('list', { name: 'Films proposés' });
    expect(within(films).getAllByRole('listitem')).toHaveLength(2);
    expect(films).toHaveTextContent('Heat');
    expect(within(next).getByRole('link', { name: 'Voter' })).toHaveAttribute('href', '/e/jeudi');
    expect(within(next).getByRole('link', { name: 'Proposer un film' })).toHaveAttribute(
      'href',
      '/e/jeudi'
    );
    expect(within(next).getByRole('link', { name: 'Ouvrir la soirée' })).toHaveAttribute(
      'href',
      '/e/jeudi'
    );
  });

  it('leads with proposing a film while the next night has none', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([
        { ...JEUDIS, upcomingNights: [{ ...JEUDI, movieCount: 0, topMovies: [] }] },
      ])
    );
    renderPage();

    const next = await screen.findByRole('region', { name: 'Prochaine soirée' });
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

    const next = await screen.findByRole('region', { name: 'Prochaine soirée' });
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

    const then = await screen.findByRole('region', { name: /Ensuite/ });
    expect(
      within(then).getByRole('button', { name: 'Rejoindre la soirée Halloween en retard' })
    ).toBeInTheDocument();
    expect(then).toHaveTextContent('3 participants');
    const mine = within(then).getByRole('link', { name: /Mardi cinéphile/ });
    expect(mine).toHaveAttribute('href', '/e/mardi');
    expect(mine).toHaveTextContent('Organisée par vous');
  });

  it('shows the films the group watched with their ratings', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    renderPage();

    const films = await screen.findByRole('region', { name: /Les films du groupe/ });
    const phare = within(films).getByRole('link', { name: /Les Enfants du phare/ });
    expect(phare).toHaveAttribute('href', '/e/phare');
    expect(phare).toHaveTextContent('Vous 4/5');
    expect(phare).toHaveTextContent('Note moyenne du groupe : 4,1/5');
    const kyoto = within(films).getByRole('link', { name: /Minuit à Kyoto/ });
    expect(kyoto).toHaveTextContent('À noter');
  });

  it('tells which members come to the next night', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    renderPage();

    const members = await screen.findByRole('complementary', { name: /Membres/ });
    const rows = within(members).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('Léa Moreau');
    expect(rows[0]).toHaveTextContent('Créateur');
    expect(rows[0]).toHaveTextContent('Vient jeudi');
    expect(rows[1]).toHaveTextContent('Vous');
    expect(rows[3]).toHaveTextContent('Hugo');
    expect(rows[3]).toHaveTextContent('Pas encore rejoint');
  });

  it('shows the members as a row of avatars on a phone, ringed when they come', async () => {
    stubMatchMedia((query) => query.includes('max-width: 767px'));
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    renderPage();

    const members = await screen.findByRole('region', { name: /Membres/ });
    expect(within(members).getAllByRole('listitem')).toHaveLength(4);
    expect(members).toHaveTextContent('Cerclés de vert : viennent jeudi.');
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('offers a new night when none is planned, and hides the films until there are some', async () => {
    server.use(
      signedInAs(ALICE),
      ...createGroupsHandlers([{ ...JEUDIS, upcomingNights: [], pastNights: [] }])
    );
    const user = userEvent.setup();
    const { openCreateEvent } = renderPage();

    const next = await screen.findByRole('region', { name: 'Prochaine soirée' });
    expect(next).toHaveTextContent('Aucune soirée prévue');
    await user.click(within(next).getByRole('button', { name: 'Nouvelle soirée' }));
    expect(openCreateEvent).toHaveBeenCalledWith({ groupId: 'g1' });
    expect(screen.queryByRole('region', { name: /Les films du groupe/ })).toBeNull();
    expect(screen.queryByRole('region', { name: /Ensuite/ })).toBeNull();
    expect(screen.queryByText('Pas encore rejoint')).toBeNull();
  });

  it('lets a member leave the group, then goes back to My groups', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Réglages du groupe' }));
    expect(screen.queryByRole('menuitem', { name: 'Renommer' })).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: 'Quitter le groupe' }));
    const dialog = await screen.findByTestId('leave-group-dialog');
    expect(dialog).toHaveTextContent('Quitter « Les jeudis ciné » ?');
    expect(dialog).toHaveTextContent('Léa pourra vous inviter de nouveau');
    await user.click(within(dialog).getByRole('button', { name: 'Quitter le groupe' }));

    expect(await screen.findByText('Mes groupes')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/groupes$/);
  });

  it('lets a member leave the group from the members column', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([JEUDIS]));
    const user = userEvent.setup();
    renderPage();

    const members = await screen.findByRole('complementary', { name: /Membres/ });
    await user.click(within(members).getByRole('button', { name: 'Quitter le groupe' }));

    expect(await screen.findByTestId('leave-group-dialog')).toBeInTheDocument();
  });

  it('lets the creator rename and delete the group', async () => {
    server.use(signedInAs(LEA), ...createGroupsHandlers([{ ...JEUDIS, role: 'owner' }]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Réglages du groupe' }));
    expect(screen.queryByRole('menuitem', { name: 'Quitter le groupe' })).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: 'Renommer' }));
    const name = await screen.findByRole('textbox', { name: 'Nom' });
    await user.clear(name);
    await user.type(name, 'Les vendredis ciné');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Les vendredis ciné' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: /Membres/ })).not.toHaveTextContent(
      'Quitter le groupe'
    );

    await user.click(screen.getByRole('button', { name: 'Réglages du groupe' }));
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

    await user.click(await screen.findByRole('button', { name: 'Réglages du groupe' }));
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

  it('says the group cannot be found, without crashing', async () => {
    server.use(signedInAs(ALICE), ...createGroupsHandlers([]));
    renderPage({ path: '/groupes/inconnu' });

    expect(await screen.findByText('Groupe introuvable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mes groupes' })).toHaveAttribute('href', '/groupes');
  });
});
