import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiRequestPath, ApiRoute } from '@/shared/api/apiRoutes';
import type { ApiSchemas } from '@/shared/api/contract';
import { readAllPages } from '@/shared/api/readAllPages';
import type { MovieMediaType } from '@/shared/types/movie';

export type WatchedSource = ApiSchemas['WatchedSource'];

export type WatchedStatus = ApiSchemas['WatchedStatusResponse'];

export interface WatchedTitleRef {
  tmdbId: number;
  mediaType: MovieMediaType;
}

export type MarkWatchedBody = ApiSchemas['MarkWatchedRequest'] & WatchedTitleRef;

export type WatchedMovie = ApiSchemas['UserWatchedMovieItem'];

type WatchedMoviesResponse = ApiSchemas['UserWatchedMoviesResponse'];

export type WatchedMovies = Pick<WatchedMoviesResponse, 'items'> & { total: number };

export const WATCHED_MOVIES_TAKE = 1000;

export const UNSEEN_STATUS: WatchedStatus = {
  status: 'none',
  watchedAt: null,
  rating: null,
  nightSlug: null,
  nightTitle: null,
};

function withMediaType(path: ApiRoute, ref: WatchedTitleRef): ApiRequestPath {
  return `${path}?${new URLSearchParams({ mediaType: ref.mediaType }).toString()}`;
}

function titlePath(ref: WatchedTitleRef): ApiRequestPath {
  return withMediaType(apiPath('watched', ref.tmdbId), ref);
}

function ratingPath(ref: WatchedTitleRef): ApiRequestPath {
  return withMediaType(apiPath('watched', ref.tmdbId, 'rating'), ref);
}

function toStatus(response: Partial<WatchedStatus> | null | undefined): WatchedStatus {
  return {
    status: response?.status ?? 'none',
    watchedAt: response?.watchedAt ?? null,
    rating: response?.rating ?? null,
    nightSlug: response?.nightSlug ?? null,
    nightTitle: response?.nightTitle ?? null,
  };
}

export async function fetchWatchedStatus(
  ref: WatchedTitleRef,
  signal?: AbortSignal
): Promise<WatchedStatus> {
  return toStatus(await fetchApi<Partial<WatchedStatus>>(titlePath(ref), { signal }));
}

export async function markWatched(body: MarkWatchedBody): Promise<WatchedStatus> {
  return toStatus(
    await fetchApi<Partial<WatchedStatus>>('/watched', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );
}

export async function setWatchedRating(
  ref: WatchedTitleRef,
  value: number | null
): Promise<WatchedStatus> {
  return toStatus(
    await fetchApi<Partial<WatchedStatus>>(ratingPath(ref), {
      method: 'PUT',
      body: JSON.stringify({ value }),
    })
  );
}

export async function unmarkWatched(ref: WatchedTitleRef): Promise<void> {
  await fetchApi(titlePath(ref), { method: 'DELETE' });
}

function fetchWatchedPage(
  skip: number,
  take: number,
  signal?: AbortSignal
): Promise<WatchedMoviesResponse | null> {
  return fetchApi<WatchedMoviesResponse | null>(
    `${apiPath('users', 'me', 'watched-movies')}?skip=${skip}&take=${take}`,
    { signal }
  );
}

function withGenres(items: readonly WatchedMovie[]): WatchedMovie[] {
  return items.map((item) => ({ ...item, genreIds: item.genreIds ?? [] }));
}

export async function fetchMyWatchedMovies(
  take: number,
  signal?: AbortSignal
): Promise<WatchedMovies> {
  const response = await fetchWatchedPage(0, take, signal);
  const items = withGenres(response?.items ?? []);
  return { items, total: response?.total ?? items.length };
}

export async function fetchAllMyWatchedMovies(signal?: AbortSignal): Promise<WatchedMovies> {
  let total = 0;
  const items = await readAllPages(async (skip) => {
    const page = await fetchWatchedPage(skip, WATCHED_MOVIES_TAKE, signal);
    total = page?.total ?? 0;
    return page;
  });
  return { items: withGenres(items), total: Math.max(total, items.length) };
}
