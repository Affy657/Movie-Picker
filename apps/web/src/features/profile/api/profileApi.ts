import { apiPath, fetchApi } from '@/shared/api/client';
import { readAllWatchlistPages } from '@/features/movies/api/watchlistApi';
import type { ApiSchemas } from '@/shared/api/contract';
import type { FavoriteTitle, MovieMediaType } from '@/shared/types/movie';

export type PublicProfile = ApiSchemas['PublicProfileResponse'];

export const FAVORITES_MAX = 3;

export type FavoriteListResponse = ApiSchemas['FavoriteListResponse'];

export type FollowUserItem = ApiSchemas['FollowUserItem'];

export type FollowListResponse = ApiSchemas['FollowListResponse'];

export type ProfileBanner = ApiSchemas['ProfileBannerResponse'];

export type MovieBackdrops = ApiSchemas['MovieBackdropsResponse'];

export async function fetchMovieBackdrops(tmdbId: number): Promise<MovieBackdrops> {
  return fetchApi<MovieBackdrops>(apiPath('movies', 'tmdb', String(tmdbId), 'backdrops'));
}

export async function fetchPublicProfile(handle: string): Promise<PublicProfile> {
  return fetchApi<PublicProfile>(apiPath('users', handle));
}

export async function followUser(handle: string): Promise<void> {
  await fetchApi(apiPath('users', handle, 'follow'), { method: 'POST' });
}

export async function unfollowUser(handle: string): Promise<void> {
  await fetchApi(apiPath('users', handle, 'follow'), { method: 'DELETE' });
}

export async function addFavorite(favorite: FavoriteTitle): Promise<FavoriteListResponse> {
  return fetchApi<FavoriteListResponse>(apiPath('users', 'me', 'favorites'), {
    method: 'POST',
    body: JSON.stringify(favorite),
  });
}

export async function removeFavorite(
  tmdbId: number,
  mediaType: MovieMediaType
): Promise<FavoriteListResponse> {
  const params = new URLSearchParams({ mediaType });
  return fetchApi<FavoriteListResponse>(
    `${apiPath('users', 'me', 'favorites', tmdbId)}?${params.toString()}`,
    { method: 'DELETE' }
  );
}

export async function fetchFollowing(handle: string): Promise<FollowListResponse> {
  return fetchApi<FollowListResponse>(apiPath('users', handle, 'following'));
}

export async function fetchFollowers(handle: string): Promise<FollowListResponse> {
  return fetchApi<FollowListResponse>(apiPath('users', handle, 'followers'));
}

export async function searchUsers(query: string): Promise<FollowListResponse> {
  return fetchApi<FollowListResponse>(
    `${apiPath('users', 'search')}?q=${encodeURIComponent(query)}`
  );
}

export type UserWatchedMovieItem = ApiSchemas['UserWatchedMovieItem'];

export type UserWatchedMoviesResponse = ApiSchemas['UserWatchedMoviesResponse'];

export type CountedUserWatchedMovies = Omit<UserWatchedMoviesResponse, 'total'> & { total: number };

export async function fetchUserWatchedMovies(
  handle: string,
  take: number,
  signal?: AbortSignal
): Promise<UserWatchedMoviesResponse> {
  return fetchApi<UserWatchedMoviesResponse>(
    `/users/${encodeURIComponent(handle)}/watched-movies?take=${take}`,
    { signal }
  );
}

async function fetchCountedUserWatchedMovies(
  handle: string,
  take: number,
  signal?: AbortSignal
): Promise<CountedUserWatchedMovies> {
  const res = await fetchUserWatchedMovies(handle, take, signal);
  return { items: res.items, total: res.total ?? res.items.length };
}

export const WATCHED_MOVIES_TAKE = 1000;

export function fetchUserWatchedMovieCollection(
  handle: string,
  signal?: AbortSignal
): Promise<CountedUserWatchedMovies> {
  return fetchCountedUserWatchedMovies(handle, WATCHED_MOVIES_TAKE, signal);
}

export type UserProposedMovieItem = ApiSchemas['UserProposedMovieItem'];

export type UserProposedMoviesResponse = ApiSchemas['UserProposedMoviesResponse'];

export async function fetchUserProposedMovieItems(
  handle: string,
  winningOnly: boolean,
  signal?: AbortSignal
): Promise<UserProposedMovieItem[]> {
  const res = await fetchApi<UserProposedMoviesResponse>(
    `${apiPath('users', handle, 'proposed-movies')}?winningOnly=${winningOnly}`,
    { signal }
  );
  return res.items;
}

export const PROFILE_WATCHED_PREVIEW_TAKE = 24;

export function fetchUserWatchedMoviesPreview(
  handle: string,
  signal?: AbortSignal
): Promise<CountedUserWatchedMovies> {
  return fetchCountedUserWatchedMovies(handle, PROFILE_WATCHED_PREVIEW_TAKE, signal);
}

export type UserWatchlistItem = ApiSchemas['WatchlistItemResponse'];

type UserWatchlistResponse = ApiSchemas['WatchlistResponse'];

export async function fetchUserWatchlist(
  handle: string,
  pageSize: number,
  signal?: AbortSignal
): Promise<UserWatchlistItem[]> {
  const items = await readAllWatchlistPages((skip) =>
    fetchApi<UserWatchlistResponse>(
      `/users/${encodeURIComponent(handle)}/watchlist?skip=${skip}&take=${pageSize}`,
      { signal }
    )
  );
  return items.map((item) => ({ ...item, genreIds: item.genreIds ?? [] }));
}

export const WATCHLIST_PREVIEW_TAKE = 6;

export async function fetchUserWatchlistPreview(
  handle: string,
  signal?: AbortSignal
): Promise<UserWatchlistItem[]> {
  const page = await fetchApi<UserWatchlistResponse>(
    `/users/${encodeURIComponent(handle)}/watchlist?skip=0&take=${WATCHLIST_PREVIEW_TAKE}`,
    { signal }
  );
  return page.items.map((item) => ({ ...item, genreIds: item.genreIds ?? [] }));
}

export async function fetchFollowingWatchedMovies(
  take: number,
  signal?: AbortSignal
): Promise<UserWatchedMoviesResponse> {
  return fetchApi<UserWatchedMoviesResponse>(
    `${apiPath('users', 'me', 'following-watched-movies')}?take=${take}`,
    { signal }
  );
}
