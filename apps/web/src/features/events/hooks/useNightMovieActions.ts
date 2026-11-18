import { useCallback, useState } from 'react';
import { markMovieAsSeen, unmarkMovieAsSeen } from '@/features/events/api/eventMoviesApi';
import { canAct, nightMovieRules, type NightMovieRules } from '@/features/events/lib/nightRules';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';

export interface NightMovieActionsInput {
  slug: string;
  movie: MovieData | null;
  isFinished: boolean;
  isHost: boolean;
  wheelLocked: boolean;
  participantId: string | null;
  participantPseudo: string | null;
  refresh: () => void;
  onError: (message: string) => void;
  onActionStart?: () => void;
}

export function useNightMovieActions({
  slug,
  movie,
  isFinished,
  isHost,
  wheelLocked,
  participantId,
  participantPseudo,
  refresh,
  onError,
  onActionStart,
}: NightMovieActionsInput) {
  const { t } = useTranslation();
  const [seenPending, setSeenPending] = useState(false);
  const night = { isFinished, isHost, wheelLocked };
  const viewer = { participantId, pseudo: participantPseudo };
  const rules: NightMovieRules = movie
    ? nightMovieRules(movie, night, viewer)
    : {
        isMine: false,
        canAct: canAct(night, viewer),
        canRemove: false,
        canEditNote: false,
        canToggleWheel: false,
        iMarkedSeen: false,
      };
  const movieId = movie?.id ?? null;
  const seen = rules.iMarkedSeen;

  const toggleSeen = useCallback(async () => {
    if (!movieId || !participantId || seenPending) return;
    setSeenPending(true);
    onActionStart?.();
    try {
      if (seen) await unmarkMovieAsSeen(slug, movieId, participantId);
      else await markMovieAsSeen(slug, movieId, participantId);
      refresh();
    } catch (e) {
      onError(getErrorMessage(e, t('movies.seen.actionError')));
    } finally {
      setSeenPending(false);
    }
  }, [movieId, participantId, seenPending, seen, slug, refresh, onError, onActionStart, t]);

  return { ...rules, seenPending, toggleSeen };
}
