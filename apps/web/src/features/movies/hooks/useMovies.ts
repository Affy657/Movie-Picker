import { useQuery } from '@tanstack/react-query';
import { fetchEventMovies } from '@/features/movies/api/moviesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';

export type UseMoviesOptions = {
  /** Ex. après chargement event réussi */
  enabled?: boolean;
  /** Aligné sur le polling event (soirée active) */
  refetchInterval?: number | false;
  /**
   * ID du participant courant — quand fourni, l'API renvoie `myVote` par film. La clé
   * de cache inclut le participant pour ne pas mélanger les vues anonyme/connectée.
   */
  participantId?: string | null;
};

/**
 * Liste des films d’une soirée. Ne pas activer tant que l’event n’est pas résolu (évite 404 inutiles).
 */
export function useMovies(slug: string | undefined, options?: UseMoviesOptions) {
  const enabled = !!slug && (options?.enabled ?? true);
  const participantId = options?.participantId ?? null;

  return useQuery({
    queryKey: [...queryKeys.movies.list(slug), participantId ?? '$anon'] as const,
    queryFn: () => fetchEventMovies(slug!, participantId),
    enabled,
    refetchInterval: options?.refetchInterval ?? false,
  });
}
