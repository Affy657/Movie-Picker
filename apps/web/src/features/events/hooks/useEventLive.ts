import { useEffect, useState } from 'react';
import type { EventData } from '@/features/events/types';
import { eventScheduledStartUtcMs } from '@/shared/utils/eventScheduled';

export const EVENT_LIVE_POLL_INTERVAL_MS = 15_000;

export type EventLiveStrategy = 'polling';

export type EventLivePhase = 'finished' | 'upcoming' | 'active' | 'pending';

export function getEventLivePhase(
  event: { isFinished?: boolean; lifecycle?: string; date?: string; time?: string } | undefined,
  nowMs: number
): EventLivePhase {
  if (!event || event.isFinished) return 'finished';
  if (event.lifecycle === 'pending') return 'pending';
  if (!event.date || !event.time) return 'active';
  const start = eventScheduledStartUtcMs({ date: event.date, time: event.time });
  if (start === null) return 'active';
  if (nowMs < start) return 'upcoming';
  return 'active';
}

function livePollIntervalMs(event: { isFinished?: boolean } | undefined): number | false {
  if (!event || event.isFinished) return false;
  return EVENT_LIVE_POLL_INTERVAL_MS;
}

export function getLivePollingRefetchIntervalForEventQuery(
  data: EventData | undefined
): number | false {
  return livePollIntervalMs(data);
}

export function getLivePollingRefetchIntervalForMoviesQuery(
  event: { isFinished?: boolean } | undefined,
  moviesQueryEnabled: boolean
): number | false {
  if (!moviesQueryEnabled) return false;
  return livePollIntervalMs(event);
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
    options.moviesQueryEnabled
  );
  const pollIntervalMs = EVENT_LIVE_POLL_INTERVAL_MS;

  return {
    strategy,
    livePhase,
    pollIntervalMs,
    moviesRefetchInterval,
  };
}
