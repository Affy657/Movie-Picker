import type { UseQueryResult } from '@tanstack/react-query';
import { fetchApi } from '../../api/client';
import { getErrorMessage } from '../../api/apiError';
import type { EventData, MovieData } from '../../types/event';
import AddMovieForm from '../../components/AddMovieForm';
import MovieList from '../../components/MovieList';
import EventActionErrorBanner from './EventActionErrorBanner';

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
  const terminé = !!event.terminé;

  return (
    <section className="section section-movies" aria-label="Films proposés">
      <h2>Films</h2>
      {!terminé && participant && (
        <AddMovieForm
          slug={slug}
          participantId={participant.participantId}
          onAdded={refreshAll}
          disabled={terminé}
        />
      )}
      {actionError && (
        <EventActionErrorBanner message={actionError} onDismiss={onDismissActionError} />
      )}

      {moviesQuery.isPending && !moviesQuery.isError && (
        <p className="placeholder">Chargement des films…</p>
      )}

      {moviesQuery.isSuccess && (
        <MovieList
          movies={movies}
          participantId={participant?.participantId ?? null}
          terminé={terminé}
          onVote={async (movieId, value) => {
            if (!participant) return;
            setActionError(null);
            try {
              await fetchApi(`/events/${slug}/movies/${movieId}/vote`, {
                method: 'POST',
                body: JSON.stringify({ participantId: participant.participantId, value }),
              });
            } catch (e) {
              setActionError(getErrorMessage(e, 'Erreur lors du vote'));
              throw e;
            }
          }}
          onRemove={async (movieId) => {
            if (!participant) return;
            setActionError(null);
            try {
              await fetchApi(`/events/${slug}/movies/${movieId}`, {
                method: 'DELETE',
                body: JSON.stringify({ participantId: participant.participantId }),
              });
            } catch (e) {
              setActionError(getErrorMessage(e, 'Erreur lors de la suppression'));
              throw e;
            }
          }}
          refresh={refreshAll}
        />
      )}
    </section>
  );
}
