import type { MyEventSummary } from '@/features/events/types';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';

function startsAt(event: MyEventSummary): string {
  return `${event.date}T${event.time || '00:00'}`;
}

function soonestOf(events: readonly MyEventSummary[]): MyEventSummary | null {
  return events.reduce<MyEventSummary | null>(
    (best, event) => (best === null || startsAt(event) < startsAt(best) ? event : best),
    null
  );
}

export function pickNextEvent(events: readonly MyEventSummary[]): MyEventSummary | null {
  const lifecycleOf = (event: MyEventSummary) => normalizeMyEventLifecycle(event.lifecycle);
  return (
    soonestOf(events.filter((event) => lifecycleOf(event) === 'live')) ??
    soonestOf(events.filter((event) => lifecycleOf(event) === 'upcoming'))
  );
}
