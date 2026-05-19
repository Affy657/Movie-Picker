import type { EventData, MyEventLifecycle } from '@/shared/types/event';
import { parseEventLocalStartMs } from '@/shared/utils/eventScheduleLocal';

export function guestJoinedEventLifecycle(
  ev: Pick<EventData, 'date' | 'time' | 'isFinished' | 'winnerMovie'>,
  nowMs: number = Date.now()
): MyEventLifecycle {
  if (ev.isFinished || ev.winnerMovie) return 'finished';
  const instant = parseEventLocalStartMs(ev.date, ev.time);
  if (instant == null) return 'finished';
  if (nowMs < instant) return 'upcoming';
  return 'live';
}
