import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { buildMyEventSummary } from '@/test-utils/myEventSummary';
import { buildUserProfile } from '@/test-utils/userProfile';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import {
  createGroupsHandlers,
  TEST_API_V1,
  type MockGroup,
  type MockListPerson,
} from '@/mocks/handlers';
import MyGroupsPage from './MyGroupsPage';

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
const INES: MockListPerson = { userId: 'u4', handle: 'ines', displayName: 'Inès', avatarId: null };

const authedAlice = http.get(`${TEST_API_V1}/auth/me`, () =>
  apiJson<'UserProfileResponse'>(buildUserProfile({ userId: 'u1', displayName: 'Alice' }))
);

const JEUDIS: MockGroup = {
  id: 'g1',
  name: 'Les jeudis ciné',
  role: 'member',
  owner: LEA,
  members: [{ ...LEA, role: 'owner' }, ALICE, SAM, INES],
  upcomingNights: [
    buildMyEventSummary({
      id: 'e1',
      slug: 'jeudi',
      title: 'Jeudi ciné',
      date: '2030-11-28',
      movieCount: 3,
      hasVoted: false,
      groupId: 'g1',
      groupName: 'Les jeudis ciné',
    }),
  ],
  stats: {
    nightCount: 16,
    filmCount: 16,
    firstNightDate: '2026-09-03',
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

const FAMILLE: MockGroup = {
  id: 'g2',
  name: 'Famille',
  owner: ALICE,
  members: [{ ...ALICE, role: 'owner' }, SAM],
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

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/groupes']}>
        <Routes>
          <Route path="/groupes" element={<MyGroupsPage />} />
          <Route path="/groupes/:groupId" element={<p>Page du groupe</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('MyGroupsPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('shows each group as a tile with its last film, its people and its next night', async () => {
    server.use(authedAlice, ...createGroupsHandlers([JEUDIS, FAMILLE]));
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Mes groupes' })).toBeVisible();
    const jeudis = await screen.findByRole('link', { name: /Les jeudis ciné/ });
    expect(jeudis).toHaveAttribute('href', '/groupes/g1');
    expect(jeudis).toHaveTextContent('Vous, Léa, Sam et Inès, 16 soirées');
    expect(jeudis).toHaveTextContent('Les Enfants du phare');
    expect(jeudis.querySelector('img')).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w780/phare.jpg'
    );
    expect(jeudis).toHaveTextContent('Jeudi ciné');
    expect(jeudis).toHaveTextContent('À vous de voter');
    const famille = screen.getByRole('link', { name: /Famille/ });
    expect(famille).toHaveTextContent('Vous et Sam');
    expect(famille).toHaveTextContent(
      'Pas encore de film : la première soirée donnera son image au groupe'
    );
    expect(famille.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: 'Nouveau groupe' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer un groupe' })).toBeNull();
    expect(screen.queryByText('Invitation')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex'
    );
  });

  it('says a group with films has no night planned yet', async () => {
    server.use(authedAlice, ...createGroupsHandlers([{ ...JEUDIS, upcomingNights: [] }]));
    renderPage();

    expect(await screen.findByRole('link', { name: /Les jeudis ciné/ })).toHaveTextContent(
      'Aucune soirée prévue'
    );
  });

  it('accepts a pending invitation, whose group then joins the others', async () => {
    server.use(
      authedAlice,
      ...createGroupsHandlers(
        [FAMILLE],
        [
          {
            groupId: 'g3',
            name: 'Les amis du ciné-club',
            invitedByDisplayName: 'Inès Durand',
            members: [INES, LEA, SAM],
          },
        ]
      )
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Invitation')).toBeInTheDocument();
    expect(screen.getByText('Les amis du ciné-club')).toBeInTheDocument();
    expect(screen.getByText('Inès vous invite, 3 membres')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Rejoindre le groupe Les amis du ciné-club' })
    );

    await waitFor(() => expect(screen.queryByText('Invitation')).toBeNull());
    expect(screen.getByRole('link', { name: /Les amis du ciné-club/ })).toHaveAttribute(
      'href',
      '/groupes/g3'
    );
  });

  it('declines a pending invitation', async () => {
    server.use(
      authedAlice,
      ...createGroupsHandlers(
        [FAMILLE],
        [{ groupId: 'g3', name: 'Ciné-club', invitedByDisplayName: 'Inès', members: [INES] }]
      )
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Refuser l’invitation au groupe Ciné-club' })
    );

    await waitFor(() => expect(screen.queryByText('Invitation')).toBeNull());
    expect(screen.queryByRole('link', { name: /Ciné-club/ })).toBeNull();
  });

  it('says why an invitation could not be answered', async () => {
    server.use(
      authedAlice,
      http.post(`${TEST_API_V1}/groups/g3/invitation/accept`, () =>
        apiErrorJson(409, 'group_members_limit_reached', { max: 20 })
      ),
      ...createGroupsHandlers(
        [],
        [{ groupId: 'g3', name: 'Ciné-club', invitedByDisplayName: 'Inès', members: [INES] }]
      )
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Rejoindre le groupe Ciné-club' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce groupe réunit déjà 20 personnes, invitations en attente comprises.'
    );
  });

  it('invites to create a first group when there is none, then opens it to invite people', async () => {
    server.use(authedAlice, ...createGroupsHandlers());
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Pas encore de groupe')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Réunissez les amis avec qui vous faites vos soirées. Ensuite, chaque soirée du groupe arrive chez eux, sans lien à envoyer.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nouveau groupe' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Créer un groupe' }));
    await user.type(await screen.findByRole('textbox', { name: 'Nom' }), 'Famille');
    await user.click(screen.getByRole('button', { name: 'Créer le groupe' }));

    expect(await screen.findByText('Page du groupe')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/groupes/g1{"openMembers":true}');
  });

  it('offers to try again when the groups could not be loaded', async () => {
    let calls = 0;
    server.use(
      authedAlice,
      http.get(`${TEST_API_V1}/groups`, () => {
        calls += 1;
        return calls === 1
          ? apiErrorJson(500, 'internal_error')
          : apiJson<'MyGroupsResponse'>({
              groups: [],
              invitations: [],
              nextNights: [],
              showcases: [],
            });
      })
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Pas encore de groupe')).toBeInTheDocument();
  });
});
