import { useCallback } from 'react';
import { useTranslation } from '@/shared/i18n';
import { fetchEventBySlug } from '@/features/events/api/eventsApi';
import { addMovieToEvent } from '@/features/movies/api/moviesApi';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';

export function useProposeMovieToEvent() {
  const { t } = useTranslation();

  return useCallback(
    async (slug: string, movie: WatchlistItem) => {
      const evt = await fetchEventBySlug(slug, null);
      if (!evt.myParticipant) {
        throw new Error(t('watchlist.propose.proposeError'));
      }
      await addMovieToEvent(slug, {
        tmdbId: movie.tmdbId,
        mediaType: movie.mediaType,
        title: movie.title,
        year: movie.year,
        posterPath: movie.posterPath,
        participantId: evt.myParticipant.id,
      });
    },
    [t]
  );
}
