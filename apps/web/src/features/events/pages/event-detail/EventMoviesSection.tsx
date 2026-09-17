import {
  lazy,
  Suspense,
  useCallback,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { Film, Plus } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import { loadMovieDetailsModal } from '@/features/movies/components/LazyMovieDetailsModal';
import { setMovieWheelExclusion } from '@/features/movies/api/moviesApi';
import { getErrorMessage } from '@/shared/api/apiError';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import MovieList, { type MovieRowSortKey } from '@/features/movies/components/MovieList';
import SortControl from '@/features/movies/components/SortControl';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import EmptyState from '@/shared/components/EmptyState';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import EventActionErrorBanner from '@/features/events/pages/event-detail/EventActionErrorBanner';
import { Skeleton } from '@/shared/components/Skeleton';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useEventMovieVoting } from './useEventMovieVoting';
import { useEventWatchlistToggle } from './useEventWatchlistToggle';
import styles from './EventMoviesSection.module.css';

const loadAddMoviePanel = () => import('@/features/movies/components/AddMoviePanel');
const AddMoviePanel = lazy(loadAddMoviePanel);
const ADD_MOVIE_CHUNKS = [loadAddMoviePanel, loadMovieDetailsModal];

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
  selection?: MovieCardSelection;
  addMovieOpen: boolean;
  onAddMovieOpenChange: (open: boolean) => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  winnerMovieIds?: string[];
  isFull?: boolean;
};

function emptyStateMessageKey(input: {
  isParticipant: boolean;
  isFull: boolean;
}): 'movies.list.emptyParticipant' | 'movies.list.emptyVisitor' | 'movies.list.emptyVisitorFull' {
  if (input.isParticipant) return 'movies.list.emptyParticipant';
  return input.isFull ? 'movies.list.emptyVisitorFull' : 'movies.list.emptyVisitor';
}

function useMovieSort() {
  const [sortBy, setSortBy] = useState<MovieRowSortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const setSort = useCallback(
    (key: MovieRowSortKey) => {
      if (key === sortBy) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortBy(key);
      setSortDir(DEFAULT_SORT_DIRECTION[key]);
    },
    [sortBy]
  );
  return { sortBy, sortDir, setSort };
}

type SharedMovieListProps = Omit<
  ComponentProps<typeof MovieList>,
  'movies' | 'emptyState' | 'showRank' | 'showHeader' | 'sortBy' | 'sortDir' | 'onSetSort'
>;

type VoteQuota = { used: number; max: number } | null;

function voteQuotaFor(
  maxVotes: number | null,
  hasParticipant: boolean,
  isFinished: boolean,
  used: number
): VoteQuota {
  if (maxVotes === null || !hasParticipant || isFinished) return null;
  return { used, max: maxVotes };
}

function wheelExclusionErrorKey(excluded: boolean) {
  return excluded ? 'movies.list.excludeFromWheelError' : 'movies.list.includeInWheelError';
}

function VoteLimitDialog({
  open,
  maxVotes,
  onClose,
}: Readonly<{ open: boolean; maxVotes: number | null; onClose: () => void }>) {
  const { t } = useTranslation();
  const max = maxVotes ?? 0;
  return (
    <ConfirmDialog
      open={open}
      title={t('movies.list.voteLimitReachedTitle')}
      message={pluralizeCount(
        max,
        'movies.list.voteLimitReachedOne',
        'movies.list.voteLimitReachedMany',
        t,
        { max }
      )}
      confirmLabel={t('movies.list.voteLimitReachedOk')}
      confirmTone="default"
      hideCancel
      onConfirm={onClose}
      onCancel={onClose}
      testId="vote-limit-dialog"
    />
  );
}

