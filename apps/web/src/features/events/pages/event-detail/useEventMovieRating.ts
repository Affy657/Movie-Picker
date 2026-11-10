import { useCallback, useState } from 'react';
import { deleteMovieRating, setMovieRating } from '@/features/movies/api/moviesApi';
import { API_ERROR_REASONS, ApiError, getErrorMessage } from '@/shared/api/apiError';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation } from '@/shared/i18n';

type ParticipantRef = { participantId: string; pseudo: string };

async function deleteIfStillThere(slug: string, movieId: string, participantId: string) {
  try {
    await deleteMovieRating(slug, movieId, participantId);
  } catch (e) {
    if (!ApiError.is(e) || e.reason !== API_ERROR_REASONS.ratingNotFound) throw e;
  }
}

interface EventMovieRatingInput {
  slug: string;
  participant: ParticipantRef | null;
  refreshAll: () => void;
}

export function useEventMovieRating({ slug, participant, refreshAll }: EventMovieRatingInput) {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      action: (participantId: string) => Promise<unknown>,
      fallback: string,
      cleared: boolean
    ) => {
      if (!participant) return false;
      setError(null);
      try {
        await action(participant.participantId);
        track('movie_rated', { cleared });
        refreshAll();
        return true;
      } catch (e) {
        setError(getErrorMessage(e, fallback));
        return false;
      }
    },
    [participant, refreshAll, track]
  );

  const save = useCallback(
    (movieId: string, value: number) =>
      run(
        (participantId) => setMovieRating(slug, movieId, participantId, value),
        t('events.ratings.saveError'),
        false
      ),
    [run, slug, t]
  );

  const clear = useCallback(
    (movieId: string) =>
      run(
        (participantId) => deleteIfStillThere(slug, movieId, participantId),
        t('events.ratings.clearError'),
        true
      ),
    [run, slug, t]
  );

  return { error, save, clear };
}
