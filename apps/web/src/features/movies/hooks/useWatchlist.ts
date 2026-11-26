import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  addToWatchlist,
  completeWatchlistAvailability,
  fetchWatchlist,
  fetchWatchlistAvailability,
  removeFromWatchlist,
  type AddWatchlistItemBody,
  type WatchlistAvailability,
} from '@/features/movies/api/watchlistApi';
import type { MovieMediaType } from '@/shared/types/movie';
import type { UserProfile } from '@/features/auth/types';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useAnalytics } from '@/shared/hooks/useAnalytics';

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

const AVAILABILITY_FIRST_RETRY_MS = 2000;

const AVAILABILITY_LONGEST_RETRY_MS = 30_000;

export function availabilityRetryDelay(completionAttempts: number): number {
  return Math.min(
    AVAILABILITY_FIRST_RETRY_MS * 2 ** completionAttempts,
    AVAILABILITY_LONGEST_RETRY_MS
  );
}

export function useWatchlistAvailability(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.watchlist.availability,
    queryFn: ({ client, queryKey, signal }) => {
      const state = client.getQueryState<WatchlistAvailability>(queryKey);
      const incomplete = state?.isInvalidated ? undefined : state?.data;
      return incomplete?.partial
        ? completeWatchlistAvailability(incomplete, signal)
        : fetchWatchlistAvailability(signal);
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 60 * 1000,
    refetchInterval: (query) =>
      query.state.data?.partial
        ? availabilityRetryDelay(query.state.data.completionAttempts)
        : false,
  });
}

export function useAddToWatchlist(options?: { onError?: (error: unknown) => void }) {
  const queryClient = useQueryClient();
  const { track } = useAnalytics();
  return useMutation({
    mutationFn: (body: AddWatchlistItemBody) => addToWatchlist(body),
    onError: options?.onError,
    onSuccess: (_result, body) => {
      track('watchlist_added', { mediaType: body.mediaType ?? 'movie' });
      return invalidateWatchlist(queryClient);
    },
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
