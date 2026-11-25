import { useCallback, useState } from 'react';
import {
  markMovieAsSeen,
  setMovieWheelExclusion,
  unmarkMovieAsSeen,
} from '@/features/events/api/eventMoviesApi';
import {
  canAct,
  nightMovieRules,
  wheelExclusionErrorKey,
  type NightMovieRules,
} from '@/features/events/lib/nightRules';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';

export interface WheelExclusionToggleInput {
  slug: string;
  hostToken: string | null;
  refresh: () => void;
  onError: (message: string) => void;
  onActionStart?: () => void;
}

export function useWheelExclusionToggle({
  slug,
  hostToken,
  refresh,
  onError,
  onActionStart,
}: WheelExclusionToggleInput) {
  const { t } = useTranslation();
  return useCallback(
    async (movie: MovieData) => {
      const excluded = !movie.excludedFromWheel;
      onActionStart?.();
      try {
        await setMovieWheelExclusion(slug, movie.id, excluded, hostToken);
        refresh();
      } catch (e) {
        onError(getErrorMessage(e, t(wheelExclusionErrorKey(excluded))));
      }
    },
    [slug, hostToken, refresh, onError, onActionStart, t]
  );
}

export interface NightMovieActionsInput {
  slug: string;
  movie: MovieData | null;
  isFinished: boolean;
  isHost: boolean;
  hostToken?: string | null;
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
  hostToken = null,
  wheelLocked,
  participantId,
  participantPseudo,
  refresh,
  onError,
  onActionStart,
}: NightMovieActionsInput) {
  const { t } = useTranslation();
  const [seenPending, setSeenPending] = useState(false);
  const toggleWheelExclusion = useWheelExclusionToggle({
    slug,
    hostToken,
    refresh,
    onError,
    onActionStart,
  });
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

  const toggleWheel = useCallback(async () => {
    if (movie) await toggleWheelExclusion(movie);
  }, [movie, toggleWheelExclusion]);

  return { ...rules, seenPending, toggleSeen, toggleWheel };
}
