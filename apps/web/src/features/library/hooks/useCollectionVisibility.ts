import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useOptimisticProfilePatch } from '@/features/auth/hooks/useOptimisticProfilePatch';

type CollectionVisibilityField = 'isWatchlistPublic' | 'isWatchedPublic';

function refreshPublicCollections(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    [
      queryKeys.profile.statsAll,
      queryKeys.profile.watchedMoviesAll,
      queryKeys.profile.watchlistAll,
    ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  ).then(() => undefined);
}

export function useCollectionVisibility(field: CollectionVisibilityField) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { error, apply } = useOptimisticProfilePatch('lists.visibility.error');
  const isPublic = user?.[field] ?? true;

  const change = (next: boolean) => {
    if (!user) return;
    apply({ [field]: next }, () => refreshPublicCollections(queryClient));
  };

  return { ready: !!user, isPublic, error, change };
}
