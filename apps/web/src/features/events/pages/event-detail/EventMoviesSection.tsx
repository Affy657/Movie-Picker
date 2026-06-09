import { useCallback } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { clearMovieVote, removeMovieFromEvent, voteMovie } from '@/features/movies/api/moviesApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import AddMovieForm from '@/features/movies/components/AddMovieForm';
import MovieList from '@/features/movies/components/MovieList';
import EventActionErrorBanner from '@/features/events/pages/event-detail/EventActionErrorBanner';

export type EventMoviesSectionProps = {
  slug: string;
  event: EventData;
  participant: { participantId: string; pseudo: string } | null;
  hostToken: string | null;
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
  hostToken,
  movies,
  moviesQuery,
  actionError,
  onDismissActionError,
  setActionError,
  refreshAll,
}: EventMoviesSectionProps) {
  const isFinished = !!event.isFinished;
  const { track } = useAnalytics();

  const handleVote = useCallback(
    async (movieId: string, value: 1 | -1) => {
      if (!participant) return;
      setActionError(null);
      const current = movies.find((m) => m.id === movieId)?.myVote ?? null;
      try {
        if (current === value) {
          await clearMovieVote(slug, movieId, participant.participantId);
        } else {
          await voteMovie(slug, movieId, participant.participantId, value);
        }
        refreshAll();
      } catch (e) {
        setActionError(getErrorMessage(e, 'Erreur lors du vote'));
      }
    },
    [slug, participant, movies, setActionError, refreshAll]
  );

  const handleRemove = useCallback(
    async (movieId: string) => {
      if (!participant) return;
      setActionError(null);
      try {
        await removeMovieFromEvent(slug, movieId, participant.participantId, hostToken);
        track('movie_removed');
        refreshAll();
      } catch (e) {
        setActionError(getErrorMessage(e, 'Erreur lors de la suppression'));
      }
    },
    [slug, participant, hostToken, setActionError, refreshAll, track]
  );

  const handleActionError = useCallback((msg: string) => setActionError(msg), [setActionError]);

  const participantAvatars = Object.fromEntries(
    (event.participants ?? []).filter((p) => p.avatarId).map((p) => [p.id, p.avatarId!])
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
        <p className="placeholder" aria-busy="true">
          Chargement des films…
        </p>
      )}

      {moviesQuery.isSuccess && (
        <MovieList
          movies={movies}
          slug={slug}
          participantId={participant?.participantId ?? null}
          participantPseudo={participant?.pseudo ?? null}
          isFinished={isFinished}
          isHost={!!event.isHost}
          onActionError={handleActionError}
          onVote={handleVote}
          onRemove={handleRemove}
          refresh={refreshAll}
          participantAvatars={participantAvatars}
        />
      )}
    </section>
  );
}
