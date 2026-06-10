import { useEffect, useState } from 'react';
import type { EventData } from '@/features/events/types';
import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';

export const EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS = 12_000;

export const EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS = 3_500;

export type EventLiveStrategy = 'polling';

export type EventLivePhase = 'finished' | 'upcoming' | 'active';

type EventLikeForSchedule = {
  isFinished?: boolean;
  date?: string;
  time?: string;
};

export function getEventLivePhase(
  event: { isFinished?: boolean; date?: string; time?: string } | undefined,
  nowMs: number
): EventLivePhase {
  if (!event || event.isFinished) return 'finished';
  if (!event.date || !event.time) return 'active';
  const start = eventScheduledStartUtcMs({ date: event.date, time: event.time });
  if (start === null) return 'active';
  if (nowMs < start) return 'upcoming';
  return 'active';
}

function livePollIntervalMs(
  event: EventLikeForSchedule | undefined,
  nowMs: number
): number | false {
  if (!event || event.isFinished) return false;
  if (!event.date || !event.time) return EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;
  const start = eventScheduledStartUtcMs({ date: event.date, time: event.time });
  if (start === null) return EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;
  if (nowMs < start) return EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS;
  return EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;
}

export function getLivePollingRefetchIntervalForEventQuery(
  data: EventData | undefined,
  nowMs: number = Date.now()
): number | false {
  return livePollIntervalMs(data, nowMs);
}

export function getLivePollingRefetchIntervalForMoviesQuery(
  event: { isFinished?: boolean; date?: string; time?: string } | undefined,
  moviesQueryEnabled: boolean,
  nowMs: number = Date.now()
): number | false {
  if (!moviesQueryEnabled || !event || event.isFinished) return false;
  return livePollIntervalMs(event, nowMs);
}

export type UseEventLiveOptions = {
  moviesQueryEnabled: boolean;
};

export function useEventLive(
  event: EventData | undefined,
  options: UseEventLiveOptions
): {
  strategy: EventLiveStrategy;

  livePhase: EventLivePhase;

  pollIntervalMs: number;
  moviesRefetchInterval: number | false;
} {
  const strategy: EventLiveStrategy = 'polling';

  const [nowMs, setNowMs] = useState(() => Date.now());
  const eventDate = event?.date;
  const eventTime = event?.time;
  const eventIsFinished = event?.isFinished;
  useEffect(() => {
    if (!eventDate || !eventTime || eventIsFinished) return;
    const start = eventScheduledStartUtcMs({ date: eventDate, time: eventTime });
    if (start === null) return;
    const now = Date.now();
    if (now >= start) return;
    const delay = Math.min(start - now, 2_147_483_647);
    const id = globalThis.setTimeout(() => setNowMs(Date.now()), delay);
    return () => clearTimeout(id);
  }, [eventDate, eventTime, eventIsFinished]);

  const livePhase = getEventLivePhase(event, nowMs);
  const moviesRefetchInterval = getLivePollingRefetchIntervalForMoviesQuery(
    event,
    options.moviesQueryEnabled,
    nowMs
  );

  const eventOnlyInterval = getLivePollingRefetchIntervalForEventQuery(event, nowMs);
  let pollIntervalMs: number;
  if (typeof moviesRefetchInterval === 'number') {
    pollIntervalMs = moviesRefetchInterval;
  } else if (typeof eventOnlyInterval === 'number') {
    pollIntervalMs = eventOnlyInterval;
  } else {
    pollIntervalMs = EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;
  }

  return {
    strategy,
    livePhase,
    pollIntervalMs,
    moviesRefetchInterval,
  };
}
