import { useQuery } from '@tanstack/react-query';
import { fetchEventBySlug } from '@/features/events/api/eventsApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getLivePollingRefetchIntervalForEventQuery } from '@/features/events/hooks/useEventLive';

export function useEvent(slug: string | undefined, hostToken: string | null) {
  return useQuery({
    queryKey: queryKeys.event.detail(slug, hostToken),
    queryFn: () => fetchEventBySlug(slug!, hostToken),
    enabled: !!slug,
    refetchInterval: (query) => getLivePollingRefetchIntervalForEventQuery(query.state.data),
  });
}
