import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getStoredHostToken,
  getStoredParticipant,
  removeStoredParticipant,
  setStoredHostToken,
  setStoredParticipant,
} from '@/shared/utils/eventIdentityStorage';
import type { EventData } from '@/shared/types/event';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useEvent } from '@/features/events/hooks/useEvent';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { useEventLive } from '@/features/events/hooks/useEventLive';

function isParticipantGone(participantId: string, event: EventData | null, slug: string): boolean {
  if (event?.slug !== slug || !event.participants) return false;
  return !event.participants.some((p) => p.id === participantId);
}

export function useEventDetailPage(
  slug: string | undefined,
  initialActionError: string | null = null
) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hostFromUrl = searchParams.get('host');
  const hostFromStorage = slug ? getStoredHostToken(slug) : null;
  const hostToken = hostFromUrl ?? hostFromStorage;
  useEffect(() => {
    if (!slug || !hostFromUrl) return;
    setStoredHostToken(slug, hostFromUrl);
    if (getStoredHostToken(slug) !== hostFromUrl) return;
    const withoutHost = new URLSearchParams(searchParams);
    withoutHost.delete('host');
    navigate(
      { search: `?${withoutHost.toString()}`, hash: location.hash },
      { replace: true, state: location.state }
    );
  }, [slug, hostFromUrl, searchParams, location.hash, location.state, navigate]);

  const eventQuery = useEvent(slug, hostToken);
  const event = eventQuery.data ?? null;

  const moviesQueryEnabled = !!slug;
  const { moviesRefetchInterval } = useEventLive(event ?? undefined, { moviesQueryEnabled });

  const [participant, setParticipant] = useState<{ participantId: string; pseudo: string } | null>(
    () => (slug ? getStoredParticipant(slug) : null)
  );

  const moviesQuery = useMovies(slug, {
    enabled: moviesQueryEnabled,
    refetchInterval: moviesRefetchInterval,
    participantId: participant?.participantId ?? null,
  });
  const movies = moviesQuery.data ?? [];
  const [actionError, setActionError] = useState<string | null>(initialActionError);

  useEffect(() => {
    if (!slug) {
      setParticipant(null);
      return;
    }
    const stored = getStoredParticipant(slug);
    if (stored && !isParticipantGone(stored.participantId, event, slug)) {
      setParticipant(stored);
      return;
    }
    if (stored) removeStoredParticipant(slug);
    if (event?.slug !== slug) {
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
    queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
    queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
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
