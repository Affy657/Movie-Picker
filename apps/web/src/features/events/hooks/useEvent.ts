import { useQuery } from '@tanstack/react-query';
import { fetchEventBySlug } from '@/features/events/api/eventsApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getLivePollingRefetchIntervalForEventQuery } from '@/features/events/hooks/useEventLive';
import { pollIntervalAfterFailures } from '@/shared/api/retryPolicy';
import type { EventData } from '@/features/events/types';

export type UseEventOptions = {
  live?: boolean;
  offlineCopy?: { event: EventData; savedAt: number } | null;
};

export function useEvent(
  slug: string | undefined,
  { live = true, offlineCopy = null }: UseEventOptions = {}
) {
  return useQuery({
    queryKey: queryKeys.event.detail(slug),
    queryFn: () => fetchEventBySlug(slug!),
    enabled: !!slug,
    initialData: offlineCopy?.event,
    initialDataUpdatedAt: offlineCopy?.savedAt,
    refetchInterval: live
      ? (query) =>
          pollIntervalAfterFailures(
            getLivePollingRefetchIntervalForEventQuery(query.state.data),
            query
          )
      : false,
  });
}
