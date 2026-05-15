import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getStoredHostToken,
  getStoredParticipant,
  setStoredHostToken,
  setStoredParticipant,
} from '@/features/events/storage';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useEvent } from '@/features/events/hooks/useEvent';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { useEventLive } from '@/features/events/hooks/useEventLive';

/**
 * État partagé de la page détail soirée : host token URL/storage, event, films, participant stocké, refresh.
 */
export function useEventDetailPage(slug: string | undefined) {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const hostFromUrl = searchParams.get('host');
  const hostFromStorage = slug ? getStoredHostToken(slug) : null;
  const hostToken = hostFromUrl ?? hostFromStorage;
  useEffect(() => {
    if (slug && hostFromUrl) setStoredHostToken(slug, hostFromUrl);
  }, [slug, hostFromUrl]);

  const eventQuery = useEvent(slug, hostToken);
  const event = eventQuery.data ?? null;

  const moviesQueryEnabled = !!slug && eventQuery.isSuccess;
  const { moviesRefetchInterval } = useEventLive(event ?? undefined, { moviesQueryEnabled });

  const [participant, setParticipant] = useState<{ participantId: string; pseudo: string } | null>(
    null
  );

  const moviesQuery = useMovies(slug, {
    enabled: moviesQueryEnabled,
    refetchInterval: moviesRefetchInterval,
    participantId: participant?.participantId ?? null,
  });
  const movies = moviesQuery.data ?? [];
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setParticipant(null);
      return;
    }
    const stored = getStoredParticipant(slug);
    if (stored) {
      setParticipant(stored);
      return;
    }
    if (!event || event.slug !== slug) {
      setParticipant(null);
      return;
    }
    const mine = event.myParticipant;
    if (mine?.id && mine.pseudo) {
      const p = { participantId: mine.id, pseudo: mine.pseudo };
      setStoredParticipant(slug, p.participantId, p.pseudo);
      setParticipant(p);
      return;
    }
    setParticipant(null);
  }, [slug, event]);

  const refreshAll = useCallback(() => {
    if (!slug) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
  }, [slug, hostToken, queryClient]);

  return {
    slug,
    hostToken,
    eventQuery,
    event,
    moviesQuery,
    movies,
    participant,
    setParticipant,
    actionError,
    setActionError,
    refreshAll,
  };
}
