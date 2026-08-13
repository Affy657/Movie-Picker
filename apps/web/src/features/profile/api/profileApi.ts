import { fetchApi } from '@/shared/api/client';

export interface PublicProfile {
  handle: string;
  displayName: string;
  avatarId: string;
  bio: string | null;
  memberSince: string;
  followingCount: number;
  followersCount: number;
  isSupporter: boolean;
  isFollowedByMe: boolean | null;
}

export interface HandleAvailability {
  handle: string;
  available: boolean;
  reason: string | null;
}

export interface FollowUserItem {
  handle: string;
  displayName: string;
  avatarId: string;
  isFollowedByMe: boolean | null;
}

export interface FollowListResponse {
  items: FollowUserItem[];
}

export interface GenreCount {
  genreId: number;
  count: number;
}

export interface DailyActivityPoint {
  date: string;
  count: number;
}

export interface UserStats {
  eventsCreated: number;
  eventsJoined: number;
  moviesProposed: number;
  votesCast: number;
  winningProposals: number;
  moviesSeen: number;
  currentStreakWeeks: number;
  bestStreakWeeks: number;
  favoriteGenres: GenreCount[];
  dailyActivity: DailyActivityPoint[];
}

export async function fetchPublicProfile(handle: string): Promise<PublicProfile> {
  return fetchApi<PublicProfile>(`/users/${encodeURIComponent(handle)}`);
}

export async function checkHandleAvailability(handle: string): Promise<HandleAvailability> {
  return fetchApi<HandleAvailability>(
    `/users/handle-available?handle=${encodeURIComponent(handle)}`
  );
}

export async function followUser(handle: string): Promise<void> {
  await fetchApi(`/users/${encodeURIComponent(handle)}/follow`, { method: 'POST' });
}

export async function unfollowUser(handle: string): Promise<void> {
  await fetchApi(`/users/${encodeURIComponent(handle)}/follow`, { method: 'DELETE' });
}

export async function fetchFollowing(handle: string): Promise<FollowListResponse> {
  return fetchApi<FollowListResponse>(`/users/${encodeURIComponent(handle)}/following`);
}

export async function fetchFollowers(handle: string): Promise<FollowListResponse> {
  return fetchApi<FollowListResponse>(`/users/${encodeURIComponent(handle)}/followers`);
}

export async function fetchUserStats(handle: string, signal?: AbortSignal): Promise<UserStats> {
  return fetchApi<UserStats>(`/users/${encodeURIComponent(handle)}/stats`, { signal });
}
