import { apiPath, fetchApi } from '@/shared/api/client';
import type {
  ListCreator,
  MovieListDetail,
  MovieListItem,
  MovieListRole,
} from '@/features/lists/api/listsApi';
import type { CopySavedListBody } from '@/features/lists/api/savedListsApi';

export interface PublicListRef {
  handle: string;
  listId: string;
}

export interface PublicListSummary {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  posterPaths: string[];
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  watchedCount: number | null;
}

export interface PublicListDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  memberCount: number;
  watchedCount: number | null;
  creator: ListCreator;
  viewerRole: MovieListRole | null;
  items: MovieListItem[];
}

interface PublicListsResponse {
  items?: PublicListSummary[] | null;
}

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
