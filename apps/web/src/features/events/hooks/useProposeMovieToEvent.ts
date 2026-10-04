import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { fetchEventBySlug } from '@/features/events/api/eventsApi';
import { addMovieToEvent } from '@/features/movies/api/moviesApi';
import type { MovieMediaType } from '@/shared/types/movie';

export interface ProposableMovie {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  genreIds?: number[];
}

export function useProposeMovieToEvent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useCallback(
    async (slug: string, movie: ProposableMovie) => {
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
        genreIds: movie.genreIds,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.event.detailForAnyHostToken(slug) });
    },
    [t, queryClient]
  );
}
