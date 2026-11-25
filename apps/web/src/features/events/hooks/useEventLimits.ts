import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query';
import { fetchEventLimits } from '@/features/events/api/eventsApi';
import type { EventLimitCaps } from '@/features/events/types';
import { queryKeys } from '@/shared/hooks/queryKeys';

const eventLimitsQuery = queryOptions({
  queryKey: queryKeys.eventLimits,
  queryFn: fetchEventLimits,
  staleTime: Infinity,
  gcTime: Infinity,
});

export function useEventLimits(): EventLimitCaps | null {
  return useQuery(eventLimitsQuery).data ?? null;
}

export function loadEventLimits(queryClient: QueryClient): Promise<EventLimitCaps | null> {
  return queryClient.ensureQueryData(eventLimitsQuery).catch(() => null);
}
