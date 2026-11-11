import { useInfiniteQuery } from '@tanstack/react-query';
import {
  activeEventsQueryOptions,
  flattenEvents,
} from '@/features/events/pages/my-events/useMyEventsLists';
import { pickNextEvent } from './nextEvent';

export function useNextEvent(enabled: boolean) {
  const query = useInfiniteQuery(activeEventsQueryOptions(enabled));
  const events = enabled ? flattenEvents(query.data?.pages) : [];
  return { event: pickNextEvent(events), isPending: enabled && query.isPending };
}
