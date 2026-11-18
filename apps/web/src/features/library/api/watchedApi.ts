import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiRequestPath, ApiRoute } from '@/shared/api/apiRoutes';
import type { ApiSchemas } from '@/shared/api/contract';
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

export type WatchedMovies = Omit<WatchedMoviesResponse, 'total'> & { total: number };

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

export async function fetchMyWatchedMovies(
  take = WATCHED_MOVIES_TAKE,
  signal?: AbortSignal
): Promise<WatchedMovies> {
  const response = await fetchApi<WatchedMoviesResponse | null>(
    `${apiPath('users', 'me', 'watched-movies')}?take=${take}`,
    { signal }
  );
  const items = (response?.items ?? []).map((item) => ({ ...item, genreIds: item.genreIds ?? [] }));
  return { items, total: response?.total ?? items.length };
}
