import { useCallback, useState } from 'react';
import {
  markMovieAsSeen,
  removeMovieFromEvent,
  setMovieWheelExclusion,
  unmarkMovieAsSeen,
} from '@/features/movies/api/moviesApi';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { useEventMovieVoting } from '@/features/events/pages/event-detail/useEventMovieVoting';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { MovieData, MovieMediaType } from '@/shared/types/movie';
import { getParticipantId } from '@/shared/utils/movieParticipant';

export interface MovieNightTarget {
  slug: string;
  tmdbId: number;
  mediaType: MovieMediaType;
}

function sameFilm(movie: MovieData, tmdbId: number, mediaType: MovieMediaType): boolean {
  return movie.tmdbId === tmdbId && (movie.mediaType ?? 'movie') === mediaType;
}

export function useMovieNight({ slug, tmdbId, mediaType }: MovieNightTarget) {
  const { t } = useTranslation();
  const page = useEventDetailPage(slug);
  const { event, movies, participant, hostToken, refreshAll, setActionError } = page;
  const movie = movies.find((m) => sameFilm(m, tmdbId, mediaType)) ?? null;
  const voting = useEventMovieVoting({
    slug,
    participant,
    movies,
    layout: 'grid',
    setActionError,
    refreshAll,
  });
  const [seenPending, setSeenPending] = useState(false);
  const [removePending, setRemovePending] = useState(false);

  const isFinished = !!event?.isFinished;
  const isHost = !!event?.isHost;
  const wheelLocked = (event?.winners ?? []).length > 0;
  const isMine = !!movie && !!participant && getParticipantId(movie) === participant.participantId;
  const canAct = !isFinished && !!participant;
  const canRemove = !!movie && !isFinished && !wheelLocked && (isMine || isHost);
  const canToggleWheel = !!movie && isHost && !isFinished;
  const iMarkedSeen = !!(participant && movie?.seenByPseudos?.includes(participant.pseudo));

  const vote = useCallback(
    (value: 1 | -1) => {
      if (movie) void voting.handleVote(movie.id, value);
    },
    [movie, voting]
  );

  const toggleSeen = useCallback(async () => {
    if (!movie || !participant || seenPending) return;
    setSeenPending(true);
    setActionError(null);
    try {
      if (iMarkedSeen) await unmarkMovieAsSeen(slug, movie.id, participant.participantId);
      else await markMovieAsSeen(slug, movie.id, participant.participantId);
      refreshAll();
    } catch (e) {
      setActionError(getErrorMessage(e, t('movies.seen.actionError')));
    } finally {
      setSeenPending(false);
    }
  }, [movie, participant, seenPending, iMarkedSeen, slug, refreshAll, setActionError, t]);

  const toggleWheel = useCallback(async () => {
    if (!movie) return;
    const excluded = !movie.excludedFromWheel;
    setActionError(null);
    try {
      await setMovieWheelExclusion(slug, movie.id, excluded, hostToken);
      refreshAll();
    } catch (e) {
      const key = excluded
        ? 'movies.list.excludeFromWheelError'
        : 'movies.list.includeInWheelError';
      setActionError(getErrorMessage(e, t(key)));
    }
  }, [movie, slug, hostToken, refreshAll, setActionError, t]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!movie || !participant) return false;
    setRemovePending(true);
    setActionError(null);
    try {
      await removeMovieFromEvent(slug, movie.id, participant.participantId, hostToken);
      refreshAll();
      return true;
    } catch (e) {
      setActionError(getErrorMessage(e, t('movies.list.removeError')));
      return false;
    } finally {
      setRemovePending(false);
    }
  }, [movie, participant, slug, hostToken, refreshAll, setActionError, t]);

  return {
    event,
    movie,
    loaded: page.eventQuery.isSuccess && page.moviesQuery.isSuccess,
    participant,
    actionError: page.actionError,
    clearActionError: () => setActionError(null),
    canAct,
    canRemove,
    canToggleWheel,
    iMarkedSeen,
    seenPending,
    removePending,
    vote,
    toggleSeen,
    toggleWheel,
    remove,
  };
}
