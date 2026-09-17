import { useCallback, useState } from 'react';
import { clearMovieVote, voteMovie } from '@/features/movies/api/moviesApi';
import { API_ERROR_REASONS, ApiError, getErrorMessage } from '@/shared/api/apiError';
import { promptToJoinEvent } from '@/features/events/joinPrompt';
import type { MovieData } from '@/shared/types/movie';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation } from '@/shared/i18n';

type ParticipantRef = { participantId: string; pseudo: string };

export type VoteValue = 1 | -1;
export type VoteErrors = Record<string, { message: string; value: VoteValue }>;

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
      if (ApiError.is(error) && error.reason === API_ERROR_REASONS.voteLimitReached) {
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

  const handleVote = useCallback(
    async (movieId: string, value: VoteValue) => {
      if (!participant) {
        promptToJoinEvent();
        return;
      }
      setActionError(null);
      clearVoteError(movieId);
      const current = movies.find((m) => m.id === movieId)?.myVote ?? null;
      try {
        if (current === value) {
          await clearMovieVote(slug, movieId, participant.participantId);
          track('vote_cast', { value, cleared: true });
        } else {
          await voteMovie(slug, movieId, participant.participantId, value);
          track('vote_cast', { value });
        }
        refreshAll();
      } catch (e) {
        reportVoteFailure(movieId, value, e);
      }
    },
    [
      slug,
      participant,
      movies,
      setActionError,
      refreshAll,
      track,
      clearVoteError,
      reportVoteFailure,
    ]
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

  return { voteErrors, voteLimitReached, dismissVoteLimit, handleVote, handleRetryVote };
}
