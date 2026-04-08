import { useEffect, useState } from 'react';
import type { EventData } from '../types/event';
import { eventScheduledStartUtcMs } from '../utils/eventScheduled';

/**
 * Avant le créneau date+heure affiché : moins de requêtes (invités peuvent encore arriver, films rares).
 * @see utils/eventScheduled — même interprétation UTC que l’API .NET pour l’état « à venir / en cours ».
 */
export const EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS = 12_000;

/** Pendant la soirée en cours : votes, réactions, films et roue se mettent à jour plus vite. */
export const EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS = 3_500;

/**
 * Alias historique (~5 s). Préférer ACTIVE / UPCOMING pour les nouveaux usages.
 * @deprecated
 */
export const EVENT_LIVE_POLL_INTERVAL_MS = EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;

export type EventLiveStrategy = 'polling';

export type EventLivePhase = 'finished' | 'upcoming' | 'active';

/** Partiel : l’API peut omettre date/heure dans certains mocks ; la logique gère l’absence. */
type EventLikeForSchedule = {
  terminé?: boolean;
  date?: string;
  time?: string;
};

export function getEventLivePhase(
  event: { terminé?: boolean; date?: string; time?: string } | undefined,
  nowMs: number
): EventLivePhase {
  if (!event || event.terminé) return 'finished';
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
  if (!event || event.terminé) return false;
  if (!event.date || !event.time) return EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;
  const start = eventScheduledStartUtcMs({ date: event.date, time: event.time });
  if (start === null) return EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;
  if (nowMs < start) return EVENT_LIVE_POLL_INTERVAL_UPCOMING_MS;
  return EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;
}

/**
 * Polling du détail event (React Query `refetchInterval`).
 * `nowMs` permet de figer l’horloge dans les tests.
 */
export function getLivePollingRefetchIntervalForEventQuery(
  data: EventData | undefined,
  nowMs: number = Date.now()
): number | false {
  return livePollIntervalMs(data, nowMs);
}

/** Polling de la liste films (même rythme que le détail : réactions / votes dans la même payload). */
export function getLivePollingRefetchIntervalForMoviesQuery(
  event: { terminé?: boolean; date?: string; time?: string } | undefined,
  moviesQueryEnabled: boolean,
  nowMs: number = Date.now()
): number | false {
  if (!moviesQueryEnabled || !event || event.terminé) return false;
  return livePollIntervalMs(event, nowMs);
}

export type UseEventLiveOptions = {
  /** `true` quand `useEvent` a réussi (évite des GET films trop tôt). */
  moviesQueryEnabled: boolean;
};

/**
 * Couche « live » : polling aujourd’hui ; pour SSE/WebSocket, brancher ici (`strategy` + transport)
 * sans disperser la logique dans les pages.
 */
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

  const [, bumpLivePhaseForSchedule] = useState(0);
  useEffect(() => {
    if (!event || event.terminé || !event.date || !event.time) return;
    const start = eventScheduledStartUtcMs({ date: event.date, time: event.time });
    if (start === null) return;
    const now = Date.now();
    if (now >= start) return;
    const delay = Math.min(start - now, 2_147_483_647);
    const id = window.setTimeout(() => bumpLivePhaseForSchedule((n) => n + 1), delay);
    return () => clearTimeout(id);
  }, [event?.date, event?.time, event?.terminé]);

  const nowMs = Date.now();
  const livePhase = getEventLivePhase(event, nowMs);
  const moviesRefetchInterval = getLivePollingRefetchIntervalForMoviesQuery(
    event,
    options.moviesQueryEnabled,
    nowMs
  );

  const eventOnlyInterval = getLivePollingRefetchIntervalForEventQuery(event, nowMs);
  const pollIntervalMs =
    typeof moviesRefetchInterval === 'number'
      ? moviesRefetchInterval
      : typeof eventOnlyInterval === 'number'
        ? eventOnlyInterval
        : EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS;

  return {
    strategy,
    livePhase,
    pollIntervalMs,
    moviesRefetchInterval,
  };
}
