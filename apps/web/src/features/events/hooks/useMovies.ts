import { useQuery } from '@tanstack/react-query';
import { fetchEventMovies } from '@/features/events/api/eventMoviesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pollIntervalAfterFailures } from '@/shared/api/retryPolicy';
import type { MovieData } from '@/shared/types/movie';

export type UseMoviesOptions = {
  enabled?: boolean;

  refetchInterval?: number | false;

  participantId?: string | null;

  offlineCopy?: { movies: MovieData[]; savedAt: number } | null;
};

export function useMovies(slug: string | undefined, options?: UseMoviesOptions) {
  const enabled = !!slug && (options?.enabled ?? true);
  const participantId = options?.participantId ?? null;

  return useQuery({
    queryKey: [...queryKeys.movies.list(slug), participantId ?? '$anon'] as const,
    queryFn: () => fetchEventMovies(slug!, participantId),
    enabled,
    initialData: options?.offlineCopy?.movies,
    initialDataUpdatedAt: options?.offlineCopy?.savedAt,
    refetchInterval: (query) => pollIntervalAfterFailures(options?.refetchInterval ?? false, query),
  });
}
