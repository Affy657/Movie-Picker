import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyEventsList } from '@/features/events/api/eventsApi';
import type { MyEventsListResponse, MyEventSummary } from '@/features/events/types';
import { ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import type { MyEventsTab } from './MyEventsTabs';

function isPendingEvent(ev: MyEventSummary): boolean {
  return normalizeMyEventLifecycle(ev.lifecycle) === 'pending';
}

function flattenEvents(pages: MyEventsListResponse[] | undefined): MyEventSummary[] {
  return pages?.flatMap((p) => p.events) ?? [];
}

function nextPageOffset(
  lastPage: MyEventsListResponse,
  allPages: MyEventsListResponse[]
): number | undefined {
  if (!lastPage?.hasMore) return undefined;
  return allPages.reduce((sum, p) => sum + p.events.length, 0);
}

interface MyEventsListsOptions {
  enabled: boolean;
  tab: MyEventsTab;
  historySearchQuery: string;
}

export function useMyEventsLists({ enabled, tab, historySearchQuery }: MyEventsListsOptions) {
  const queryClient = useQueryClient();

  const activeQuery = useInfiniteQuery({
    queryKey: queryKeys.myEvents.active,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchMyEventsList('active', pageParam),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
    enabled,
    retry: false,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: queryKeys.myEvents.finished(historySearchQuery),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchMyEventsList('finished', pageParam, historySearchQuery || undefined),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
    enabled: enabled && tab === 'history',
    retry: false,
  });

  const sessionExpired =
    enabled &&
    activeQuery.isError &&
    ApiError.is(activeQuery.error) &&
    activeQuery.error.code === 401;
  useEffect(() => {
    if (!sessionExpired) return;
    queryClient.setQueryData(queryKeys.auth.me, null);
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [sessionExpired, queryClient]);

  const activeEvents = useMemo(() => flattenEvents(activeQuery.data?.pages), [activeQuery.data]);
  const historyEvents = useMemo(() => flattenEvents(historyQuery.data?.pages), [historyQuery.data]);
  const pendingEvents = useMemo(() => activeEvents.filter(isPendingEvent), [activeEvents]);
  const upcomingEvents = useMemo(
    () => activeEvents.filter((e) => !isPendingEvent(e)),
    [activeEvents]
  );

  const firstPage = activeQuery.data?.pages[0] ?? historyQuery.data?.pages[0];

  return {
    activeQuery,
    historyQuery,
    activeEvents,
    historyEvents,
    pendingEvents,
    upcomingEvents,
    totalActive: firstPage?.totalActive ?? 0,
    totalFinished: firstPage?.totalFinished ?? 0,
  };
}
