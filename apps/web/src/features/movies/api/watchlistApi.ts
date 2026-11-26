import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import { READ_ALL_PAGES_MAX, readAllPages } from '@/shared/api/readAllPages';
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
  hasMore: boolean;
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
    hasMore: response?.hasMore === true,
  };
}

function assemble(
  pages: WatchlistAvailabilityPage[],
  completionAttempts: number
): WatchlistAvailability {
  return {
    items: pages.flatMap((page) => page.items),
    partial: pages.some((page) => page.partial) || pages.at(-1)?.hasMore === true,
    pages,
    completionAttempts,
  };
}

async function readAvailabilityPages(
  skip: number,
  signal?: AbortSignal,
  pagesLeft = READ_ALL_PAGES_MAX
): Promise<WatchlistAvailabilityPage[]> {
  const page = toPage(skip, await fetchAvailabilityPage(skip, signal));
  if (!page.hasMore || pagesLeft <= 1) return [page];
  return [
    page,
    ...(await readAvailabilityPages(skip + WATCHLIST_PAGE_SIZE, signal, pagesLeft - 1)),
  ];
}

export async function fetchWatchlistAvailability(
  signal?: AbortSignal
): Promise<WatchlistAvailability> {
  return assemble(await readAvailabilityPages(0, signal), 0);
}

async function refetchPartialPages(
  pages: readonly WatchlistAvailabilityPage[],
  signal?: AbortSignal
): Promise<WatchlistAvailabilityPage[]> {
  const [page, ...rest] = pages;
  if (!page) return [];
  const settled = page.partial
    ? toPage(page.skip, await fetchAvailabilityPage(page.skip, signal))
    : page;
  return [settled, ...(await refetchPartialPages(rest, signal))];
}

function titleKey(item: WatchlistAvailabilityItem): string {
  return `${item.mediaType}:${item.tmdbId}`;
}

function positionsMoved(
  before: readonly WatchlistAvailabilityPage[],
  after: readonly WatchlistAvailabilityPage[]
): boolean {
  const keys = after.flatMap((page) => page.items.map(titleKey));
  const held = new Set(keys);
  return (
    held.size < keys.length ||
    before.some(
      (page, index) =>
        page.hasMore !== after[index]?.hasMore ||
        page.items.some((item) => !held.has(titleKey(item)))
    )
  );
}

export async function completeWatchlistAvailability(
  previous: WatchlistAvailability,
  signal?: AbortSignal
): Promise<WatchlistAvailability> {
  const completionAttempts = previous.completionAttempts + 1;
  const settled = await refetchPartialPages(previous.pages, signal);
  if (positionsMoved(previous.pages, settled)) {
    return assemble(await readAvailabilityPages(0, signal), completionAttempts);
  }
  const last = settled.at(-1);
  const remaining = last?.hasMore
    ? await readAvailabilityPages(last.skip + WATCHLIST_PAGE_SIZE, signal)
    : [];
  return assemble([...settled, ...remaining], completionAttempts);
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
