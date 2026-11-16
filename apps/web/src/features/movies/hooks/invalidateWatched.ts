import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { invalidateAllExcept } from '@/shared/api/invalidateAllExcept';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { invalidateWatchlist } from '@/features/movies/hooks/useWatchlist';

export function invalidateWatchedFilms(
  queryClient: QueryClient,
  excludedKeys: readonly QueryKey[] = []
): Promise<void> {
  return Promise.all(
    [queryKeys.watched.all, queryKeys.me.watchedMoviesAll, queryKeys.profile.watchedMoviesAll].map(
      (queryKey) => invalidateAllExcept(queryClient, queryKey, excludedKeys)
    )
  ).then(() => undefined);
}

export function invalidateWatched(
  queryClient: QueryClient,
  excludedKeys: readonly QueryKey[] = []
): Promise<void> {
  return Promise.all([
    invalidateWatchedFilms(queryClient, excludedKeys),
    queryClient.invalidateQueries({ queryKey: queryKeys.lists.all }),
    invalidateWatchlist(queryClient),
  ]).then(() => undefined);
}
