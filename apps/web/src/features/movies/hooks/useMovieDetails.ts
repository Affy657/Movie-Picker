import { useQuery, type QueryClient } from '@tanstack/react-query';
import { fetchMovieDetails, type MovieDetails } from '@/features/movies/api/moviesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { MovieMediaType } from '@/shared/types/movie';

const MOVIE_DETAILS_CACHE_MS = 1000 * 60 * 60;

export function prefetchMovieDetails(
  queryClient: QueryClient,
  tmdbId: number,
  mediaType: MovieMediaType
): Promise<MovieDetails | undefined> {
  const queryKey = queryKeys.movies.details(tmdbId, mediaType);
  return queryClient
    .prefetchQuery<MovieDetails>({
      queryKey,
      queryFn: ({ signal }) => fetchMovieDetails(tmdbId, { signal, mediaType }),
      staleTime: MOVIE_DETAILS_CACHE_MS,
      gcTime: MOVIE_DETAILS_CACHE_MS,
    })
    .then(() => queryClient.getQueryData<MovieDetails>(queryKey));
}

export function useMovieDetails(
  tmdbId: number | undefined,
  enabled: boolean,
  mediaType?: MovieMediaType
) {
  return useQuery<MovieDetails>({
    queryKey: queryKeys.movies.details(tmdbId, mediaType),
    queryFn: ({ signal }) => fetchMovieDetails(tmdbId!, { signal, mediaType }),
    enabled: enabled && typeof tmdbId === 'number' && tmdbId > 0,
    staleTime: MOVIE_DETAILS_CACHE_MS,
    gcTime: MOVIE_DETAILS_CACHE_MS,
  });
}
