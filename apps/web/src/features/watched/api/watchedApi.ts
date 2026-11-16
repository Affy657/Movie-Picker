import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiRequestPath, ApiRoute } from '@/shared/api/apiRoutes';
import type { MovieMediaType } from '@/shared/types/movie';

export type WatchedStatusKind = 'none' | 'night' | 'elsewhere';

export type WatchedSource = 'night' | 'elsewhere';

export interface WatchedStatus {
  status: WatchedStatusKind;
  watchedAt: string | null;
  rating: number | null;
  nightSlug: string | null;
  nightTitle: string | null;
}

export interface WatchedTitleRef {
  tmdbId: number;
  mediaType: MovieMediaType;
}

export interface MarkWatchedBody extends WatchedTitleRef {
  title: string;
  year: string;
  posterPath?: string | null;
  genreIds?: number[];
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  rating?: number | null;
}

export interface WatchedMovie {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  genreIds: number[];
  watchedAt: string;
  myRating?: number | null;
  source: WatchedSource;
}

export interface WatchedMovies {
  items: WatchedMovie[];
  total: number;
}

interface WatchedMoviesResponse {
  items?: (Omit<WatchedMovie, 'genreIds'> & { genreIds?: number[] | null })[] | null;
  total?: number | null;
}

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

export async function fetchMyWatchedMovies(signal?: AbortSignal): Promise<WatchedMovies> {
  const response = await fetchApi<WatchedMoviesResponse | null>(
    `${apiPath('users', 'me', 'watched-movies')}?take=${WATCHED_MOVIES_TAKE}`,
    { signal }
  );
  const items = (response?.items ?? []).map((item) => ({ ...item, genreIds: item.genreIds ?? [] }));
  return { items, total: response?.total ?? items.length };
}
