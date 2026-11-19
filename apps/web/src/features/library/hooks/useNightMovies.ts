import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { fetchMyNightMovies } from '@/features/library/api/nightMoviesApi';

export function useNightMovies(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.myEvents.nightMovies,
    queryFn: ({ signal }) => fetchMyNightMovies(signal),
    staleTime: 1000 * 30,
    enabled: options?.enabled ?? true,
  });
}
