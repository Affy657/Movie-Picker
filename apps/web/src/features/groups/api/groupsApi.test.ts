import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi } from '@/shared/api/client';
import {
  acceptGroupInvitation,
  cancelGroupInvitation,
  createGroup,
  createGroupInviteLink,
  declineGroupInvitation,
  deleteGroup,
  disableGroupInviteLink,
  fetchGroup,
  fetchGroupRanking,
  fetchGroupInvitableUsers,
  fetchGroupInvitePreview,
  fetchGroupMembers,
  groupJoinFrontendUrl,
  inviteToGroup,
  joinGroupByLink,
  leaveGroup,
  removeGroupMember,
  renameGroup,
} from '@/features/groups/api/groupsApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('a group', () => {
  it('reads a group with its members and nights', async () => {
    mockFetchApi.mockResolvedValue({ id: 'g1', name: 'Les jeudis ciné' });
    const controller = new AbortController();

    const group = await fetchGroup('g1', controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/groups/g1', { signal: controller.signal });
    expect(group).toEqual({ id: 'g1', name: 'Les jeudis ciné' });
  });

  it('reads the figures of the ranking', async () => {
    mockFetchApi.mockResolvedValue({ nightCount: 3, members: [] });
    const controller = new AbortController();

    const ranking = await fetchGroupRanking('g1', controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/groups/g1/ranking', { signal: controller.signal });
    expect(ranking).toEqual({ nightCount: 3, members: [] });
  });

  it('creates, renames and deletes a group', async () => {
    mockFetchApi.mockResolvedValueOnce({ id: 'g1', name: 'Famille' });
    mockFetchApi.mockResolvedValueOnce({ id: 'g1', name: 'La famille' });
    mockFetchApi.mockResolvedValueOnce(undefined);

    const created = await createGroup('Famille');
    const renamed = await renameGroup('g1', 'La famille');
    await deleteGroup('g1');

    expect(created.id).toBe('g1');
    expect(renamed.name).toBe('La famille');
    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/groups', {
      method: 'POST',
      body: JSON.stringify({ name: 'Famille' }),
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/groups/g1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'La famille' }),
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(3, '/groups/g1', { method: 'DELETE' });
  });
});

describe('the members of a group', () => {
  it('reads the members with the creator marked, and the invitations only the creator gets', async () => {
    mockFetchApi.mockResolvedValue({
      maxMembers: 20,
      members: [
        { userId: 'u1', displayName: 'Léa', role: 'owner' },
        { userId: 'u2', displayName: 'Sam', role: 'member' },
      ],
      invitations: null,
      inviteLink: null,
    });

    const members = await fetchGroupMembers('g1');

    expect(mockFetchApi).toHaveBeenCalledWith('/groups/g1/members', { signal: undefined });
    expect(members).toEqual({
      maxMembers: 20,
      members: [
        { userId: 'u1', displayName: 'Léa', role: 'owner', isOwner: true },
        { userId: 'u2', displayName: 'Sam', role: 'member', isOwner: false },
      ],
      invitations: [],
      inviteLink: null,
    });
  });

  it('reads the followed accounts the creator can still invite', async () => {
    mockFetchApi.mockResolvedValueOnce({ users: [{ userId: 'u4', displayName: 'Noé' }] });
    mockFetchApi.mockResolvedValueOnce(null);

    expect(await fetchGroupInvitableUsers('g1')).toEqual([{ userId: 'u4', displayName: 'Noé' }]);
    expect(await fetchGroupInvitableUsers('g1')).toEqual([]);
    expect(mockFetchApi).toHaveBeenCalledWith('/groups/g1/invitable', { signal: undefined });
  });

  it('invites, cancels an invitation, removes a member and leaves', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await inviteToGroup('g1', 'u4');
    await cancelGroupInvitation('g1', 'u4');
    await removeGroupMember('g1', 'u2');
    await leaveGroup('g1');

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/groups/g1/invitations', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u4' }),
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/groups/g1/invitations/u4', {
      method: 'DELETE',
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(3, '/groups/g1/members/u2', {
      method: 'DELETE',
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(4, '/groups/g1/leave', { method: 'POST' });
  });

  it('accepts and declines an invitation', async () => {
    mockFetchApi.mockResolvedValueOnce({ id: 'g1', name: 'Les jeudis ciné' });
    mockFetchApi.mockResolvedValueOnce(undefined);

    const joined = await acceptGroupInvitation('g1');
    await declineGroupInvitation('g2');

    expect(joined.id).toBe('g1');
    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/groups/g1/invitation/accept', {
      method: 'POST',
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/groups/g2/invitation/decline', {
      method: 'POST',
    });
  });

  it('creates the invitation link and disables it', async () => {
    mockFetchApi.mockResolvedValueOnce({
      token: 'tok',
      expiresAt: '2026-11-27T00:00:00Z',
      active: true,
    });
    mockFetchApi.mockResolvedValueOnce(undefined);

    const link = await createGroupInviteLink('g1');
    await disableGroupInviteLink('g1');

    expect(link.token).toBe('tok');
    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/groups/g1/invite-link', { method: 'POST' });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/groups/g1/invite-link', {
      method: 'DELETE',
    });
  });
});

describe('joining a group by link', () => {
  it('reads the group behind a link, then joins it', async () => {
    mockFetchApi.mockResolvedValueOnce({ name: 'Les jeudis ciné', memberCount: 6 });
    mockFetchApi.mockResolvedValueOnce({ group: { id: 'g1' }, joined: true });

    const preview = await fetchGroupInvitePreview('a b');
    const joined = await joinGroupByLink('a b');

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/groups/join/a%20b', { signal: undefined });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/groups/join/a%20b', { method: 'POST' });
    expect(preview).toMatchObject({ name: 'Les jeudis ciné', memberCount: 6 });
    expect(joined.group.id).toBe('g1');
  });

  it('builds the address a creator shares to invite people', () => {
    expect(groupJoinFrontendUrl('7hq2xm')).toBe(`${globalThis.location.origin}/g/7hq2xm/rejoindre`);
  });
});
