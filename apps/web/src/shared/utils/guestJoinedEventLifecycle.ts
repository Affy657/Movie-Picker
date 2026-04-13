import type { EventData, MyEventLifecycle } from '@/shared/types/event';
import { parseEventLocalStartMs } from '@/shared/utils/eventScheduleLocal';

/**
 * Cycle de vie pour la liste « mes soirées » côté invité (détail public par slug).
 * Même logique métier que l’API : terminée si clôture / roue ; sinon avant/après l’horaire affiché,
 * interprété en **heure locale** comme le tri de la liste (`eventDateTimeMs`).
 */
export function guestJoinedEventLifecycle(
  ev: Pick<EventData, 'date' | 'time' | 'isFinished' | 'winnerMovie'>,
  nowMs: number = Date.now()
): MyEventLifecycle {
  if (ev.isFinished || ev.winnerMovie) return 'finished';
  const instant = parseEventLocalStartMs(ev.date, ev.time);
  // Date/heure invalides : traiter comme terminé pour ne pas bloquer la liste invité.
  if (instant == null) return 'finished';
  if (nowMs < instant) return 'upcoming';
  return 'live';
}
