import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi } from '@/shared/api/client';
import {
  cancelListInvitation,
  createInviteLink,
  disableInviteLink,
  fetchInvitableUsers,
  fetchInvitePreview,
  fetchListMembers,
  inviteToList,
  joinListByLink,
  leaveList,
  listJoinFrontendUrl,
  removeListMember,
} from '@/features/lists/api/listMembersApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

beforeEach(() => {
  mockFetchApi.mockReset();
});

describe('reading the members of a list', () => {
  it('reads the members, and the invitations and link that only the creator gets', async () => {
    mockFetchApi.mockResolvedValue({
      maxMembers: 20,
      members: [{ userId: 'u1', displayName: 'Alice', isOwner: true }],
      invitations: null,
      inviteLink: null,
    });

    const members = await fetchListMembers('l1');

    expect(mockFetchApi).toHaveBeenCalledWith('/lists/l1/members', { signal: undefined });
    expect(members).toEqual({
      maxMembers: 20,
      members: [{ userId: 'u1', displayName: 'Alice', isOwner: true }],
      invitations: [],
      inviteLink: null,
    });
  });

  it('reads the followed accounts the creator can still invite', async () => {
    mockFetchApi.mockResolvedValue({ users: [{ userId: 'u4', displayName: 'Marion' }] });
    const controller = new AbortController();

    const users = await fetchInvitableUsers('l1', controller.signal);

    expect(mockFetchApi).toHaveBeenCalledWith('/lists/l1/invitable', {
      signal: controller.signal,
    });
    expect(users).toEqual([{ userId: 'u4', displayName: 'Marion' }]);
  });

  it('reads a missing users array as nobody to invite', async () => {
    mockFetchApi.mockResolvedValue({});

    expect(await fetchInvitableUsers('l1')).toEqual([]);
  });
});

describe('membership mutations', () => {
  it('invites a followed account and cancels the invitation', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await inviteToList('l1', 'u4');
    await cancelListInvitation('l1', 'u4');

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/lists/l1/invitations', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u4' }),
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/lists/l1/invitations/u4', {
      method: 'DELETE',
    });
  });

  it('removes a member and leaves a list', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await removeListMember('l1', 'u2');
    await leaveList('l1');

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/lists/l1/members/u2', { method: 'DELETE' });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/lists/l1/leave', { method: 'POST' });
  });

  it('creates the invitation link and disables it', async () => {
    mockFetchApi.mockResolvedValueOnce({
      token: 'tok',
      expiresAt: '2026-11-20T00:00:00Z',
      active: true,
    });
    mockFetchApi.mockResolvedValueOnce(undefined);

    const link = await createInviteLink('l1');
    await disableInviteLink('l1');

    expect(link.token).toBe('tok');
    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/lists/l1/invite-link', { method: 'POST' });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/lists/l1/invite-link', { method: 'DELETE' });
  });
});

describe('joining by link', () => {
  it('reads the preview of the list behind a link, then joins it', async () => {
    mockFetchApi.mockResolvedValueOnce({ name: 'Halloween', itemCount: 8 });
    mockFetchApi.mockResolvedValueOnce({ id: 'l1', name: 'Halloween' });

    const preview = await fetchInvitePreview('a b');
    const joined = await joinListByLink('a b');

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/lists/join/a%20b', { signal: undefined });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/lists/join/a%20b', { method: 'POST' });
    expect(preview).toMatchObject({ name: 'Halloween', itemCount: 8, posterPaths: [] });
    expect(joined.id).toBe('l1');
  });

  it('builds the address a creator shares to invite people', () => {
    expect(listJoinFrontendUrl('7xK2pQ')).toBe(`${globalThis.location.origin}/l/7xK2pQ/rejoindre`);
  });
});
