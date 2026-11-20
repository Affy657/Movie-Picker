import { useQuery } from '@tanstack/react-query';
import { fetchMyGroups } from '@/features/events/api/myGroupsApi';
import { queryKeys } from '@/shared/hooks/queryKeys';

export function useMyGroups(enabled = true) {
  return useQuery({
    queryKey: queryKeys.groups.mine,
    queryFn: ({ signal }) => fetchMyGroups(signal),
    enabled,
  });
}
