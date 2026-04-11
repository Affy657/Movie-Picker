import { useCallback } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { removeMovieFromEvent, voteMovie } from '@/features/movies/api/moviesApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import AddMovieForm from '@/features/movies/components/AddMovieForm';
import MovieList from '@/features/movies/components/MovieList';
import EventActionErrorBanner from '@/features/events/pages/event-detail/EventActionErrorBanner';
import { effectiveAllowedReactionIds } from '@/shared/utils/movieReactions';

export type EventMoviesSectionProps = {
  slug: string;
  event: EventData;
  participant: { participantId: string; pseudo: string } | null;
  movies: MovieData[];
  moviesQuery: Pick<
    UseQueryResult<MovieData[]>,
    'isPending' | 'isError' | 'isSuccess' | 'error' | 'refetch'
  >;
  actionError: string | null;
  onDismissActionError: () => void;
  setActionError: (message: string | null) => void;
  refreshAll: () => void;
};

export default function EventMoviesSection({
  slug,
  event,
  participant,
  movies,
  moviesQuery,
  actionError,
  onDismissActionError,
  setActionError,
  refreshAll,
}: EventMoviesSectionProps) {
  const isFinished = !!event.isFinished;
  const allowedReactionIds = effectiveAllowedReactionIds(event.config?.allowedReactionIds);

  const handleVote = useCallback(
    async (movieId: string, value: 1 | -1) => {
      if (!participant) return;
      setActionError(null);
      try {
        await voteMovie(slug, movieId, participant.participantId, value);
        refreshAll();
      } catch (e) {
        setActionError(getErrorMessage(e, 'Erreur lors du vote'));
      }
    },
    [slug, participant, setActionError, refreshAll]
  );

  const handleRemove = useCallback(
    async (movieId: string) => {
      if (!participant) return;
      setActionError(null);
      try {
        await removeMovieFromEvent(slug, movieId, participant.participantId);
        refreshAll();
      } catch (e) {
        setActionError(getErrorMessage(e, 'Erreur lors de la suppression'));
      }
    },
    [slug, participant, setActionError, refreshAll]
  );

  const handleReactionError = useCallback(
    (msg: string) => setActionError(msg),
    [setActionError]
  );

  return (
    <section className="section section-movies" aria-label="Films proposés">
      <h2>Films</h2>
      {!isFinished && participant && (
        <AddMovieForm
          slug={slug}
          participantId={participant.participantId}
          participantPseudo={participant.pseudo}
          existingMovies={movies}
          onAdded={refreshAll}
          disabled={isFinished}
        />
      )}
      {actionError && (
        <EventActionErrorBanner message={actionError} onDismiss={onDismissActionError} />
      )}

      {moviesQuery.isPending && !moviesQuery.isError && (
        <p className="placeholder" aria-busy="true">Chargement des films…</p>
      )}

      {moviesQuery.isSuccess && (
        <MovieList
          movies={movies}
          slug={slug}
          allowedReactionIds={allowedReactionIds}
          participantId={participant?.participantId ?? null}
          participantPseudo={participant?.pseudo ?? null}
          isFinished={isFinished}
          onReactionError={handleReactionError}
          onVote={handleVote}
          onRemove={handleRemove}
          refresh={refreshAll}
        />
      )}
    </section>
  );
}
