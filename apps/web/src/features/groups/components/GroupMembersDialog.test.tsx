import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { buildUserProfile } from '@/test-utils/userProfile';
import { apiJson } from '@/mocks/apiJson';
import {
  createGroupMembershipHandlers,
  TEST_API_V1,
  type MockGroupMember,
  type MockListPerson,
} from '@/mocks/handlers';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import GroupMembersDialog from './GroupMembersDialog';

vi.mock('@/shared/utils/copyTextToClipboard', () => ({ copyTextToClipboard: vi.fn() }));

const LEA: MockGroupMember = {
  userId: 'u1',
  handle: 'lea',
  displayName: 'Léa Moreau',
  avatarId: null,
  role: 'owner',
};
const SAM: MockGroupMember = { userId: 'u3', handle: 'sam', displayName: 'Sam', avatarId: null };
const INES: MockListPerson = { userId: 'u4', handle: 'ines', displayName: 'Inès', avatarId: null };
const NOE: MockListPerson = { userId: 'u5', handle: 'noe', displayName: 'Noé', avatarId: null };

function signedInAs(userId: string, displayName: string) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    apiJson<'UserProfileResponse'>(buildUserProfile({ userId, displayName }))
  );
}

const JEUDIS = {
  id: 'g1',
  name: 'Les jeudis ciné',
  ownerDisplayName: 'Léa Moreau',
};

function renderDialog(role: 'owner' | 'member' = 'owner') {
  const onClose = vi.fn();
  render(
    <AppTestProviders>
      <GroupMembersDialog group={{ ...JEUDIS, role }} onClose={onClose} />
    </AppTestProviders>
  );
  return { onClose };
}

describe('GroupMembersDialog', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.mocked(copyTextToClipboard).mockReset();
  });
  afterAll(() => server.close());

  it('shows the creator who is in the group, who is invited, and what members may do', async () => {
    server.use(
      signedInAs('u1', 'Léa Moreau'),
      ...createGroupMembershipHandlers('g1', {
        members: [SAM, LEA],
        invitations: [INES],
        invitable: [NOE],
      })
    );
    renderDialog();

    expect(
      await screen.findByRole('heading', { name: 'Membres de « Les jeudis ciné »' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Les membres voient toutes les soirées du groupe et peuvent en créer. Vous seul invitez, renommez et supprimez le groupe.'
      )
    ).toBeInTheDocument();
    const members = await screen.findByRole('list', { name: 'Membres' });
    const rows = within(members).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Vous');
    expect(rows[0]).toHaveTextContent('Créateur');
    expect(rows[1]).toHaveTextContent('Sam');
    expect(rows[2]).toHaveTextContent('Inès');
    expect(rows[2]).toHaveTextContent('Invitation envoyée');
    expect(await screen.findByRole('button', { name: 'Inviter Noé' })).toBeEnabled();
  });

  it('shows a member who is in the group, without inviting nor removing anyone', async () => {
    server.use(
      signedInAs('u3', 'Sam'),
      ...createGroupMembershipHandlers('g1', { members: [LEA, SAM], invitations: null })
    );
    renderDialog('member');

    expect(
      await screen.findByText(
        'Les membres voient toutes les soirées du groupe et peuvent en créer. Inviter, renommer et supprimer le groupe reste réservé à Léa.'
      )
    ).toBeInTheDocument();
    await screen.findByRole('list', { name: 'Membres' });
    expect(screen.queryByRole('button', { name: /retirer/i })).toBeNull();
    expect(screen.queryByText('Inviter quelqu’un que vous suivez')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Créer un lien d’invitation' })).toBeNull();
  });

  it('invites a followed account, who then waits among the invitations', async () => {
    server.use(
      signedInAs('u1', 'Léa Moreau'),
      ...createGroupMembershipHandlers('g1', { members: [LEA], invitable: [NOE] })
    );
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Inviter Noé' }));

    const members = screen.getByRole('list', { name: 'Membres' });
    await waitFor(() => expect(within(members).getByText('Noé')).toBeInTheDocument());
    expect(within(members).getByText('Invitation envoyée')).toBeInTheDocument();
  });

  it('removes a member from the group once the removal is confirmed', async () => {
    server.use(
      signedInAs('u1', 'Léa Moreau'),
      ...createGroupMembershipHandlers('g1', { members: [LEA, SAM] })
    );
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Retirer Sam du groupe' }));
    expect(screen.getByText('Retirer du groupe ? Ses soirées restent.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer le retrait de Sam' }));

    await waitFor(() => expect(screen.queryByText('Sam')).toBeNull());
  });

  it('creates an invitation link to the group join page, and copies it', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    server.use(
      signedInAs('u1', 'Léa Moreau'),
      ...createGroupMembershipHandlers('g1', { members: [LEA] })
    );
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Créer un lien d’invitation' }));

    const link = await screen.findByRole('textbox', { name: 'Lien d’invitation' });
    expect(link).toHaveValue(`${globalThis.location.origin}/g/nouveau-lien/rejoindre`);
    await user.click(screen.getByRole('button', { name: 'Copier' }));
    await waitFor(() =>
      expect(copyTextToClipboard).toHaveBeenCalledWith(
        `${globalThis.location.origin}/g/nouveau-lien/rejoindre`
      )
    );
  });

  it('says the group is full and stops inviting', async () => {
    server.use(
      signedInAs('u1', 'Léa Moreau'),
      ...createGroupMembershipHandlers('g1', {
        maxMembers: 2,
        members: [LEA, SAM],
        invitable: [NOE],
      })
    );
    renderDialog();

    expect(
      await screen.findByText(
        'Le groupe est complet : 2 personnes au plus, invitations en attente comprises.'
      )
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Inviter Noé' })).toBeDisabled();
  });

  it('closes with Terminé', async () => {
    server.use(
      signedInAs('u1', 'Léa Moreau'),
      ...createGroupMembershipHandlers('g1', { members: [LEA] })
    );
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Terminé' }));

    expect(onClose).toHaveBeenCalled();
  });
});
