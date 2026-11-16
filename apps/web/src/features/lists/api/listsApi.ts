import { apiPath, fetchApi } from '@/shared/api/client';
import type { MovieMediaType } from '@/shared/types/movie';
import type { AddWatchlistItemBody, WatchlistItem } from '@/features/movies/api/watchlistApi';

export type MovieListRole = 'owner' | 'member';

export interface MovieListPerson {
  userId: string;
  handle: string | null;
  displayName: string;
  avatarId: string | null;
}

export interface ListCreator {
  handle: string;
  displayName: string;
  avatarId: string | null;
}

export interface MovieListAudience {
  role?: MovieListRole;
  owner?: MovieListPerson;
  memberCount?: number;
  memberPreview?: MovieListPerson[];
}

export interface MovieListSummary extends MovieListAudience {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  posterPaths: string[];
  createdAt: string;
  updatedAt: string;
  containsMovie: boolean;
  watchedCount?: number;
  isPublic?: boolean;
}

export interface MovieListItem extends WatchlistItem {
  isWatched?: boolean;
  addedBy?: MovieListPerson | null;
}

export interface MovieListDetail extends MovieListAudience {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  items: MovieListItem[];
}

export type MovieListItemBody = AddWatchlistItemBody;

export interface MovieListRef {
  tmdbId: number;
  mediaType: MovieMediaType;
}

export interface CreateListBody {
  name: string;
  description?: string | null;
  isPublic?: boolean;
  firstItem?: MovieListItemBody;
}

export interface UpdateListBody {
  name: string;
  description?: string | null;
  isPublic?: boolean;
}

interface MovieListsResponse {
  items?: MovieListSummary[] | null;
}

export async function fetchMyLists(
  containing?: MovieListRef,
  signal?: AbortSignal
): Promise<MovieListSummary[]> {
  const path = containing
    ? (`/lists?${new URLSearchParams({
        tmdbId: String(containing.tmdbId),
        mediaType: containing.mediaType,
      }).toString()}` as const)
    : '/lists';
  const response = await fetchApi<MovieListsResponse | null>(path, { signal });
  return Array.isArray(response?.items) ? response.items : [];
}

export async function fetchList(id: string, signal?: AbortSignal): Promise<MovieListDetail> {
  const list = await fetchApi<MovieListDetail>(apiPath('lists', id), { signal });
  return { ...list, items: Array.isArray(list.items) ? list.items : [] };
}

export async function createList(body: CreateListBody): Promise<MovieListSummary> {
  return fetchApi<MovieListSummary>('/lists', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateList(id: string, body: UpdateListBody): Promise<MovieListSummary> {
  return fetchApi<MovieListSummary>(apiPath('lists', id), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteList(id: string): Promise<void> {
  await fetchApi(apiPath('lists', id), { method: 'DELETE' });
}

export async function addListItem(id: string, body: MovieListItemBody): Promise<void> {
  await fetchApi(apiPath('lists', id, 'items'), { method: 'POST', body: JSON.stringify(body) });
}

export async function removeListItem(
  id: string,
  tmdbId: number,
  mediaType: MovieMediaType
): Promise<void> {
  const params = new URLSearchParams({ mediaType });
  await fetchApi(`${apiPath('lists', id, 'items', tmdbId)}?${params.toString()}`, {
    method: 'DELETE',
  });
}
