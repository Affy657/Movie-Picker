import { useQuery } from '@tanstack/react-query';
import { fetchMovieNights } from '@/features/movies/api/moviesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { MovieMediaType } from '@/shared/types/movie';

export function useMovieNights(tmdbId: number, mediaType: MovieMediaType, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.movies.nights(tmdbId, mediaType),
    queryFn: ({ signal }) => fetchMovieNights(tmdbId, { signal, mediaType }),
    enabled: enabled && tmdbId > 0,
    staleTime: 1000 * 60,
  });
}
