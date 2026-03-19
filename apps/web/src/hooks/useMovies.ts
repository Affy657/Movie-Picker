import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import type { MovieData } from '../types/event';
import { queryKeys } from './queryKeys';

export type UseMoviesOptions = {
  /** Ex. après chargement event réussi */
  enabled?: boolean;
  /** Aligné sur le polling event (soirée active) */
  refetchInterval?: number | false;
};

/**
 * Liste des films d’une soirée. Ne pas activer tant que l’event n’est pas résolu (évite 404 inutiles).
 */
export function useMovies(slug: string | undefined, options?: UseMoviesOptions) {
  const enabled = !!slug && (options?.enabled ?? true);

  return useQuery({
    queryKey: queryKeys.movies.list(slug ?? ''),
    queryFn: async () => {
      const list = await fetchApi<MovieData[]>(`/events/${slug}/movies`);
      return Array.isArray(list) ? list : [];
    },
    enabled,
    refetchInterval: options?.refetchInterval ?? false,
  });
}
