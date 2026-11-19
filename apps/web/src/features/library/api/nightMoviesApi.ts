import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';

export type NightMovie = ApiSchemas['MyNightMovieItem'];

export type NightMovieProposer = ApiSchemas['NightMovieProposerResponse'];

type NightMoviesResponse = ApiSchemas['MyNightMoviesResponse'];

export async function fetchMyNightMovies(signal?: AbortSignal): Promise<NightMovie[]> {
  const response = await fetchApi<NightMoviesResponse | null>(
    apiPath('users', 'me', 'night-movies'),
    { signal }
  );
  return response?.items ?? [];
}
