import { useCallback, useState } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { hasQueuedVote, latestQueuedVote, queueVote } from '@/shared/utils/offlineEventStorage';
import { clearMovieVote, voteMovie } from '@/features/events/api/eventMoviesApi';
import {
  clearVoteSending,
  isVoteSending,
  markVoteSending,
} from '@/features/events/offline/sendingVotes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { API_ERROR_REASONS, ApiError, getErrorMessage } from '@/shared/api/apiError';
import { promptToJoinEvent } from '@/features/events/joinPrompt';
import type { MovieData } from '@/shared/types/movie';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation } from '@/shared/i18n';

type ParticipantRef = { participantId: string; pseudo: string };

export type VoteValue = 1 | -1;
export type VoteErrors = Record<string, { message: string; value: VoteValue }>;

function neverReachedServer(error: unknown): boolean {
  return ApiError.is(error) && error.code === 0;
}

function isVoteLimitFailure(error: unknown): boolean {
  return ApiError.is(error) && error.reason === API_ERROR_REASONS.voteLimitReached;
}

interface EventMovieVotingInput {
  slug: string;
  participant: ParticipantRef | null;
  movies: MovieData[];
  layout: 'grid' | 'list';
  setActionError: (message: string | null) => void;
  refreshAll: () => void;
}

export function useEventMovieVoting({
  slug,
  participant,
  movies,
  layout,
  setActionError,
  refreshAll,
}: EventMovieVotingInput) {
  const { track } = useAnalytics();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [voteErrors, setVoteErrors] = useState<VoteErrors>({});
  const [voteLimitReached, setVoteLimitReached] = useState(false);

  const clearVoteError = useCallback((movieId: string) => {
    setVoteErrors((prev) => {
      if (!(movieId in prev)) return prev;
      const next = { ...prev };
      delete next[movieId];
      return next;
    });
  }, []);

  const reportVoteFailure = useCallback(
    (movieId: string, value: VoteValue, error: unknown) => {
      if (isVoteLimitFailure(error)) {
        setVoteLimitReached(true);
        refreshAll();
        return;
      }
      if (layout === 'list') {
        const message = getErrorMessage(error, t('movies.list.voteErrorRow'));
        setVoteErrors((prev) => ({ ...prev, [movieId]: { message, value } }));
        return;
      }
      setActionError(getErrorMessage(error, t('movies.list.voteError')));
    },
    [layout, refreshAll, setActionError, t]
  );

  const sendVote = useCallback(
    async (participantId: string, movieId: string, value: VoteValue) => {
      const target = { slug, movieId, participantId };
      const current = movies.find((m) => m.id === movieId)?.myVote ?? null;
      const withdraws = current === value;
      markVoteSending({ ...target, value: withdraws ? 0 : value });
      try {
        if (withdraws) {
          await clearMovieVote(slug, movieId, participantId);
          track('vote_cast', { value, cleared: true });
        } else {
          await voteMovie(slug, movieId, participantId, value);
          track('vote_cast', { value });
        }
        refreshAll();
        await queryClient.refetchQueries(
          { queryKey: queryKeys.movies.list(slug), type: 'active' },
          { cancelRefetch: false }
        );
      } finally {
        clearVoteSending(target);
      }
    },
    [slug, movies, refreshAll, track, queryClient]
  );

  const queueForLater = useCallback(
    (participantId: string, movieId: string, value: VoteValue) => {
      const current = movies.find((m) => m.id === movieId)?.myVote ?? null;
      const waiting = latestQueuedVote({ slug, movieId, participantId });
      const withdraws = current === value && waiting?.value !== value;
      queueVote({
        slug,
        movieId,
        participantId,
        value: withdraws ? 0 : value,
        queuedAt: Date.now(),
      });
    },
    [slug, movies]
  );

  const handleVote = useCallback(
    async (movieId: string, value: VoteValue) => {
      if (!participant) {
        promptToJoinEvent();
        return;
      }
      if (isVoteSending({ slug, movieId, participantId: participant.participantId })) return;
      setActionError(null);
      clearVoteError(movieId);
      const waitingBehindQueue = hasQueuedVote({
        slug,
        movieId,
        participantId: participant.participantId,
      });
      if (!onlineManager.isOnline() || waitingBehindQueue) {
        queueForLater(participant.participantId, movieId, value);
        return;
      }
      try {
        await sendVote(participant.participantId, movieId, value);
      } catch (e) {
        if (neverReachedServer(e)) {
          queueForLater(participant.participantId, movieId, value);
          return;
        }
        reportVoteFailure(movieId, value, e);
      }
    },
    [slug, participant, setActionError, clearVoteError, sendVote, reportVoteFailure, queueForLater]
  );

  const submitVote = useCallback(
    async (movieId: string, value: VoteValue) => {
      if (!participant) {
        promptToJoinEvent();
        return;
      }
      if (isVoteSending({ slug, movieId, participantId: participant.participantId })) return;
      try {
        await sendVote(participant.participantId, movieId, value);
      } catch (e) {
        if (isVoteLimitFailure(e)) refreshAll();
        throw e;
      }
    },
    [slug, participant, sendVote, refreshAll]
  );

  const handleRetryVote = useCallback(
    (movieId: string) => {
      const pending = voteErrors[movieId];
      if (!pending) return;
      void handleVote(movieId, pending.value);
    },
    [voteErrors, handleVote]
  );

  const dismissVoteLimit = useCallback(() => setVoteLimitReached(false), []);

  return {
    voteErrors,
    voteLimitReached,
    dismissVoteLimit,
    handleVote,
    handleRetryVote,
    submitVote,
  };
}
