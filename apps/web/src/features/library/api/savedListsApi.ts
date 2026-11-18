import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import type { MovieListDetail } from '@/features/library/api/listsApi';

export type SavedListSourceType = ApiSchemas['ListSourceType'];

export type SavedListSummary = ApiSchemas['SavedListSummaryResponse'];

export type SavedListSource = Pick<SavedListSummary, 'sourceType' | 'sourceId'>;

export type SavedListDetail = ApiSchemas['SavedListResponse'];

export type CopySavedListBody = ApiSchemas['CopySavedListRequest'];

type SavedListsResponse = ApiSchemas['SavedListsResponse'];

function itemsOf(response: SavedListsResponse | null): SavedListSummary[] {
  return Array.isArray(response?.items) ? response.items : [];
}

export async function fetchSavedLists(signal?: AbortSignal): Promise<SavedListSummary[]> {
  return itemsOf(await fetchApi<SavedListsResponse | null>('/saved-lists', { signal }));
}

export async function fetchSavedListBySource(
  source: SavedListSource,
  signal?: AbortSignal
): Promise<SavedListSummary | null> {
  const query = new URLSearchParams({ sourceType: source.sourceType, sourceId: source.sourceId });
  const response = await fetchApi<SavedListsResponse | null>(`/saved-lists?${query.toString()}`, {
    signal,
  });
  return itemsOf(response)[0] ?? null;
}

export async function fetchSavedList(id: string, signal?: AbortSignal): Promise<SavedListDetail> {
  const list = await fetchApi<SavedListDetail>(apiPath('saved-lists', id), { signal });
  return { ...list, items: Array.isArray(list.items) ? list.items : [] };
}

export async function saveList(source: SavedListSource): Promise<SavedListSummary> {
  return fetchApi<SavedListSummary>('/saved-lists', {
    method: 'POST',
    body: JSON.stringify(source),
  });
}

export async function unsaveList(id: string): Promise<void> {
  await fetchApi(apiPath('saved-lists', id), { method: 'DELETE' });
}

export async function copySavedList(id: string, name: string): Promise<MovieListDetail> {
  const body: CopySavedListBody = { name };
  return fetchApi<MovieListDetail>(apiPath('saved-lists', id, 'copy'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
