import type { MyEventSummary } from '@/features/events/types';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';

export interface UpcomingGroupNights {
  next: MyEventSummary | undefined;
  later: MyEventSummary[];
  onHold: MyEventSummary[];
}

function isOnHold(night: MyEventSummary): boolean {
  return normalizeMyEventLifecycle(night.lifecycle) === 'pending';
}

export function splitUpcomingNights(nights: readonly MyEventSummary[]): UpcomingGroupNights {
  const [next, ...later] = nights.filter((night) => !isOnHold(night));
  return { next, later, onHold: nights.filter(isOnHold) };
}
