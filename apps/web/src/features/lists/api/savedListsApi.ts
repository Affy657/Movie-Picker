import { apiPath, fetchApi } from '@/shared/api/client';
import type { ListCreator, MovieListDetail, MovieListItem } from '@/features/lists/api/listsApi';

export type SavedListSourceType = 'tmdbCollection' | 'explorerTheme' | 'memberList';

type SavedListUnavailableReason = 'private' | 'deleted';

export interface SavedListSource {
  sourceType: SavedListSourceType;
  sourceId: string;
}

export interface SavedListSummary extends SavedListSource {
  id: string;
  name: string | null;
  description?: string | null;
  creator?: ListCreator | null;
  itemCount: number;
  posterPaths: string[];
  watchedCount: number;
  createdAt: string;
  unavailable: boolean;
  unavailableReason?: SavedListUnavailableReason | null;
  copyAvailable?: boolean;
}

export interface SavedListDetail extends SavedListSummary {
  items: MovieListItem[];
}

export interface CopySavedListBody {
  name: string;
}

interface SavedListsResponse {
  items?: SavedListSummary[] | null;
}

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
