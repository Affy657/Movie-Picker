import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  addToWatchlist,
  fetchWatchlist,
  fetchWatchlistAvailability,
  removeFromWatchlist,
  type AddWatchlistItemBody,
} from '@/features/movies/api/watchlistApi';
import type { MovieMediaType } from '@/shared/types/movie';
import type { UserProfile } from '@/features/auth/types';
import { queryKeys } from '@/shared/hooks/queryKeys';

export function invalidateWatchlist(queryClient: QueryClient): Promise<void> {
  const ownHandle = queryClient.getQueryData<UserProfile | null>(queryKeys.auth.me)?.handle;
  const ownProfileKeys = ownHandle
    ? [queryKeys.profile.public(ownHandle), queryKeys.profile.watchlistOf(ownHandle)]
    : [];
  return Promise.all(
    [queryKeys.watchlist.list, queryKeys.watchlist.availability, ...ownProfileKeys].map(
      (queryKey) => queryClient.invalidateQueries({ queryKey })
    )
  ).then(() => undefined);
}

export function useWatchlist(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.watchlist.list,
    queryFn: ({ signal }) => fetchWatchlist(signal),
    enabled: options?.enabled ?? true,
  });
}

export const AVAILABILITY_PARTIAL_REFETCH_MS = 1500;

export function useWatchlistAvailability(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.watchlist.availability,
    queryFn: ({ signal }) => fetchWatchlistAvailability(signal),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 60 * 1000,
    refetchInterval: (query) =>
      query.state.data?.partial ? AVAILABILITY_PARTIAL_REFETCH_MS : false,
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
