import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';

export type GenreCount = ApiSchemas['GenreCount'];

export type DailyActivityPoint = ApiSchemas['DailyActivityPoint'];

export type UserStats = ApiSchemas['UserStatsResponse'];

export async function fetchUserStats(handle: string, signal?: AbortSignal): Promise<UserStats> {
  return fetchApi<UserStats>(apiPath('users', handle, 'stats'), { signal });
}
