import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  addToWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
  type AddWatchlistItemBody,
} from '@/features/watchlist/api/watchlistApi';
import type { MovieMediaType } from '@/shared/types/movie';
import { queryKeys } from '@/shared/hooks/queryKeys';

export function invalidateWatchlist(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.list }),
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.publicAll }),
  ]).then(() => undefined);
}

export function useWatchlist(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.watchlist.list,
    queryFn: ({ signal }) => fetchWatchlist(signal),
    enabled: options?.enabled ?? true,
  });
}

export function useAddToWatchlist(options?: { onError?: (error: unknown) => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddWatchlistItemBody) => addToWatchlist(body),
    onError: options?.onError,
    onSuccess: () => invalidateWatchlist(queryClient),
  });
}

export function useRemoveFromWatchlist(options?: { onError?: (error: unknown) => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { tmdbId: number; mediaType?: MovieMediaType }) =>
      removeFromWatchlist(vars.tmdbId, vars.mediaType ?? 'movie'),
    onError: options?.onError,
    onSuccess: () => invalidateWatchlist(queryClient),
  });
}