function lockedVoteQuotaHint(
  quota: { used: number; max: number } | null,
  t: ReturnType<typeof useTranslation>['t']
): string | null {
  if (!quota || quota.used < quota.max) return null;
  return pluralizeCount(
    quota.max,
    'movies.list.voteQuotaLockedOne',
    'movies.list.voteQuotaLockedMany',
    t,
    { max: quota.max }
  );
}

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
  selection,
  addMovieOpen,
  onAddMovieOpenChange,
  addMovieTriggerRef,
  winnerMovieIds,
  isFull = false,
}: Readonly<EventMoviesSectionProps>) {
  const isFinished = !!event.isFinished;
  const { user } = useAuth();
  const ratingScale = user?.ratingScale;
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const layout: 'grid' | 'list' = isMobile ? 'list' : viewMode;
  useIdlePrefetch(ADD_MOVIE_CHUNKS);
  const sectionHeadingId = useId();
  const { sortBy, sortDir, setSort: handleSetSort } = useMovieSort();
  const { isInWatchlist, toggleWatchlist } = useEventWatchlistToggle(!!user, setActionError);
  const { voteErrors, voteLimitReached, dismissVoteLimit, handleVote, handleRetryVote } =
    useEventMovieVoting({ slug, participant, movies, layout, setActionError, refreshAll });
  const maxVotes = event.config?.maxVotesPerParticipant ?? null;
  const votesUsed = useMemo(() => movies.filter((m) => m.myVote != null).length, [movies]);
  const voteQuota = voteQuotaFor(maxVotes, !!participant, isFinished, votesUsed);
  const voteQuotaLockedHint = lockedVoteQuotaHint(voteQuota, t);

  const handleToggleWheelExclusion = useCallback(
    (m: MovieData) => {
      setActionError(null);
      const excluded = !m.excludedFromWheel;
      void setMovieWheelExclusion(slug, m.id, excluded, hostToken)
        .then(refreshAll)
        .catch((e: unknown) => {
          setActionError(getErrorMessage(e, t(wheelExclusionErrorKey(excluded))));
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

  const showSortControl =
    moviesQuery.isSuccess && (layout === 'grid' || isMobile) && movies.length > 1;
  const canAddFromEmptyState = !!participant && !addMovieOpen;
  const emptyState = isFinished ? null : (
    <EmptyState
      icon={<Film size={ICON_SIZE['3xl']} aria-hidden />}
      title={t('movies.list.emptyTitle')}
      message={t(emptyStateMessageKey({ isParticipant: !!participant, isFull }))}
      actions={
        canAddFromEmptyState ? (
          <Button type="button" variant="primary" onClick={() => onAddMovieOpenChange(true)}>
            <Plus size={ICON_SIZE.md} aria-hidden />
            {t('movies.search.label')}
          </Button>
        ) : null
      }
    />
  );

  const sharedListProps: SharedMovieListProps = {
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
    viewMode: layout,
    isMobile,
    isInWatchlist: user ? isInWatchlist : undefined,
    onToggleWatchlist: user ? toggleWatchlist : undefined,
    onToggleWheelExclusion: event.isHost && !isFinished ? handleToggleWheelExclusion : undefined,
    voteErrors,
    onRetryVote: handleRetryVote,
    selection,
    winnerMovieIds,
    voteQuotaLockedHint,
    participantCount: event.participants?.length ?? 0,
  };

  return (
    <section className="section section-movies" aria-labelledby={sectionHeadingId}>
      <h2 id={sectionHeadingId} className="visually-hidden">
        {t('movies.list.sectionLabel')}
      </h2>
      {!isFinished && participant && addMovieOpen && (
        <div className={styles.addSection}>
          <Suspense fallback={null}>
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
          </Suspense>
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

      {showSortControl && (
        <div className={styles.sectionHeader}>
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
        </div>
      )}

      {moviesQuery.isSuccess && voteQuota ? (
        <output
          className={clsx(styles.voteQuota, voteQuotaLockedHint && styles.voteQuotaReached)}
          data-testid="vote-quota"
        >
          {t('movies.list.voteQuota', { used: voteQuota.used, max: voteQuota.max })}
        </output>
      ) : null}

      {moviesQuery.isSuccess && (
        <EventMovieLists
          layout={layout}
          inWheelMovies={inWheelMovies}
          excludedMovies={excludedMovies}
          listProps={sharedListProps}
          emptyState={emptyState}
          showRank={sortBy === 'score' && sortDir === 'desc' && !isFinished}
          sortBy={sortBy}
          sortDir={sortDir}
          onSetSort={handleSetSort}
        />
      )}

      <VoteLimitDialog open={voteLimitReached} maxVotes={maxVotes} onClose={dismissVoteLimit} />
    </section>
  );
}

function EventMovieLists({
  layout,
  inWheelMovies,
  excludedMovies,
  listProps,
  emptyState,
  showRank,
  sortBy,
  sortDir,
  onSetSort,
}: Readonly<{
  layout: 'grid' | 'list';
  inWheelMovies: MovieData[];
  excludedMovies: MovieData[];
  listProps: SharedMovieListProps;
  emptyState: ReactNode;
  showRank: boolean;
  sortBy: MovieRowSortKey;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: MovieRowSortKey) => void;
}>) {
  const { t } = useTranslation();
  const bleed = layout === 'list' ? styles.movieListBleed : undefined;
  return (
    <>
      <div className={inWheelMovies.length > 0 ? bleed : undefined}>
        <MovieList
          movies={inWheelMovies}
          {...listProps}
          emptyState={emptyState}
          showRank={showRank}
          showHeader
          sortBy={sortBy}
          sortDir={sortDir}
          onSetSort={onSetSort}
        />
      </div>
      {excludedMovies.length > 0 && (
        <>
          <div className={styles.wheelDivider}>
            <span className={styles.wheelDividerLabel}>{t('movies.list.excludedGroupLabel')}</span>
            <span className={styles.wheelDividerCount}>{excludedMovies.length}</span>
            <span className={styles.wheelDividerLine} aria-hidden />
          </div>
          <div className={bleed}>
            <MovieList movies={excludedMovies} {...listProps} showHeader={false} />
          </div>
        </>
      )}
    </>
  );
}
