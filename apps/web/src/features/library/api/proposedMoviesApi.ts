import { apiPath, fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';

export type ProposedMovie = ApiSchemas['UserProposedMovieItem'];

type ProposedMoviesResponse = ApiSchemas['UserProposedMoviesResponse'];

export async function fetchMyProposedMovies(
  winningOnly: boolean,
  signal?: AbortSignal
): Promise<ProposedMovie[]> {
  const res = await fetchApi<ProposedMoviesResponse>(
    `${apiPath('users', 'me', 'proposed-movies')}?winningOnly=${winningOnly}`,
    { signal }
  );
  return res.items;
}
