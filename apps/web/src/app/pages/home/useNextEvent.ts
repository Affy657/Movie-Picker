import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMyEventsList } from '@/features/events/api/eventsApi';
import { nextPageOffset } from '@/features/events/pages/my-events/useMyEventsLists';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pickNextEvent } from './nextEvent';

export function useNextEvent(enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.myEvents.active,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchMyEventsList('active', pageParam),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
    enabled,
    retry: false,
  });
  const events = enabled ? (query.data?.pages.flatMap((page) => page.events) ?? []) : [];
  return { event: pickNextEvent(events), isPending: enabled && query.isPending };
}
