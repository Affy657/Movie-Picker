import { apiPath, fetchApi } from '@/shared/api/client';
import type { MovieMediaType, WatchProviderOffer } from '@/shared/types/movie';

export interface WatchlistItem {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  genreIds?: number[];
  createdAt: string;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
  total?: number;
  hasMore?: boolean;
}

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

export interface WatchlistAvailabilityItem {
  tmdbId: number;
  mediaType: MovieMediaType;
  watchProviders: WatchProviderOffer[];
  tmdbWatchPageUrl: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
}

export interface WatchlistAvailabilityResponse {
  items: WatchlistAvailabilityItem[];
  partial: boolean;
}

export interface AddWatchlistItemBody {
  tmdbId: number;
  mediaType?: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
}

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
