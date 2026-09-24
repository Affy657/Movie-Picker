import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';

const FOLLOW_GRAPH_QUERY_PREFIXES = [
  queryKeys.profile.publicAll,
  queryKeys.profile.followingAll,
  queryKeys.profile.followersAll,
  queryKeys.profile.userSearches,
  queryKeys.event.eligibleFollowsAll,
] as const;

export function invalidateFollowGraph(queryClient: QueryClient): Promise<void[]> {
  return Promise.all(
    FOLLOW_GRAPH_QUERY_PREFIXES.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  );
}
