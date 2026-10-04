import { apiPath, fetchApi } from '@/shared/api/client';

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

export async function fetchUserStats(handle: string, signal?: AbortSignal): Promise<UserStats> {
  return fetchApi<UserStats>(apiPath('users', handle, 'stats'), { signal });
}
