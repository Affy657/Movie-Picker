import { useCallback, useMemo, useState, type RefObject } from 'react';
import clsx from 'clsx';
import { ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import {
  clearMovieVote,
  removeMovieFromEvent,
  setMovieWheelExclusion,
  voteMovie,
} from '@/features/movies/api/moviesApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import AddMoviePanel from '@/features/movies/components/AddMoviePanel';
import MovieList from '@/features/movies/components/MovieList';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import EventActionErrorBanner from '@/features/events/pages/event-detail/EventActionErrorBanner';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '@/features/watchlist/hooks/useWatchlist';
import { useTranslation } from '@/shared/i18n';
import styles from './EventMoviesSection.module.css';

function watchlistKey(tmdbId: number, mediaType: MovieData['mediaType']): string {
  return `${tmdbId}|${mediaType ?? 'movie'}`;
}

type SortKey = 'score' | 'voteAverage' | 'duration' | 'createdAt';

function pinWinnerFirst(movies: MovieData[], winnerMovieId?: string): MovieData[] {
  if (!winnerMovieId) return movies;
  const index = movies.findIndex((m) => m.id === winnerMovieId);
  if (index <= 0) return movies;
  const next = [...movies];
  const [winner] = next.splice(index, 1);
  return [winner!, ...next];
}

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
  selection?: MovieCardSelection;
  addMovieOpen: boolean;
  onAddMovieOpenChange: (open: boolean) => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  winnerMovieId?: string;
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
  selection,
  addMovieOpen,
  onAddMovieOpenChange,
  addMovieTriggerRef,
  winnerMovieId,
}: Readonly<EventMoviesSectionProps>) {
  const isFinished = !!event.isFinished;
  const { track } = useAnalytics();
  const { user } = useAuth();
  const ratingScale = user?.ratingScale;
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [proposeTarget, setProposeTarget] = useState<MovieData | null>(null);

  const watchlistQuery = useWatchlist({ enabled: !!user });
  const watchlistItems = useMemo(() => watchlistQuery.data ?? [], [watchlistQuery.data]);
  const watchlistKeys = useMemo(
    () => new Set(watchlistItems.map((i) => watchlistKey(i.tmdbId, i.mediaType))),
    [watchlistItems]
  );

  const { mutate: addToWatchlist } = useAddToWatchlist({
    onError: (e) => setActionError(getErrorMessage(e, t('watchlist.card.addError'))),
  });
  const { mutate: removeFromWatchlist } = useRemoveFromWatchlist({
    onError: (e) => setActionError(getErrorMessage(e, t('watchlist.card.removeError'))),
  });

  const isInWatchlist = useCallback(
    (m: MovieData) => watchlistKeys.has(watchlistKey(m.tmdbId, m.mediaType)),
    [watchlistKeys]
  );

  const handleToggleWatchlist = useCallback(
    (m: MovieData) => {
      setActionError(null);
      if (watchlistKeys.has(watchlistKey(m.tmdbId, m.mediaType))) {
        removeFromWatchlist({ tmdbId: m.tmdbId, mediaType: m.mediaType });
      } else {
        addToWatchlist({
          tmdbId: m.tmdbId,
          mediaType: m.mediaType,
          title: m.title,
          year: m.year,
          posterPath: m.posterPath,
          voteAverage: m.voteAverage,
          runtimeMinutes: m.runtimeMinutes,
        });
      }
    },
    [watchlistKeys, addToWatchlist, removeFromWatchlist, setActionError]
  );

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

  const handleToggleWheelExclusion = useCallback(
    (m: MovieData) => {
      setActionError(null);
      const excluded = !m.excludedFromWheel;
      void setMovieWheelExclusion(slug, m.id, excluded, hostToken)
        .then(refreshAll)
        .catch((e: unknown) => {
          setActionError(
            getErrorMessage(
              e,
              excluded
                ? t('movies.list.excludeFromWheelError')
                : t('movies.list.includeInWheelError')
            )
          );
        });
    },
    [slug, hostToken, setActionError, refreshAll, t]
  );

  const handleActionError = useCallback((msg: string) => setActionError(msg), [setActionError]);

  const displayedMovies = useMemo(
    () => pinWinnerFirst(sortMovies(movies, sortBy), winnerMovieId),
    [movies, sortBy, winnerMovieId]
  );

  const participantAvatars = Object.fromEntries(
    (event.participants ?? []).filter((p) => p.avatarId).map((p) => [p.id, p.avatarId!])
  );
  const participantAvatarsByPseudo = Object.fromEntries(
    (event.participants ?? []).filter((p) => p.avatarId).map((p) => [p.pseudo, p.avatarId!])
  );

  return (
    <section className="section section-movies" aria-label="Films proposés">
      {!isFinished && participant && addMovieOpen && (
        <div className={styles.addSection}>
          <AddMoviePanel
            triggerLabel={t('movies.search.label')}
            panelTitle={t('movies.search.label')}
            slug={slug}
            participantId={participant.participantId}
            participantPseudo={participant.pseudo}
            existingMovies={movies}
            onAdded={refreshAll}
            disabled={isFinished}
            open={addMovieOpen}
            onOpenChange={onAddMovieOpenChange}
            hideTrigger
            returnFocusRef={addMovieTriggerRef}
          />
        </div>
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
            <div className={styles.sortScroll}>
              <span className={styles.sortLabel}>{t('movies.list.sortLabel')}</span>
              <ArrowUpDown aria-hidden size={15} className={styles.sortLabelIcon} />
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
            </div>
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
            movies={displayedMovies}
            winnerMovieId={winnerMovieId}
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
            ratingScale={ratingScale}
            viewMode={viewMode}
            isInWatchlist={user ? isInWatchlist : undefined}
            onToggleWatchlist={user ? handleToggleWatchlist : undefined}
            onProposeToEvent={user && isFinished ? setProposeTarget : undefined}
            onToggleWheelExclusion={
              event.isHost && !isFinished ? handleToggleWheelExclusion : undefined
            }
            selection={selection}
          />
        </div>
      )}
      {proposeTarget ? (
        <ProposeToEventModal
          open
          movie={{
            tmdbId: proposeTarget.tmdbId,
            mediaType: proposeTarget.mediaType ?? 'movie',
            title: proposeTarget.title,
            year: proposeTarget.year,
            posterPath: proposeTarget.posterPath,
          }}
          onClose={() => setProposeTarget(null)}
        />
      ) : null}
    </section>
  );
}
