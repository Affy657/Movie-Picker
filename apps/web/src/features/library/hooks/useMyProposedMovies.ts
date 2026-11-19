import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { fetchMyProposedMovies } from '@/features/library/api/proposedMoviesApi';

export function useMyProposedMovies(winningOnly: boolean, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.me.proposedMovies(winningOnly),
    queryFn: ({ signal }) => fetchMyProposedMovies(winningOnly, signal),
    staleTime: 0,
    enabled: options?.enabled ?? true,
  });
}
