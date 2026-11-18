import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { fetchEventBySlug } from '@/features/events/api/eventsApi';
import { addMovieToEvent } from '@/features/events/api/eventMoviesApi';
import type { MovieData, TitleSummary } from '@/shared/types/movie';

export type ProposableMovie = TitleSummary;

export interface ProposeOptions {
  participantId?: string;
  pitchNote?: string;
}

export function useProposeMovieToEvent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const myParticipantId = useCallback(
    async (slug: string) => {
      const evt = await fetchEventBySlug(slug, null);
      if (!evt.myParticipant) {
        throw new Error(t('watchlist.propose.proposeError'));
      }
      return evt.myParticipant.id;
    },
    [t]
  );

  return useCallback(
    async (slug: string, movie: ProposableMovie, options?: ProposeOptions): Promise<MovieData> => {
      const participantId = options?.participantId ?? (await myParticipantId(slug));
      const created = await addMovieToEvent(slug, {
        tmdbId: movie.tmdbId,
        mediaType: movie.mediaType,
        title: movie.title,
        year: movie.year,
        posterPath: movie.posterPath,
        participantId,
        genreIds: movie.genreIds,
        ...(options?.pitchNote ? { pitchNote: options.pitchNote } : {}),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.event.detailForAnyHostToken(slug) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.movies.nights(movie.tmdbId, movie.mediaType),
      });
      return created;
    },
    [myParticipantId, queryClient]
  );
}
