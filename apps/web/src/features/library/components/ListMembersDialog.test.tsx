import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import {
  createListMembershipHandlers,
  TEST_API_V1,
  type MockListMembership,
  type MockListPerson,
} from '@/mocks/handlers';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import type { MovieListDetail } from '@/features/library/api/listsApi';
import { cancelListInvitation } from '@/features/library/api/listMembersApi';
import ListMembersDialog from './ListMembersDialog';

vi.mock('@/shared/utils/copyTextToClipboard', () => ({ copyTextToClipboard: vi.fn() }));

vi.mock('@/features/library/api/listMembersApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/library/api/listMembersApi')>();
  return { ...actual, cancelListInvitation: vi.fn(actual.cancelListInvitation) };
});

function listError(status: number, reason: string, params?: Record<string, number>) {
  return HttpResponse.json({ error: reason, code: status, reason, params }, { status });
}

function activeLink(token: string) {
  return {
    token,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  };
}

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
const TOM: MockListPerson = { userId: 'u3', handle: null, displayName: 'Tom', avatarId: null };
const SAM: MockListPerson = {
  userId: 'u4',
  handle: 'sam',
  displayName: 'Sam Roux',
  avatarId: null,
};
const MARION: MockListPerson = {
  userId: 'u5',
  handle: 'marion',
  displayName: 'Marion Petit',
  avatarId: null,
};
const MARC: MockListPerson = {
  userId: 'u6',
  handle: 'marc',
  displayName: 'Marc Blanc',
  avatarId: null,
};

const authedAlice = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
  })
);

const HALLOWEEN: MovieListDetail = {
  id: 'l1',
  name: 'Halloween',
  description: null,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  items: [],
  role: 'owner',
  owner: ALICE,
  memberCount: 3,
  memberPreview: [ALICE, LEA, TOM],
};

const SUNDAY_CINEMA: MovieListDetail = {
  ...HALLOWEEN,
  name: 'Ciné du dimanche',
  role: 'member',
  owner: LEA,
  memberCount: 2,
  memberPreview: [LEA, ALICE],
};

const OWNER_VIEW: MockListMembership = {
  members: [
    { ...ALICE, isOwner: true },
    { ...LEA, isOwner: false },
    { ...TOM, isOwner: false },
  ],
  invitations: [SAM],
  inviteLink: null,
  invitable: [MARION, MARC],
};

function renderDialog(list: MovieListDetail = HALLOWEEN, onClose = vi.fn()) {
  render(
    <AppTestProviders>
      <ListMembersDialog list={list} onClose={onClose} />
    </AppTestProviders>
  );
  return onClose;
}

async function findDialog(name = 'Membres de « Halloween »') {
  return screen.findByRole('dialog', { name });
}

