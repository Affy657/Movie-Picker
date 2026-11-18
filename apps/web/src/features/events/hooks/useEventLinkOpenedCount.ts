import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import type { EventLinkState } from '@/shared/analytics/usageCounts';
import type { EventData } from '@/features/events/types';

interface EventLinkOpenedInput {
  slug: string;
  event: EventData;
  participant: { participantId: string; pseudo: string } | null;
  isFull: boolean;
}

function linkStateOf(event: EventData, isFull: boolean): EventLinkState {
  if (event.isFinished) return 'closed';
  return isFull ? 'full' : 'open';
}

export function useEventLinkOpenedCount({
  slug,
  event,
  participant,
  isFull,
}: EventLinkOpenedInput): void {
  const { track } = useAnalytics();
  const { user, isLoading } = useAuth();
  const newcomer = !event.isHost && !event.myParticipant && !participant;
  const state = linkStateOf(event, isFull);
  const viewer = user ? 'account' : 'visitor';

  useEffect(() => {
    if (isLoading || !newcomer) return;
    track('event_link_opened', { viewer, state }, { oncePerTab: `event_link_opened:${slug}` });
  }, [isLoading, newcomer, viewer, state, slug, track]);
}
