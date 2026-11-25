import { useCallback, useState } from 'react';
import { removeMovieFromEvent } from '@/features/events/api/eventMoviesApi';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { useNightMovieActions } from '@/features/events/hooks/useNightMovieActions';
import { isWheelLocked, isNightHost } from '@/features/events/lib/nightRules';
import { useEventMovieVoting } from '@/features/events/pages/event-detail/useEventMovieVoting';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { MovieData, MovieMediaType } from '@/shared/types/movie';

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
    voteErrorsInline: false,
    setActionError,
    refreshAll,
  });
  const [removePending, setRemovePending] = useState(false);
  const clearActionError = useCallback(() => setActionError(null), [setActionError]);
  const actions = useNightMovieActions({
    slug,
    movie,
    isFinished: !!event?.isFinished,
    isHost: isNightHost(event),
    hostToken,
    wheelLocked: isWheelLocked((event?.winners ?? []).map((w) => w.movieId)),
    participantId: participant?.participantId ?? null,
    participantPseudo: participant?.pseudo ?? null,
    refresh: refreshAll,
    onError: setActionError,
    onActionStart: clearActionError,
  });

  const vote = useCallback(
    (value: 1 | -1) => {
      if (movie) void voting.handleVote(movie.id, value);
    },
    [movie, voting]
  );

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
    clearActionError,
    voteLimitReached: voting.voteLimitReached,
    dismissVoteLimit: voting.dismissVoteLimit,
    offlineVoteOutcome: page.offlineVoteOutcome,
    dismissOfflineVoteOutcome: page.dismissOfflineVoteOutcome,
    maxVotes: event?.config?.maxVotesPerParticipant ?? null,
    canAct: actions.canAct,
    canRemove: actions.canRemove,
    canToggleWheel: actions.canToggleWheel,
    iMarkedSeen: actions.iMarkedSeen,
    seenPending: actions.seenPending,
    removePending,
    vote,
    toggleSeen: actions.toggleSeen,
    toggleWheel: actions.toggleWheel,
    remove,
  };
}
