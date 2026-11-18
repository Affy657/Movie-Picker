import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import type { MovieListDetail } from '@/features/library/api/listsApi';
import type { CopySavedListBody } from '@/features/library/api/savedListsApi';

export interface PublicListRef {
  handle: string;
  listId: string;
}

export type PublicListSummary = ApiSchemas['PublicListSummaryResponse'];

export type PublicListDetail = ApiSchemas['PublicListResponse'];

type PublicListsResponse = ApiSchemas['PublicListsResponse'];

export async function fetchPublicLists(
  handle: string,
  signal?: AbortSignal
): Promise<PublicListSummary[]> {
  const response = await fetchApi<PublicListsResponse | null>(apiPath('users', handle, 'lists'), {
    signal,
  });
  return Array.isArray(response?.items) ? response.items : [];
}

export async function fetchPublicList(
  handle: string,
  listId: string,
  signal?: AbortSignal
): Promise<PublicListDetail> {
  const list = await fetchApi<PublicListDetail>(apiPath('users', handle, 'lists', listId), {
    signal,
  });
  return { ...list, items: Array.isArray(list.items) ? list.items : [] };
}

export async function copyPublicList(ref: PublicListRef, name: string): Promise<MovieListDetail> {
  const body: CopySavedListBody = { name };
  return fetchApi<MovieListDetail>(apiPath('users', ref.handle, 'lists', ref.listId, 'copy'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
