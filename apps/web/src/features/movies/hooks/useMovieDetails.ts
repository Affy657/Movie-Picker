import { useQuery } from '@tanstack/react-query';
import { fetchMovieDetails, type MovieDetails } from '@/features/movies/api/moviesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { MovieMediaType } from '@/shared/types/movie';

export function useMovieDetails(
  tmdbId: number | undefined,
  enabled: boolean,
  mediaType?: MovieMediaType
) {
  return useQuery<MovieDetails>({
    queryKey: queryKeys.movies.details(tmdbId, mediaType),
    queryFn: ({ signal }) => fetchMovieDetails(tmdbId!, { signal, mediaType }),
    enabled: enabled && typeof tmdbId === 'number' && tmdbId > 0,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
  });
}
