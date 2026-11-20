import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';

export function invalidateMyNights(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list }),
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
  ]).then(() => undefined);
}
