import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { buildUserProfile } from '@/test-utils/userProfile';
import { apiErrorJson, apiJson, type ApiSchemas } from '@/mocks/apiJson';
import { authMeGuestHandler, createGroupJoinHandlers, TEST_API_V1 } from '@/mocks/handlers';
import JoinGroupPage from './JoinGroupPage';

const authedAlice = http.get(`${TEST_API_V1}/auth/me`, () =>
  apiJson<'UserProfileResponse'>(buildUserProfile({ userId: 'u1', displayName: 'Alice' }))
);

const PREVIEW: ApiSchemas['FriendGroupInvitePreviewResponse'] = {
  name: 'Les jeudis ciné',
  ownerDisplayName: 'Léa Moreau',
  memberCount: 6,
  memberPreview: [
    { displayName: 'Léa Moreau', avatarId: '' },
    { displayName: 'Sam', avatarId: '' },
  ],
  isFull: false,
  role: null,
  groupId: null,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderPage(token = 'tok') {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[`/g/${token}/rejoindre`]}>
        <Routes>
          <Route path="/g/:token/rejoindre" element={<JoinGroupPage />} />
          <Route path="/groupes/:groupId" element={<p>Page du groupe</p>} />
          <Route path="/" element={<p>Accueil</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('JoinGroupPage', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('shows a visitor the group behind the link, and asks them to sign in to join', async () => {
    server.use(authMeGuestHandler, ...createGroupJoinHandlers('tok', PREVIEW));
    renderPage();

    expect(await screen.findByText('Léa vous invite à rejoindre ce groupe.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Rejoindre un groupe' })
    ).toBeInTheDocument();
    expect(screen.getByText('Invitation')).toBeInTheDocument();
    expect(screen.getByText('Les jeudis ciné')).toBeInTheDocument();
    expect(screen.getByText('6 membres')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent('/g/tok/rejoindre')}`
    );
    expect(screen.queryByRole('button', { name: 'Rejoindre le groupe' })).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex'
    );
  });

  it('lets a signed-in person join, then opens the group', async () => {
    server.use(
      authedAlice,
      ...createGroupJoinHandlers('tok', PREVIEW, { id: 'g1', name: 'Les jeudis ciné' })
    );
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByText(
        'Les soirées du groupe apparaîtront dans Mes soirées, sans lien à attendre. Vous pourrez quitter le groupe à tout moment.'
      )
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rejoindre le groupe' }));

    expect(await screen.findByText('Page du groupe')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/groupes/g1');
  });

  it('says the group filled up between the invitation and the click, and stays on the page', async () => {
    server.use(
      authedAlice,
      http.post(`${TEST_API_V1}/groups/join/tok`, () =>
        apiErrorJson(409, 'group_members_limit_reached', { max: 20 })
      ),
      ...createGroupJoinHandlers('tok', PREVIEW)
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Rejoindre le groupe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce groupe réunit déjà 20 personnes, invitations en attente comprises.'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/g/tok/rejoindre');
  });

  it('says the group is full before anyone tries to join', async () => {
    server.use(authedAlice, ...createGroupJoinHandlers('tok', { ...PREVIEW, isFull: true }));
    renderPage();

    expect(await screen.findByText('Ce groupe est complet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Il réunit déjà le nombre maximum de personnes. Demandez à Léa de faire de la place.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejoindre le groupe' })).toBeNull();
  });

  it('goes straight to the group when the person is already in it', async () => {
    server.use(
      authedAlice,
      ...createGroupJoinHandlers('tok', { ...PREVIEW, role: 'member', groupId: 'g1' })
    );
    renderPage();

    expect(await screen.findByText('Page du groupe')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/groupes/g1');
  });

  it('says the link no longer works', async () => {
    server.use(authedAlice, ...createGroupJoinHandlers('tok', null));
    renderPage();

    expect(await screen.findByText('Ce lien d’invitation n’est plus valable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/');
  });

  it('offers to try again when the invitation could not be loaded', async () => {
    let calls = 0;
    server.use(
      authedAlice,
      http.get(`${TEST_API_V1}/groups/join/tok`, () => {
        calls += 1;
        return calls === 1
          ? apiErrorJson(500, 'internal_error')
          : apiJson<'FriendGroupInvitePreviewResponse'>(PREVIEW);
      })
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Les jeudis ciné')).toBeInTheDocument();
  });
});
