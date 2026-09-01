import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMyEventsList } from '@/features/events/api/eventsApi';

export function useEligibleEventsForPropose(enabled: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'mine', 'propose-target-list'],
    queryFn: () => fetchMyEventsList('active', 0),
    enabled,
  });

  const eligible = useMemo(() => (data?.events ?? []).filter((e) => e.isParticipant), [data]);

  return { eligible, hasMore: data?.hasMore ?? false, isLoading };
}
