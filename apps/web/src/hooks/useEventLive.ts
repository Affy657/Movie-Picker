import type { EventData } from '../types/event';

/**
 * Intervalle de rafraîchissement « temps quasi réel » tant que la soirée est active (roadmap § 30).
 * En V1 : remplacer / compléter par SSE ou WebSocket en changeant la stratégie ici sans toucher toute la page.
 */
export const EVENT_LIVE_POLL_INTERVAL_MS = 5000;

export type EventLiveStrategy = 'polling';

/** Polling du détail event (React Query `refetchInterval`). */
export function getLivePollingRefetchIntervalForEventQuery(
  data: EventData | undefined
): number | false {
  if (!data || data.terminé) return false;
  return EVENT_LIVE_POLL_INTERVAL_MS;
}

/** Polling de la liste films (aligné sur l’état « soirée active »). */
export function getLivePollingRefetchIntervalForMoviesQuery(
  event: { terminé?: boolean } | undefined,
  moviesQueryEnabled: boolean
): number | false {
  if (!moviesQueryEnabled || !event || event.terminé) return false;
  return EVENT_LIVE_POLL_INTERVAL_MS;
}

export type UseEventLiveOptions = {
  /** `true` quand `useEvent` a réussi (évite des GET films trop tôt). */
  moviesQueryEnabled: boolean;
};

/**
 * Couche « live » : aujourd’hui polling partagé ; demain brancher `strategy` + transport (SSE, etc.).
 */
export function useEventLive(
  event: EventData | undefined,
  options: UseEventLiveOptions
): {
  strategy: EventLiveStrategy;
  pollIntervalMs: number;
  moviesRefetchInterval: number | false;
} {
  const strategy: EventLiveStrategy = 'polling';
  return {
    strategy,
    pollIntervalMs: EVENT_LIVE_POLL_INTERVAL_MS,
    moviesRefetchInterval: getLivePollingRefetchIntervalForMoviesQuery(
      event,
      options.moviesQueryEnabled
    ),
  };
}
