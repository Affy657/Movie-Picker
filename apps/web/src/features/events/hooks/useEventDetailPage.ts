import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import {
  getStoredHostToken,
  getStoredParticipant,
  removeStoredParticipant,
  setStoredHostToken,
  setStoredParticipant,
} from '@/shared/utils/eventIdentityStorage';
import type { EventData } from '@/shared/types/event';
import { invalidateMyNights } from '@/shared/api/invalidateMyNights';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useEvent } from '@/features/events/hooks/useEvent';
import { useMovies } from '@/features/events/hooks/useMovies';
import { invalidateWatched } from '@/features/movies/hooks/invalidateWatched';
import { useEventLive } from '@/features/events/hooks/useEventLive';
import { useEventLiveStream } from '@/features/events/hooks/useEventLiveStream';
import {
  forgetLastEventSnapshot,
  readLastEventSnapshot,
  saveLastEventSnapshot,
} from '@/shared/utils/offlineEventStorage';
import { ApiError } from '@/shared/api/apiError';
import { applyQueuedVotes, useQueuedVotes } from '@/features/events/offline/queuedVotes';
import { useOfflineVoteReplay } from '@/features/events/offline/useOfflineVoteReplay';

const MOVIE_NIGHTS_KEY = [...queryKeys.movies.all, 'nights'] as const;

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
    void navigate(
      { search: `?${withoutHost.toString()}`, hash: location.hash },
      { replace: true, state: location.state }
    );
  }, [slug, hostFromUrl, searchParams, location.hash, location.state, navigate]);

  const [unreachableSlug, setUnreachableSlug] = useState<string | null>(null);
  const offlineCopy = useMemo(
    () =>
      slug && (unreachableSlug === slug || !onlineManager.isOnline())
        ? readLastEventSnapshot(slug)
        : null,
    [slug, unreachableSlug]
  );
  const [liveConnected, setLiveConnected] = useState(false);
  const eventQuery = useEvent(slug, hostToken, { live: !liveConnected, offlineCopy });
  const event = eventQuery.data ?? null;
  const eventUnreachable =
    eventQuery.data === undefined && ApiError.is(eventQuery.error) && eventQuery.error.code === 0;
  useEffect(() => {
    if (slug && eventUnreachable) setUnreachableSlug(slug);
  }, [slug, eventUnreachable]);
  const showingOfflineCopy =
    offlineCopy !== null &&
    eventQuery.data !== undefined &&
    eventQuery.dataUpdatedAt === offlineCopy.savedAt;

  const moviesQueryEnabled = !!slug && event !== null;
  const { moviesRefetchInterval } = useEventLive(event ?? undefined, { moviesQueryEnabled });

  const [participant, setParticipant] = useState<{ participantId: string; pseudo: string } | null>(
    () => (slug ? getStoredParticipant(slug) : null)
  );

  const moviesQuery = useMovies(slug, {
    enabled: moviesQueryEnabled,
    refetchInterval: liveConnected ? false : moviesRefetchInterval,
    participantId: participant?.participantId ?? null,
    offlineCopy,
  });
  const queuedVotes = useQueuedVotes(slug);
  const serverMovies = moviesQuery.data;
  const participantId = participant?.participantId ?? null;
  const movies = useMemo(
    () => applyQueuedVotes(serverMovies ?? [], queuedVotes, participantId),
    [serverMovies, queuedVotes, participantId]
  );

  const refreshLive = useCallback(() => {
    if (!slug) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
  }, [slug, hostToken, queryClient]);
  const live = useEventLiveStream({
    slug,
    enabled: !!event && !event.isFinished,
    participantId,
    onChanged: refreshLive,
  });
  useEffect(() => {
    setLiveConnected(live.connected);
  }, [live.connected]);

  const copySavedAt = offlineCopy?.savedAt;
  const freshEvent =
    eventQuery.isFetchedAfterMount && eventQuery.dataUpdatedAt !== copySavedAt
      ? eventQuery.data
      : undefined;
  const freshMovies =
    moviesQuery.isFetchedAfterMount && moviesQuery.dataUpdatedAt !== copySavedAt
      ? moviesQuery.data
      : undefined;
  useEffect(() => {
    if (!slug || !freshEvent || !freshMovies || freshEvent.slug !== slug) return;
    saveLastEventSnapshot({ slug, savedAt: Date.now(), event: freshEvent, movies: freshMovies });
  }, [slug, freshEvent, freshMovies]);

  const eventGone = ApiError.is(eventQuery.error) && eventQuery.error.code === 404;
  useEffect(() => {
    if (slug && eventGone) forgetLastEventSnapshot(slug);
  }, [slug, eventGone]);
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

  const recapSlug = event?.recapSlug;
  const refreshAll = useCallback(() => {
    if (!slug) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
    void invalidateMyNights(queryClient);
    void invalidateWatched(queryClient);
    void queryClient.invalidateQueries({ queryKey: MOVIE_NIGHTS_KEY });
    if (recapSlug) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.event.recap(recapSlug) });
    }
  }, [slug, hostToken, recapSlug, queryClient]);

  const offlineVotes = useOfflineVoteReplay({
    slug,
    onReplayed: refreshAll,
    serverReachedAt: Math.max(eventQuery.dataUpdatedAt, moviesQuery.dataUpdatedAt),
  });

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
    liveConnected: live.connected,
    livePresence: live.presence,
    showingOfflineCopy,
    offlineVoteOutcome: offlineVotes.outcome,
    dismissOfflineVoteOutcome: offlineVotes.dismiss,
  };
}
