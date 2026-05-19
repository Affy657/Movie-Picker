import { useQuery } from '@tanstack/react-query';
import { fetchEventMovies } from '@/features/movies/api/moviesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';

export type UseMoviesOptions = {
  enabled?: boolean;

  refetchInterval?: number | false;

  participantId?: string | null;
};

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
