import { useCallback, useId, useMemo, useState, type RefObject } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { clearMovieVote, setMovieWheelExclusion, voteMovie } from '@/features/movies/api/moviesApi';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import { promptToJoinEvent } from '@/features/events/joinPrompt';
import type { MovieData } from '@/shared/types/movie';
import AddMoviePanel from '@/features/movies/components/AddMoviePanel';
import MovieList, { type MovieRowSortKey } from '@/features/movies/components/MovieList';
import SortControl from '@/features/movies/components/SortControl';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import EventActionErrorBanner from '@/features/events/pages/event-detail/EventActionErrorBanner';
import { Skeleton } from '@/shared/components/Skeleton';
import ViewModeToggle from '@/shared/components/ViewModeToggle';
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

const DEFAULT_SORT_DIRECTION: Record<MovieRowSortKey, 'asc' | 'desc'> = {
  score: 'desc',
  voteAverage: 'desc',
  duration: 'asc',
  createdAt: 'asc',
  availability: 'desc',
  seen: 'desc',
  releaseDate: 'desc',
};

function pinWinnersFirst(movies: MovieData[], winnerMovieIds?: string[]): MovieData[] {
  const ids = winnerMovieIds ?? [];
  if (ids.length === 0) return movies;
  const byId = new Map(movies.map((m) => [m.id, m]));
  const pinned = ids.map((id) => byId.get(id)).filter((m): m is MovieData => m !== undefined);
  if (pinned.length === 0) return movies;
  const pinnedIds = new Set(pinned.map((m) => m.id));
  return [...pinned, ...movies.filter((m) => !pinnedIds.has(m.id))];
}

function compareMovies(a: MovieData, b: MovieData, sortBy: MovieRowSortKey): number {
  switch (sortBy) {
    case 'score':
      return a.score - b.score;
    case 'voteAverage': {
      const va = a.voteAverage ?? -Infinity;
      const vb = b.voteAverage ?? -Infinity;
      return va - vb;
    }
    case 'duration': {
      const ra = a.runtimeMinutes ?? Infinity;
      const rb = b.runtimeMinutes ?? Infinity;
      return ra - rb;
    }
    case 'createdAt':
      return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    case 'availability':
      return (a.watchProviders?.length ?? 0) - (b.watchProviders?.length ?? 0);
    case 'seen':
      return (a.seenCount ?? 0) - (b.seenCount ?? 0);
    case 'releaseDate':
      return (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '');
  }
}