describe('ListMembersDialog', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
  });
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.useRealTimers();
  });
  afterAll(() => server.close());

  it('shows the creator who is in the list, who is invited, and what members may do', async () => {
    server.use(authedAlice, ...createListMembershipHandlers('l1', OWNER_VIEW));
    renderDialog();

    const dialog = await findDialog();
    expect(
      within(dialog).getByText(
        'Les membres ajoutent et retirent des films. Vous seul invitez, modifiez et supprimez la liste.'
      )
    ).toBeInTheDocument();
    const members = await within(dialog).findByRole('list', { name: 'Membres' });
    const rows = within(members).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Vous'),
      expect.stringContaining('Léa Moreau'),
      expect.stringContaining('Tom'),
      expect.stringContaining('Sam Roux'),
    ]);
    expect(within(rows[0]!).getByText('Créateur')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('@alice')).toBeInTheDocument();
    expect(
      within(rows[1]!).getByRole('button', { name: 'Retirer Léa Moreau de la liste' })
    ).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Invitation envoyée')).toBeInTheDocument();
    expect(
      within(rows[3]!).getByRole('button', { name: 'Annuler l’invitation de Sam Roux' })
    ).toBeInTheDocument();
  });

  it('shows a member who is in the list, without inviting nor removing anyone', async () => {
    server.use(
      authedAlice,
      ...createListMembershipHandlers('l1', {
        members: [
          { ...LEA, isOwner: true },
          { ...ALICE, isOwner: false },
        ],
        invitations: null,
      })
    );
    renderDialog(SUNDAY_CINEMA);

    const dialog = await findDialog('Membres de « Ciné du dimanche »');
    expect(
      within(dialog).getByText(
        'Les membres ajoutent et retirent des films. Inviter, modifier et supprimer la liste reste réservé à Léa.'
      )
    ).toBeInTheDocument();
    const members = await within(dialog).findByRole('list', { name: 'Membres' });
    const rows = within(members).getAllByRole('listitem');
    expect(within(rows[0]!).getByText('Léa Moreau')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Créateur')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Vous')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /retirer/i })).toBeNull();
    expect(within(dialog).queryByRole('searchbox')).toBeNull();
    expect(within(dialog).queryByText('Ou partager un lien d’invitation')).toBeNull();
  });

  it('invites a followed account found by name, who then waits among the invitations', async () => {
    let invited: unknown = null;
    server.use(
      authedAlice,
      http.post(`${TEST_API_V1}/lists/l1/invitations`, async ({ request }) => {
        invited = await request.clone().json();
        return undefined;
      }),
      ...createListMembershipHandlers('l1', OWNER_VIEW)
    );
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    const search = await within(dialog).findByRole('searchbox', {
      name: 'Rechercher parmi les comptes que vous suivez',
    });
    expect(within(dialog).getByText('Marc Blanc')).toBeInTheDocument();
    await user.type(search, 'mario');
    expect(within(dialog).queryByText('Marc Blanc')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Inviter Marion Petit' }));

    await waitFor(() => expect(invited).toEqual({ userId: 'u5' }));
    const members = within(dialog).getByRole('list', { name: 'Membres' });
    expect(await within(members).findByText('Marion Petit')).toBeInTheDocument();
    expect(within(members).getAllByText('Invitation envoyée')).toHaveLength(2);
    expect(within(dialog).queryByRole('button', { name: 'Inviter Marion Petit' })).toBeNull();
    expect(
      within(dialog).getByRole('heading', { name: 'Inviter quelqu’un que vous suivez' })
    ).toHaveFocus();
  });

  it('moves the focus to the next followed account once an invitation is sent', async () => {
    server.use(authedAlice, ...createListMembershipHandlers('l1', OWNER_VIEW));
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    const marc = (
      await within(dialog).findByRole('button', { name: 'Inviter Marc Blanc' })
    ).closest('li');
    await user.click(within(dialog).getByRole('button', { name: 'Inviter Marion Petit' }));

    await waitFor(() => expect(marc).toHaveFocus());
    expect(within(dialog).queryByRole('button', { name: 'Inviter Marion Petit' })).toBeNull();
  });

  it('tells assistive technologies the followed accounts are loading', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      authedAlice,
      http.get(`${TEST_API_V1}/lists/l1/invitable`, async () => {
        await gate;
        return undefined;
      }),
      ...createListMembershipHandlers('l1', OWNER_VIEW)
    );
    renderDialog();

    const dialog = await findDialog();
    await within(dialog).findByRole('list', { name: 'Membres' });

    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Chargement des comptes que vous suivez…'
    );
    release();
    expect(
      await within(dialog).findByRole('button', { name: 'Inviter Marion Petit' })
    ).toBeInTheDocument();
  });

  it('says why an invitation could not be sent', async () => {
    server.use(
      authedAlice,
      http.post(`${TEST_API_V1}/lists/l1/invitations`, () =>
        listError(409, 'list_members_limit_reached', { max: 5 })
      ),
      ...createListMembershipHandlers('l1', { ...OWNER_VIEW, maxMembers: 5 })
    );
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.click(await within(dialog).findByRole('button', { name: 'Inviter Marion Petit' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Cette liste réunit déjà 5 personnes, invitations en attente comprises.'
    );
    expect(within(dialog).getByRole('button', { name: 'Inviter Marion Petit' })).toBeEnabled();
  });

  it('says when no followed account matches the search', async () => {
    server.use(authedAlice, ...createListMembershipHandlers('l1', OWNER_VIEW));
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.type(await within(dialog).findByRole('searchbox'), 'zzz');

    expect(
      within(dialog).getByText('Aucun compte suivi ne correspond à « zzz ».')
    ).toBeInTheDocument();
  });

  it('says the creator follows nobody when no one else is in the list nor invited', async () => {
    server.use(
      authedAlice,
      ...createListMembershipHandlers('l1', {
        members: [{ ...ALICE, isOwner: true }],
        invitations: [],
        invitable: [],
      })
    );
    renderDialog({ ...HALLOWEEN, memberCount: 1, memberPreview: [ALICE] });

    const dialog = await findDialog();
    expect(
      await within(dialog).findByText(
        'Vous ne suivez encore personne. Suivez vos amis depuis leur profil pour les inviter ici, ou partagez un lien.'
      )
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('searchbox')).toBeNull();
  });

  it('says everyone followed is already there when nobody is left to invite', async () => {
    server.use(
      authedAlice,
      ...createListMembershipHandlers('l1', { ...OWNER_VIEW, invitable: [] })
    );
    renderDialog();

    const dialog = await findDialog();
    expect(
      await within(dialog).findByText(
        'Toutes les personnes que vous suivez sont déjà dans la liste ou invitées.'
      )
    ).toBeInTheDocument();
  });

  it('cancels a pending invitation at once', async () => {
    server.use(authedAlice, ...createListMembershipHandlers('l1', OWNER_VIEW));
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.click(
      await within(dialog).findByRole('button', { name: 'Annuler l’invitation de Sam Roux' })
    );

    const members = within(dialog).getByRole('list', { name: 'Membres' });
    await waitFor(() => expect(within(members).queryByText('Sam Roux')).toBeNull());
    expect(within(dialog).getByRole('heading', { name: 'Membres' })).toHaveFocus();
    expect(
      await within(dialog).findByRole('button', { name: 'Inviter Sam Roux' })
    ).toBeInTheDocument();
  });

  it('says the cancellation failed, not an invitation, when it fails without a message', async () => {
    vi.mocked(cancelListInvitation).mockRejectedValueOnce('offline');
    server.use(authedAlice, ...createListMembershipHandlers('l1', OWNER_VIEW));
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.click(
      await within(dialog).findByRole('button', { name: 'Annuler l’invitation de Sam Roux' })
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Annulation de l’invitation impossible.'
    );
    expect(within(dialog).getByText('Sam Roux')).toBeInTheDocument();
  });

  it('removes a member only once the removal is confirmed on the same line', async () => {
    let removed: string | null = null;
    server.use(
      authedAlice,
      http.delete(`${TEST_API_V1}/lists/l1/members/:userId`, ({ params }) => {
        removed = String(params.userId);
        return undefined;
      }),
      ...createListMembershipHandlers('l1', OWNER_VIEW)
    );
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.click(
      await within(dialog).findByRole('button', { name: 'Retirer Léa Moreau de la liste' })
    );
    expect(
      within(dialog).getByText('Retirer de la liste ? Ses films restent.')
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Garder Léa Moreau dans la liste' })
    );
    expect(removed).toBeNull();

    await user.click(
      within(dialog).getByRole('button', { name: 'Retirer Léa Moreau de la liste' })
    );
    const confirm = within(dialog).getByRole('button', {
      name: 'Confirmer le retrait de Léa Moreau',
    });
    expect(confirm).toHaveFocus();
    await user.click(confirm);

    await waitFor(() => expect(removed).toBe('u2'));
    const members = within(dialog).getByRole('list', { name: 'Membres' });
    await waitFor(() => expect(within(members).queryByText('Léa Moreau')).toBeNull());
    expect(within(members).getByText('Tom').closest('li')).toHaveFocus();
  });

  it('says why a member could not be removed, and keeps them in the list', async () => {
    server.use(
      authedAlice,
      http.delete(`${TEST_API_V1}/lists/l1/members/:userId`, () =>
        listError(403, 'list_owner_only')
      ),
      ...createListMembershipHandlers('l1', OWNER_VIEW)
    );
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.click(
      await within(dialog).findByRole('button', { name: 'Retirer Léa Moreau de la liste' })
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirmer le retrait de Léa Moreau' })
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Seul le créateur de la liste peut faire cela.'
    );
    const members = within(dialog).getByRole('list', { name: 'Membres' });
    expect(within(members).getByText('Léa Moreau')).toBeInTheDocument();
  });

  it('offers a new invitation link once a member is removed, the old one being turned off', async () => {
    server.use(
      authedAlice,
      ...createListMembershipHandlers('l1', { ...OWNER_VIEW, inviteLink: activeLink('7xK2pQ') })
    );
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    expect(
      await within(dialog).findByRole('textbox', { name: 'Lien d’invitation' })
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Retirer Léa Moreau de la liste' })
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirmer le retrait de Léa Moreau' })
    );

    expect(
      await within(dialog).findByRole('button', { name: 'Créer un lien d’invitation' })
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: 'Lien d’invitation' })).toBeNull();
  });

  it('says the list is full and stops inviting', async () => {
    server.use(
      authedAlice,
      ...createListMembershipHandlers('l1', { ...OWNER_VIEW, maxMembers: 4 })
    );
    renderDialog();

    const dialog = await findDialog();
    expect(
      await within(dialog).findByText(
        'La liste est complète : 4 personnes au plus, invitations en attente comprises.'
      )
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByRole('button', { name: 'Inviter Marion Petit' })
    ).toBeDisabled();
  });

  it('creates an invitation link, copies it, then disables it', async () => {
    server.use(authedAlice, ...createListMembershipHandlers('l1', OWNER_VIEW));
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.click(
      await within(dialog).findByRole('button', { name: 'Créer un lien d’invitation' })
    );

    const link = await within(dialog).findByRole('textbox', { name: 'Lien d’invitation' });
    const url = `${globalThis.location.origin}/l/nouveau-lien/rejoindre`;
    expect(link).toHaveValue(url);
    expect(link).toHaveAttribute('readonly');
    expect(within(dialog).getByText(/^Valable jusqu’au /)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Copier' }));
    await waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledWith(url));
    expect(await within(dialog).findByRole('button', { name: 'Copié' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Désactiver le lien' }));
    expect(
      await within(dialog).findByRole('button', { name: 'Créer un lien d’invitation' })
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: 'Lien d’invitation' })).toBeNull();
  });

  it('says why the invitation link could not be created', async () => {
    server.use(
      authedAlice,
      http.post(`${TEST_API_V1}/lists/l1/invite-link`, () => listError(403, 'list_owner_only')),
      ...createListMembershipHandlers('l1', OWNER_VIEW)
    );
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.click(
      await within(dialog).findByRole('button', { name: 'Créer un lien d’invitation' })
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Seul le créateur de la liste peut faire cela.'
    );
    expect(within(dialog).queryByRole('textbox', { name: 'Lien d’invitation' })).toBeNull();
  });

  it('says why the invitation link could not be turned off, and keeps showing it', async () => {
    server.use(
      authedAlice,
      http.delete(`${TEST_API_V1}/lists/l1/invite-link`, () => listError(404, 'list_not_found')),
      ...createListMembershipHandlers('l1', { ...OWNER_VIEW, inviteLink: activeLink('7xK2pQ') })
    );
    const user = userEvent.setup();
    renderDialog();

    const dialog = await findDialog();
    await user.click(await within(dialog).findByRole('button', { name: 'Désactiver le lien' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Cette liste n’existe plus.'
    );
    expect(within(dialog).getByRole('textbox', { name: 'Lien d’invitation' })).toHaveValue(
      `${globalThis.location.origin}/l/7xK2pQ/rejoindre`
    );
  });

  it('shows the active link it already has', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T12:00:00Z'));
    server.use(
      authedAlice,
      ...createListMembershipHandlers('l1', {
        ...OWNER_VIEW,
        inviteLink: { token: '7xK2pQ', expiresAt: '2026-11-20T10:00:00Z', active: true },
      })
    );
    renderDialog();

    const dialog = await findDialog();
    expect(await within(dialog).findByRole('textbox', { name: 'Lien d’invitation' })).toHaveValue(
      `${globalThis.location.origin}/l/7xK2pQ/rejoindre`
    );
    expect(within(dialog).getByText('Valable jusqu’au 20 novembre.')).toBeInTheDocument();
  });

  it('closes with Terminé', async () => {
    server.use(authedAlice, ...createListMembershipHandlers('l1', OWNER_VIEW));
    const user = userEvent.setup();
    const onClose = renderDialog();

    const dialog = await findDialog();
    await user.click(within(dialog).getByRole('button', { name: 'Terminé' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('opens as a sheet on a phone, with the same content', async () => {
    stubMatchMedia(true);
    server.use(authedAlice, ...createListMembershipHandlers('l1', OWNER_VIEW));
    renderDialog();

    const dialog = await findDialog();
    expect(await within(dialog).findByText('Léa Moreau')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Terminé' })).toBeInTheDocument();
  });
});
