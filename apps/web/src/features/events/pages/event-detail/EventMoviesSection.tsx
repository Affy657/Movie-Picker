import { useCallback, useState } from 'react';
import clsx from 'clsx';
import { LayoutGrid, List } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { clearMovieVote, removeMovieFromEvent, voteMovie } from '@/features/movies/api/moviesApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import AddMovieForm from '@/features/movies/components/AddMovieForm';
import MovieList from '@/features/movies/components/MovieList';
import EventActionErrorBanner from '@/features/events/pages/event-detail/EventActionErrorBanner';
import { useTranslation } from '@/shared/i18n';
import styles from './EventMoviesSection.module.css';

type SortKey = 'score' | 'voteAverage' | 'duration' | 'createdAt';

function sortMovies(movies: MovieData[], sortBy: SortKey): MovieData[] {
  return [...movies].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score;
      case 'voteAverage': {
        const va = a.voteAverage ?? -Infinity;
        const vb = b.voteAverage ?? -Infinity;
        return vb - va;
      }
      case 'duration': {
        const ra = a.runtimeMinutes ?? Infinity;
        const rb = b.runtimeMinutes ?? Infinity;
        return ra - rb;
      }
      case 'createdAt':
        return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    }
  });
}

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
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
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
  viewMode,
  onViewModeChange,
}: Readonly<EventMoviesSectionProps>) {
  const isFinished = !!event.isFinished;
  const { track } = useAnalytics();
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');

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
  const participantAvatarsByPseudo = Object.fromEntries(
    (event.participants ?? []).filter((p) => p.avatarId).map((p) => [p.pseudo, p.avatarId!])
  );

  return (
    <section className="section section-movies" aria-label="Films proposés">
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
        <div className={styles.sortBar}>
          {movies.length > 1 && (
            <>
              <span className={styles.sortLabel}>{t('movies.list.sortLabel')}</span>
              <div
                className={styles.sortPills}
                role="toolbar"
                aria-label={t('movies.list.sortLabel')}
              >
                {(
                  [
                    { key: 'createdAt', label: t('movies.list.sortAddedAt') },
                    { key: 'score', label: t('movies.list.sortScore') },
                    { key: 'voteAverage', label: t('movies.list.sortTmdbVote') },
                    { key: 'duration', label: t('movies.list.sortDuration') },
                  ] as { key: SortKey; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={clsx(styles.sortPill, sortBy === key && styles.sortPillActive)}
                    aria-pressed={sortBy === key}
                    onClick={() => setSortBy(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          <div
            className={styles.viewToggle}
            role="toolbar"
            aria-label={t('movies.list.viewToggleAria')}
          >
            <button
              type="button"
              className={clsx(
                styles.viewToggleBtn,
                viewMode === 'list' && styles.viewToggleBtnActive
              )}
              aria-pressed={viewMode === 'list'}
              aria-label={t('movies.list.viewListAria')}
              onClick={() => onViewModeChange('list')}
            >
              <List aria-hidden size={15} />
            </button>
            <button
              type="button"
              className={clsx(
                styles.viewToggleBtn,
                viewMode === 'grid' && styles.viewToggleBtnActive
              )}
              aria-pressed={viewMode === 'grid'}
              aria-label={t('movies.list.viewGridAria')}
              onClick={() => onViewModeChange('grid')}
            >
              <LayoutGrid aria-hidden size={15} />
            </button>
          </div>
        </div>
      )}

      {moviesQuery.isSuccess && (
        <div className={viewMode === 'list' ? styles.movieListBleed : undefined}>
          <MovieList
            movies={sortMovies(movies, sortBy)}
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
            participantAvatarsByPseudo={participantAvatarsByPseudo}
            viewMode={viewMode}
          />
        </div>
      )}
    </section>
  );
}