function sortMovies(movies: MovieData[], sortBy: MovieRowSortKey, sortDir: 'asc' | 'desc') {
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...movies].sort((a, b) => compareMovies(a, b, sortBy) * dir);
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
  onRequestRemove: (movie: MovieData) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  selection?: MovieCardSelection;
  addMovieOpen: boolean;
  onAddMovieOpenChange: (open: boolean) => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  winnerMovieIds?: string[];
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
  onRequestRemove,
  viewMode,
  onViewModeChange,
  selection,
  addMovieOpen,
  onAddMovieOpenChange,
  addMovieTriggerRef,
  winnerMovieIds,
}: Readonly<EventMoviesSectionProps>) {
  const isFinished = !!event.isFinished;
  const { track } = useAnalytics();
  const { user } = useAuth();
  const ratingScale = user?.ratingScale;
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const sectionHeadingId = useId();
  const [sortBy, setSortBy] = useState<MovieRowSortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSetSort = useCallback(
    (key: MovieRowSortKey) => {
      if (key === sortBy) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(key);
        setSortDir(DEFAULT_SORT_DIRECTION[key]);
      }
    },
    [sortBy]
  );

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

  const [voteErrors, setVoteErrors] = useState<Record<string, { message: string; value: 1 | -1 }>>(
    {}
  );
  const [voteLimitReached, setVoteLimitReached] = useState(false);
  const maxVotes = event.config?.maxVotesPerParticipant ?? null;
  const votesUsed = useMemo(() => movies.filter((m) => m.myVote != null).length, [movies]);

  const clearVoteError = useCallback((movieId: string) => {
    setVoteErrors((prev) => {
      if (!(movieId in prev)) return prev;
      const next = { ...prev };
      delete next[movieId];
      return next;
    });
  }, []);

  const handleVote = useCallback(
    async (movieId: string, value: 1 | -1) => {
      if (!participant) {
        promptToJoinEvent();
        return;
      }
      setActionError(null);
      clearVoteError(movieId);
      const current = movies.find((m) => m.id === movieId)?.myVote ?? null;
      if (current === null && maxVotes !== null && votesUsed >= maxVotes) {
        setVoteLimitReached(true);
        return;
      }
      try {
        if (current === value) {
          await clearMovieVote(slug, movieId, participant.participantId);
          track('vote_cast', { value, cleared: true });
        } else {
          await voteMovie(slug, movieId, participant.participantId, value);
          track('vote_cast', { value });
        }
        refreshAll();
      } catch (e) {
        if (current === null && maxVotes !== null && ApiError.is(e) && e.code === 409) {
          setVoteLimitReached(true);
          refreshAll();
          return;
        }
        if (viewMode === 'list') {
          const message = getErrorMessage(e, t('movies.list.voteErrorRow'));
          setVoteErrors((prev) => ({ ...prev, [movieId]: { message, value } }));
        } else {
          setActionError(getErrorMessage(e, t('movies.list.voteError')));
        }
      }
    },
    [
      slug,
      participant,
      movies,
      maxVotes,
      votesUsed,
      setActionError,
      refreshAll,
      track,
      t,
      viewMode,
      clearVoteError,
    ]
  );

  const handleRetryVote = useCallback(
    (movieId: string) => {
      const pending = voteErrors[movieId];
      if (!pending) return;
      void handleVote(movieId, pending.value);
    },
    [voteErrors, handleVote]
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

  const sortedMovies = useMemo(
    () => sortMovies(movies, sortBy, sortDir),
    [movies, sortBy, sortDir]
  );
  const inWheelMovies = useMemo(
    () =>
      pinWinnersFirst(
        sortedMovies.filter((m) => !m.excludedFromWheel),
        winnerMovieIds
      ),
    [sortedMovies, winnerMovieIds]
  );
  const excludedMovies = useMemo(
    () => sortedMovies.filter((m) => m.excludedFromWheel),
    [sortedMovies]
  );

  const participantAvatars = useMemo(
    () =>
      Object.fromEntries(
        (event.participants ?? []).filter((p) => p.avatarId).map((p) => [p.id, p.avatarId!])
      ),
    [event.participants]
  );
  const participantAvatarsByPseudo = useMemo(
    () =>
      Object.fromEntries(
        (event.participants ?? []).filter((p) => p.avatarId).map((p) => [p.pseudo, p.avatarId!])
      ),
    [event.participants]
  );

  const sortOptions = [
    { key: 'createdAt' as const, label: t('movies.list.sortAddedAt') },
    { key: 'score' as const, label: t('movies.list.sortScore') },
    { key: 'voteAverage' as const, label: t('movies.list.sortTmdbVote') },
    { key: 'duration' as const, label: t('movies.list.sortDuration') },
    { key: 'availability' as const, label: t('movies.list.sortAvailability') },
    { key: 'seen' as const, label: t('movies.list.sortSeen') },
    { key: 'releaseDate' as const, label: t('movies.list.sortReleaseDate') },
  ];

  const sharedListProps = {
    slug,
    participantId: participant?.participantId ?? null,
    canVote: !isFinished,
    participantPseudo: participant?.pseudo ?? null,
    isFinished,
    isHost: !!event.isHost,
    onActionError: handleActionError,
    onVote: handleVote,
    onRemove: onRequestRemove,
    refresh: refreshAll,
    participantAvatars,
    participantAvatarsByPseudo,
    ratingScale,
    viewMode,
    isMobile,
    isInWatchlist: user ? isInWatchlist : undefined,
    onToggleWatchlist: user ? handleToggleWatchlist : undefined,
    onToggleWheelExclusion: event.isHost && !isFinished ? handleToggleWheelExclusion : undefined,
    voteErrors,
    onRetryVote: handleRetryVote,
    selection,
    winnerMovieIds,
    participantCount: event.participants?.length ?? 0,
  };

  return (
    <section className="section section-movies" aria-labelledby={sectionHeadingId}>
      <h2 id={sectionHeadingId} className="visually-hidden">
        {t('movies.list.sectionLabel')}
      </h2>
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
        <div className={styles.loadingState} aria-busy="true">
          <span className="visually-hidden">{t('movies.list.loadingPlaceholder')}</span>
          <Skeleton variant="block" height={48} className={styles.skeletonHeader} />
          <Skeleton variant="block" height={90} className={styles.skeletonRow} />
          <Skeleton variant="block" height={90} className={styles.skeletonRow} />
          <Skeleton variant="block" height={90} className={styles.skeletonRow} />
        </div>
      )}

      {moviesQuery.isSuccess && ((viewMode === 'grid' && movies.length > 1) || isMobile) && (
        <div className={styles.sectionHeader}>
          {(viewMode === 'grid' || isMobile) && movies.length > 1 && (
            <SortControl
              sortOptions={sortOptions}
              sortBy={sortBy}
              sortDir={sortDir}
              onSetSort={handleSetSort}
              sortLabel={t('movies.list.sortLabel')}
              sortMenuAriaLabel={t('movies.list.sortLabel')}
              sortDirectionAscLabel={t('events.myEvents.sortDirectionAsc')}
              sortDirectionDescLabel={t('events.myEvents.sortDirectionDesc')}
              isMobile={isMobile}
            />
          )}
          {isMobile && (
            <ViewModeToggle
              value={viewMode}
              onChange={onViewModeChange}
              className={styles.viewToggleAlign}
            />
          )}
        </div>
      )}

      {moviesQuery.isSuccess && (
        <>
          <div className={viewMode === 'list' ? styles.movieListBleed : undefined}>
            <MovieList
              movies={inWheelMovies}
              {...sharedListProps}
              showRank={sortBy === 'score' && sortDir === 'desc'}
              showHeader
              sortBy={sortBy}
              sortDir={sortDir}
              onSetSort={handleSetSort}
            />
          </div>
          {excludedMovies.length > 0 && (
            <>
              <div className={styles.wheelDivider}>
                <span className={styles.wheelDividerLabel}>
                  {t('movies.list.excludedGroupLabel')}
                </span>
                <span className={styles.wheelDividerCount}>{excludedMovies.length}</span>
                <span className={styles.wheelDividerLine} aria-hidden />
              </div>
              <div className={viewMode === 'list' ? styles.movieListBleed : undefined}>
                <MovieList movies={excludedMovies} {...sharedListProps} showHeader={false} />
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={voteLimitReached}
        title={t('movies.list.voteLimitReachedTitle')}
        message={
          maxVotes === 1
            ? t('movies.list.voteLimitReachedOne')
            : t('movies.list.voteLimitReachedMany', { max: maxVotes ?? 0 })
        }
        confirmLabel={t('movies.list.voteLimitReachedOk')}
        confirmVariant="primary"
        hideCancel
        onConfirm={() => setVoteLimitReached(false)}
        onCancel={() => setVoteLimitReached(false)}
        testId="vote-limit-dialog"
      />
    </section>
  );
}
