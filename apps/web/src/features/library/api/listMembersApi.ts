import { apiPath, fetchApi } from '@/shared/api/client';
import { ROUTES } from '@/app/routes';
import type { ApiSchemas } from '@/shared/api/contract';
import type { MovieListSummary } from '@/features/library/api/listsApi';

export type MovieListPendingInvitation = ApiSchemas['MovieListPendingInvitationResponse'];

export type MovieListInviteLink = ApiSchemas['MovieListInviteLinkResponse'];

type MovieListMembersResponse = ApiSchemas['MovieListMembersResponse'];

export type MovieListMembers = Omit<MovieListMembersResponse, 'invitations'> & {
  invitations: MovieListPendingInvitation[];
};

export type MovieListInvitableUser = ApiSchemas['MovieListInvitableUserResponse'];

export type MovieListInvitePreview = ApiSchemas['MovieListInvitePreviewResponse'];

type MovieListInvitableUsersResponse = ApiSchemas['MovieListInvitableUsersResponse'];

export async function fetchListMembers(
  id: string,
  signal?: AbortSignal
): Promise<MovieListMembers> {
  const response = await fetchApi<MovieListMembersResponse>(apiPath('lists', id, 'members'), {
    signal,
  });
  return {
    maxMembers: response.maxMembers,
    members: response.members ?? [],
    invitations: response.invitations ?? [],
    inviteLink: response.inviteLink ?? null,
  };
}

export async function fetchInvitableUsers(
  id: string,
  signal?: AbortSignal
): Promise<MovieListInvitableUser[]> {
  const response = await fetchApi<MovieListInvitableUsersResponse | null>(
    apiPath('lists', id, 'invitable'),
    { signal }
  );
  return response?.users ?? [];
}

export async function inviteToList(id: string, userId: string): Promise<void> {
  await fetchApi(apiPath('lists', id, 'invitations'), {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function cancelListInvitation(id: string, userId: string): Promise<void> {
  await fetchApi(apiPath('lists', id, 'invitations', userId), { method: 'DELETE' });
}

export async function removeListMember(id: string, userId: string): Promise<void> {
  await fetchApi(apiPath('lists', id, 'members', userId), { method: 'DELETE' });
}

export async function leaveList(id: string): Promise<void> {
  await fetchApi(apiPath('lists', id, 'leave'), { method: 'POST' });
}

export async function createInviteLink(id: string): Promise<MovieListInviteLink> {
  return fetchApi<MovieListInviteLink>(apiPath('lists', id, 'invite-link'), { method: 'POST' });
}

export async function disableInviteLink(id: string): Promise<void> {
  await fetchApi(apiPath('lists', id, 'invite-link'), { method: 'DELETE' });
}

export async function fetchInvitePreview(
  token: string,
  signal?: AbortSignal
): Promise<MovieListInvitePreview> {
  const preview = await fetchApi<MovieListInvitePreview>(apiPath('lists', 'join', token), {
    signal,
  });
  return { ...preview, posterPaths: preview.posterPaths ?? [] };
}

export async function joinListByLink(token: string): Promise<MovieListSummary> {
  return fetchApi<MovieListSummary>(apiPath('lists', 'join', token), { method: 'POST' });
}

export function listJoinFrontendUrl(token: string): string {
  return `${globalThis.location.origin}${ROUTES.joinList(token)}`;
}
