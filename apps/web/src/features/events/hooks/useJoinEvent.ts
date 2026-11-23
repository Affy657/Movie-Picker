import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { joinEvent } from '@/features/events/api/eventsApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { invalidateMyNights } from '@/shared/api/invalidateMyNights';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { setStoredParticipant } from '@/shared/utils/eventIdentityStorage';

export type JoinedParticipant = {
  participantId: string;
  pseudo: string;
  isNew: boolean;
};

export function useJoinEvent(slug: string): () => Promise<JoinedParticipant> {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const pseudoToSend = user?.displayName.trim() || 'Participant';
    const res = await joinEvent(slug, pseudoToSend);
    const { id, pseudo } = res.participant;
    setStoredParticipant(slug, id, pseudo);
    void invalidateMyNights(queryClient);
    void queryClient.invalidateQueries({ queryKey: queryKeys.event.detailForAnyHostToken(slug) });
    track('event_joined');
    return { participantId: id, pseudo, isNew: res.isNew };
  }, [user, slug, track, queryClient]);
}
