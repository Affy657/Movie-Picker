import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import { readAllPages } from '@/shared/api/readAllPages';
import type { AddTitleBody, MovieMediaType } from '@/shared/types/movie';

export type WatchlistItem = ApiSchemas['WatchlistItemResponse'];

export type WatchlistResponse = ApiSchemas['WatchlistResponse'];

const WATCHLIST_PAGE_SIZE = 500;

export type WatchlistAvailabilityItem = ApiSchemas['WatchlistAvailabilityItemResponse'];

export type WatchlistAvailabilityResponse = ApiSchemas['WatchlistAvailabilityResponse'];

export type AddWatchlistItemBody = AddTitleBody;

export async function fetchWatchlist(signal?: AbortSignal): Promise<WatchlistItem[]> {
  return readAllPages((skip) =>
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
