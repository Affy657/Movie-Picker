import { useQuery } from '@tanstack/react-query';
import { fetchMovieDetails, type MovieDetails } from '@/features/movies/api/moviesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';

/**
 * Détails TMDB enrichis (synopsis, réalisateur, casting).
 * Activé uniquement à la demande (ex. ouverture de la section « plus d'infos »).
 * Cache long côté serveur (TTL TMDB) ; côté client on garde les données en mémoire tant que
 * la vue est montée.
 */
export function useMovieDetails(tmdbId: number | undefined, enabled: boolean) {
  return useQuery<MovieDetails>({
    queryKey: queryKeys.movies.details(tmdbId),
    queryFn: ({ signal }) => fetchMovieDetails(tmdbId!, { signal }),
    enabled: enabled && typeof tmdbId === 'number' && tmdbId > 0,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
  });
}
