import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import type { MovieMediaType } from '@/shared/types/movie';
import type { AddWatchlistItemBody } from '@/features/movies/api/watchlistApi';

export type MovieListPerson = ApiSchemas['MovieListPersonResponse'];

export type ListCreator = ApiSchemas['ListCreatorResponse'];

export type MovieListSummary = ApiSchemas['MovieListSummaryResponse'];

export type MovieListAudience = Partial<
  Pick<MovieListSummary, 'role' | 'owner' | 'memberCount' | 'memberPreview'>
>;

export type MovieListItem = ApiSchemas['MovieListItemResponse'];

export type MovieListDetail = ApiSchemas['MovieListResponse'];

export type MovieListItemBody = AddWatchlistItemBody;

export interface MovieListRef {
  tmdbId: number;
  mediaType: MovieMediaType;
}

export type CreateListBody = ApiSchemas['CreateMovieListRequest'];

export type UpdateListBody = ApiSchemas['UpdateMovieListRequest'];

type MovieListsResponse = ApiSchemas['MovieListsResponse'];

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
