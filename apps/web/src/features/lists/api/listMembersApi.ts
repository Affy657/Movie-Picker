import { apiPath, fetchApi } from '@/shared/api/client';
import { ROUTES } from '@/app/routes';
import type {
  MovieListPerson,
  MovieListRole,
  MovieListSummary,
} from '@/features/lists/api/listsApi';

export interface MovieListMember extends MovieListPerson {
  isOwner: boolean;
  joinedAt: string;
}

export interface MovieListPendingInvitation extends MovieListPerson {
  invitedAt: string;
}

export interface MovieListInviteLink {
  token: string;
  expiresAt: string;
  active: boolean;
}

export interface MovieListMembers {
  maxMembers: number;
  members: MovieListMember[];
  invitations: MovieListPendingInvitation[];
  inviteLink: MovieListInviteLink | null;
}

export type MovieListInvitableUser = MovieListPerson;

export interface MovieListInviter {
  handle: string | null;
  displayName: string;
  avatarId: string | null;
}

export interface MovieListInvitePreview {
  name: string;
  owner: MovieListInviter;
  itemCount: number;
  posterPaths: string[];
  isFull: boolean;
  role: MovieListRole | null;
  listId: string | null;
}

interface MovieListMembersResponse {
  maxMembers: number;
  members?: MovieListMember[] | null;
  invitations?: MovieListPendingInvitation[] | null;
  inviteLink?: MovieListInviteLink | null;
}

interface MovieListInvitableUsersResponse {
  users?: MovieListInvitableUser[] | null;
}

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
