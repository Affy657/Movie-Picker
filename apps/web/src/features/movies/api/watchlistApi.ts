import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import type { AddTitleBody, MovieMediaType } from '@/shared/types/movie';

export type WatchlistItem = ApiSchemas['WatchlistItemResponse'];

export type WatchlistResponse = ApiSchemas['WatchlistResponse'];

interface WatchlistPage<T> {
  items?: T[] | null;
  hasMore?: boolean;
}

const WATCHLIST_PAGE_SIZE = 500;

const WATCHLIST_MAX_PAGES = 20;

export async function readAllWatchlistPages<T>(
  fetchPage: (skip: number) => Promise<WatchlistPage<T> | null | undefined>
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; page < WATCHLIST_MAX_PAGES; page++) {
    const response = await fetchPage(items.length);
    const pageItems = Array.isArray(response?.items) ? response.items : [];
    items.push(...pageItems);
    if (response?.hasMore !== true || pageItems.length === 0) break;
  }
  return items;
}

export type WatchlistAvailabilityItem = ApiSchemas['WatchlistAvailabilityItemResponse'];

export type WatchlistAvailabilityResponse = ApiSchemas['WatchlistAvailabilityResponse'];

export type AddWatchlistItemBody = AddTitleBody;

export async function fetchWatchlist(signal?: AbortSignal): Promise<WatchlistItem[]> {
  return readAllWatchlistPages((skip) =>
    fetchApi<WatchlistResponse | null>(
      `/watchlist?skip=${skip}&take=${WATCHLIST_PAGE_SIZE}`,
      signal ? { signal } : undefined
    )
  );
}

export async function fetchWatchlistAvailability(
  signal?: AbortSignal
): Promise<WatchlistAvailabilityResponse> {
  const res = await fetchApi<Partial<WatchlistAvailabilityResponse> | null>(
    '/watchlist/availability',
    signal ? { signal } : undefined
  );
  return { items: Array.isArray(res?.items) ? res.items : [], partial: res?.partial === true };
}

export async function addToWatchlist(body: AddWatchlistItemBody): Promise<void> {
  await fetchApi('/watchlist', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function removeFromWatchlist(
  tmdbId: number,
  mediaType: MovieMediaType = 'movie'
): Promise<void> {
  const params = new URLSearchParams({ mediaType });
  await fetchApi(`${apiPath('watchlist', tmdbId)}?${params.toString()}`, { method: 'DELETE' });
}
