import { apiPath, fetchApi } from '@/shared/api/client';
import { ROUTES } from '@/app/routes';
import type { ApiSchemas } from '@/shared/api/contract';
import type { FriendGroupSummary } from '@/features/events/api/myGroupsApi';

export const GROUP_NAME_MAX_LENGTH = 40;

export type FriendGroupDetail = ApiSchemas['FriendGroupDetailResponse'];

export type FriendGroupMember = ApiSchemas['FriendGroupMemberResponse'];

export type FriendGroupInvitation = ApiSchemas['FriendGroupInvitationResponse'];

export type FriendGroupPendingInvitation = ApiSchemas['FriendGroupPendingInvitationResponse'];

export type FriendGroupInviteLink = ApiSchemas['FriendGroupInviteLinkResponse'];

export type FriendGroupInvitableUser = ApiSchemas['FriendGroupInvitableUserResponse'];

export type FriendGroupInvitePreview = ApiSchemas['FriendGroupInvitePreviewResponse'];

export type FriendGroupJoin = ApiSchemas['FriendGroupJoinResponse'];

type FriendGroupMembersResponse = ApiSchemas['FriendGroupMembersResponse'];

type FriendGroupInvitableUsersResponse = ApiSchemas['FriendGroupInvitableUsersResponse'];

export type FriendGroupRosterMember = FriendGroupMember & { isOwner: boolean };

export type FriendGroupMembers = Omit<FriendGroupMembersResponse, 'members' | 'invitations'> & {
  members: FriendGroupRosterMember[];
  invitations: FriendGroupPendingInvitation[];
};

export function fetchGroup(id: string, signal?: AbortSignal): Promise<FriendGroupDetail> {
  return fetchApi<FriendGroupDetail>(apiPath('groups', id), { signal });
}

export function createGroup(name: string): Promise<FriendGroupSummary> {
  return fetchApi<FriendGroupSummary>('/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function renameGroup(id: string, name: string): Promise<FriendGroupSummary> {
  return fetchApi<FriendGroupSummary>(apiPath('groups', id), {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteGroup(id: string): Promise<void> {
  await fetchApi(apiPath('groups', id), { method: 'DELETE' });
}

export async function fetchGroupMembers(
  id: string,
  signal?: AbortSignal
): Promise<FriendGroupMembers> {
  const response = await fetchApi<FriendGroupMembersResponse>(apiPath('groups', id, 'members'), {
    signal,
  });
  return {
    maxMembers: response.maxMembers,
    members: (response.members ?? []).map((member) => ({
      ...member,
      isOwner: member.role === 'owner',
    })),
    invitations: response.invitations ?? [],
    inviteLink: response.inviteLink ?? null,
  };
}

export async function fetchGroupInvitableUsers(
  id: string,
  signal?: AbortSignal
): Promise<FriendGroupInvitableUser[]> {
  const response = await fetchApi<FriendGroupInvitableUsersResponse | null>(
    apiPath('groups', id, 'invitable'),
    { signal }
  );
  return response?.users ?? [];
}

export async function inviteToGroup(id: string, userId: string): Promise<void> {
  await fetchApi(apiPath('groups', id, 'invitations'), {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function cancelGroupInvitation(id: string, userId: string): Promise<void> {
  await fetchApi(apiPath('groups', id, 'invitations', userId), { method: 'DELETE' });
}

export function acceptGroupInvitation(id: string): Promise<FriendGroupSummary> {
  return fetchApi<FriendGroupSummary>(apiPath('groups', id, 'invitation', 'accept'), {
    method: 'POST',
  });
}

export async function declineGroupInvitation(id: string): Promise<void> {
  await fetchApi(apiPath('groups', id, 'invitation', 'decline'), { method: 'POST' });
}

export async function removeGroupMember(id: string, userId: string): Promise<void> {
  await fetchApi(apiPath('groups', id, 'members', userId), { method: 'DELETE' });
}

export async function leaveGroup(id: string): Promise<void> {
  await fetchApi(apiPath('groups', id, 'leave'), { method: 'POST' });
}

export function createGroupInviteLink(id: string): Promise<FriendGroupInviteLink> {
  return fetchApi<FriendGroupInviteLink>(apiPath('groups', id, 'invite-link'), {
    method: 'POST',
  });
}

export async function disableGroupInviteLink(id: string): Promise<void> {
  await fetchApi(apiPath('groups', id, 'invite-link'), { method: 'DELETE' });
}

export function fetchGroupInvitePreview(
  token: string,
  signal?: AbortSignal
): Promise<FriendGroupInvitePreview> {
  return fetchApi<FriendGroupInvitePreview>(apiPath('groups', 'join', token), { signal });
}

export function joinGroupByLink(token: string): Promise<FriendGroupJoin> {
  return fetchApi<FriendGroupJoin>(apiPath('groups', 'join', token), { method: 'POST' });
}

export function groupJoinFrontendUrl(token: string): string {
  return `${globalThis.location.origin}${ROUTES.groupJoin(token)}`;
}
