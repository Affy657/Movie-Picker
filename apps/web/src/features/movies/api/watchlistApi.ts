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

interface WatchlistAvailabilityPage {
  skip: number;
  items: WatchlistAvailabilityItem[];
  partial: boolean;
}

export interface WatchlistAvailability extends Pick<
  WatchlistAvailabilityResponse,
  'items' | 'partial'
> {
  pages: WatchlistAvailabilityPage[];
  completionAttempts: number;
}

function fetchAvailabilityPage(
  skip: number,
  signal?: AbortSignal
): Promise<Partial<WatchlistAvailabilityResponse> | null> {
  return fetchApi<Partial<WatchlistAvailabilityResponse> | null>(
    `/watchlist/availability?skip=${skip}&take=${WATCHLIST_PAGE_SIZE}`,
    signal ? { signal } : undefined
  );
}

function toPage(
  skip: number,
  response: Partial<WatchlistAvailabilityResponse> | null
): WatchlistAvailabilityPage {
  return {
    skip,
    items: Array.isArray(response?.items) ? response.items : [],
    partial: response?.partial === true,
  };
}

function assemble(
  pages: WatchlistAvailabilityPage[],
  completionAttempts: number
): WatchlistAvailability {
  return {
    items: pages.flatMap((page) => page.items),
    partial: pages.some((page) => page.partial),
    pages,
    completionAttempts,
  };
}

export async function fetchWatchlistAvailability(
  signal?: AbortSignal
): Promise<WatchlistAvailability> {
  const pages: WatchlistAvailabilityPage[] = [];
  await readAllPages(async (skip) => {
    const response = await fetchAvailabilityPage(skip, signal);
    pages.push(toPage(skip, response));
    return response;
  });
  return assemble(pages, 0);
}

export async function completeWatchlistAvailability(
  previous: WatchlistAvailability,
  signal?: AbortSignal
): Promise<WatchlistAvailability> {
  const pages: WatchlistAvailabilityPage[] = [];
  for (const page of previous.pages) {
    pages.push(
      page.partial ? toPage(page.skip, await fetchAvailabilityPage(page.skip, signal)) : page
    );
  }
  return assemble(pages, previous.completionAttempts + 1);
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
