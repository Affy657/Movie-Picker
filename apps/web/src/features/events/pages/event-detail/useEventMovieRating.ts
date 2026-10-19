import { useCallback, useState } from 'react';
import { deleteMovieRating, setMovieRating } from '@/features/movies/api/moviesApi';
import { API_ERROR_REASONS, ApiError, getErrorMessage } from '@/shared/api/apiError';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: (participantId: string) => Promise<unknown>, fallback: string) => {
      if (!participant) return false;
      setSaving(true);
      setError(null);
      try {
        await action(participant.participantId);
        refreshAll();
        return true;
      } catch (e) {
        setError(getErrorMessage(e, fallback));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [participant, refreshAll]
  );

  const save = useCallback(
    (movieId: string, value: number) =>
      run(
        (participantId) => setMovieRating(slug, movieId, participantId, value),
        t('events.ratings.saveError')
      ),
    [run, slug, t]
  );

  const clear = useCallback(
    (movieId: string) =>
      run(
        (participantId) => deleteIfStillThere(slug, movieId, participantId),
        t('events.ratings.clearError')
      ),
    [run, slug, t]
  );

  return { saving, error, save, clear };
}
