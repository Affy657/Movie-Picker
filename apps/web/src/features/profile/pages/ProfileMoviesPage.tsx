import { useId, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Film, RefreshCw, Search } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import Sheet from '@/shared/components/Sheet';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
import MovieListFiltersPanel from '@/features/movies/components/MovieListFiltersPanel';
import {
  fetchPublicProfile,
  fetchUserWatchedMovies,
  type UserWatchedMovieItem,
} from '@/features/profile/api/profileApi';
import { useProfileMoviesToolbar } from '@/features/profile/hooks/useProfileMoviesToolbar';
import ProfileMoviesToolbar from '@/features/profile/components/ProfileMoviesToolbar';
import ProfileMovieCard from '@/features/profile/components/ProfileMovieCard';
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '@/features/watchlist/hooks/useWatchlist';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import WatchlistSkeleton from '@/features/watchlist/components/WatchlistSkeleton';
import styles from './ProfileMoviesPage.module.css';

const MOVIES_TAKE = 200;

function watchlistKey(tmdbId: number, mediaType: string): string {
  return `${tmdbId}|${mediaType}`;
}

export default function ProfileMoviesPage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const isMobile = useIsMobile();
  const hasHover = useHasHoverCapability();
  const filtersPanelId = useId();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.public(handle),
    queryFn: () => fetchPublicProfile(handle ?? ''),
    enabled: !!handle,
    retry: false,
  });

  const moviesQuery = useQuery({
    queryKey: queryKeys.profile.watchedMovies(handle, MOVIES_TAKE),
    queryFn: ({ signal }) => fetchUserWatchedMovies(handle ?? '', MOVIES_TAKE, signal),
    enabled: !!handle,
    retry: false,
  });

  const profile = profileQuery.data;
  const isNotFound =
    !handle ||
    (profileQuery.isError && ApiError.is(profileQuery.error) && profileQuery.error.code === 404);

  const items = useMemo(() => moviesQuery.data?.items ?? [], [moviesQuery.data]);

  const mediaTypeLabels = useMemo(
    () => ({
      movie: t('watchlist.toolbar.filterTypeMovie'),
      tv: t('watchlist.toolbar.filterTypeTv'),
    }),
    [t]
  );

  const toolbar = useProfileMoviesToolbar({ items, tmdbLanguage, mediaTypeLabels });
  const filtersPanelRef = useRef<HTMLDivElement>(null);
  useClickOutside(
    filtersPanelRef,
    () => toolbar.setFiltersOpen(false),
    toolbar.filtersOpen && !isMobile,
    '[data-filters-toggle]'
  );

  const filtersLabels = useMemo(
    () => ({
      genre: t('watchlist.toolbar.filterGenre'),
      type: t('watchlist.toolbar.filterType'),
      typeMovie: t('watchlist.toolbar.filterTypeMovie'),
      typeTv: t('watchlist.toolbar.filterTypeTv'),
      decade: t('watchlist.toolbar.filterDecade'),
      resetAll: t('profile.movies.toolbar.filtersResetAll'),
    }),
    [t]
  );

  const [detailsTarget, setDetailsTarget] = useState<UserWatchedMovieItem | null>(null);
  const [proposeTarget, setProposeTarget] = useState<UserWatchedMovieItem | null>(null);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const watchlistQuery = useWatchlist({ enabled: isLoggedIn });
  const watchlistKeys = useMemo(
    () => new Set((watchlistQuery.data ?? []).map((i) => watchlistKey(i.tmdbId, i.mediaType))),
    [watchlistQuery.data]
  );
  const { mutate: addToWatchlist } = useAddToWatchlist({
    onError: (err) => setWatchlistError(getErrorMessage(err, t('watchlist.card.addError'))),
  });
  const { mutate: removeFromWatchlist } = useRemoveFromWatchlist({
    onError: (err) => setWatchlistError(getErrorMessage(err, t('watchlist.card.removeError'))),
  });

  const handleToggleWatchlist = (item: UserWatchedMovieItem) => {
    setWatchlistError(null);
    if (watchlistKeys.has(watchlistKey(item.tmdbId, item.mediaType))) {
      removeFromWatchlist({ tmdbId: item.tmdbId, mediaType: item.mediaType });
    } else {
      addToWatchlist({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterPath: item.posterPath,
      });
    }
  };

  useDocumentTitle(
    pageTitle(
      profile ? t('profile.movies.pageTitle', { name: profile.displayName }) : t('profile.loading')
    )
  );

  if (profileQuery.isPending && handle) {
    return (
      <PageLayout className={styles.layout}>
        <WatchlistSkeleton label={t('profile.loading')} gridClassName={styles.grid} />
      </PageLayout>
    );
  }

  if (isNotFound) {
    return (
      <PageLayout className="page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {t('profile.notFound')}
        </p>
        <Link to={ROUTES.home} className="btn">
          {t('profile.backHome')}
        </Link>
      </PageLayout>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <PageLayout className="page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {ApiError.is(profileQuery.error) ? profileQuery.error.message : t('profile.loadError')}
        </p>
      </PageLayout>
    );
  }

  const activeFilterCount = toolbar.activeFilterChips.length;
  const totalCount = items.length;
  const subtitle = t(
    totalCount === 1 ? 'profile.movies.pageSubtitleOne' : 'profile.movies.pageSubtitle',
    { count: totalCount }
  );

  const filtersPanel = (
    <MovieListFiltersPanel
      panelId={filtersPanelId}
      boxed
      tmdbLanguage={tmdbLanguage}
      labels={filtersLabels}
      selectedGenres={toolbar.selectedGenres}
      onToggleGenre={toolbar.toggleGenre}
      selectedMediaTypes={toolbar.selectedMediaTypes}
      onToggleMediaType={toolbar.toggleMediaType}
      selectedDecade={toolbar.selectedDecade}
      onToggleDecade={toolbar.toggleDecade}
      onReset={toolbar.clearAllFilters}
    />
  );

  return (
    <PageLayout className={styles.layout}>
      <Link to={ROUTES.profile(profile.handle)} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        <span className={styles.backLinkLabel}>{t('profile.movies.backLink')}</span>
      </Link>

      <div className={styles.headerRow}>
        <Avatar avatarId={profile.avatarId} pseudo={profile.displayName} size="lg" />
        <div className={styles.headerText}>
          <h1 className={styles.pageTitle}>
            {t('profile.movies.pageTitle', { name: profile.displayName })}
          </h1>
          <p className={styles.pageSubtitle}>{subtitle}</p>
        </div>
      </div>

      <h2 className="visually-hidden">{t('profile.movies.listAria')}</h2>

      {watchlistError ? (
        <p className="error" role="alert">
          {watchlistError}
        </p>
      ) : null}

      {moviesQuery.isPending ? (
        <WatchlistSkeleton label={t('profile.loading')} gridClassName={styles.grid} />
      ) : moviesQuery.isError ? (
        <div className={styles.moviesError} role="alert">
          <span className={styles.moviesErrorIcon} aria-hidden>
            <AlertCircle size={18} />
          </span>
          <div className={styles.moviesErrorBody}>
            <p className={styles.moviesErrorMessage}>{t('profile.movies.loadError')}</p>
            <button type="button" className="btn btn-sm" onClick={() => moviesQuery.refetch()}>
              <RefreshCw size={15} aria-hidden />
              <span className={styles.btnLabel}>{t('profile.stats.retry')}</span>
            </button>
          </div>
        </div>
      ) : totalCount === 0 ? (
        <EmptyState
          icon={<Film aria-hidden size={28} />}
          title={t('profile.movies.emptyTitle')}
          message={t('profile.movies.emptyMessage')}
        />
      ) : (
        <>
          <div className={styles.toolbarBlock}>
            <ProfileMoviesToolbar
              search={toolbar.search}
              onSearchChange={toolbar.setSearch}
              filtersOpen={toolbar.filtersOpen}
              onToggleFilters={() => toolbar.setFiltersOpen((v) => !v)}
              filtersPanelId={filtersPanelId}
              activeFilterCount={activeFilterCount}
              sortBy={toolbar.sortBy}
              sortDir={toolbar.sortDir}
              onSetSort={toolbar.setSortBy}
              isFiltered={toolbar.isFiltered}
              visibleCount={toolbar.visibleCount}
              totalCount={toolbar.totalCount}
              onClearAll={toolbar.resetAll}
              isMobile={isMobile}
            />

            {toolbar.filtersOpen && !isMobile && <div ref={filtersPanelRef}>{filtersPanel}</div>}

            {activeFilterCount > 0 && (
              <div
                className={styles.activeFiltersRow}
                aria-label={t('watchlist.filter.toggleAria')}
              >
                {toolbar.activeFilterChips.map((chip) => (
                  <span key={chip.key} className={styles.activeFilterChip}>
                    <span className={styles.activeFilterChipLabel}>{chip.label}</span>
                    <button
                      type="button"
                      className={styles.activeFilterChipRemove}
                      onClick={chip.onRemove}
                      aria-label={t('profile.movies.toolbar.removeFilterAria')}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                        <path
                          d="M1 1l8 8M9 1 1 9"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {isMobile && (
            <Sheet
              open={toolbar.filtersOpen}
              title={t('profile.movies.toolbar.filtersSheetTitle')}
              onClose={() => toolbar.setFiltersOpen(false)}
              footer={
                <>
                  <button
                    type="button"
                    className={styles.sheetReset}
                    onClick={toolbar.clearAllFilters}
                  >
                    {t('profile.movies.toolbar.filtersReset')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => toolbar.setFiltersOpen(false)}
                  >
                    {t('profile.movies.toolbar.filtersApply', { count: toolbar.visibleCount })}
                  </button>
                </>
              }
            >
              {filtersPanel}
            </Sheet>
          )}

          {toolbar.visibleItems.length === 0 ? (
            <EmptyState
              compact
              icon={<Search aria-hidden size={22} />}
              title={t('profile.movies.toolbar.emptyTitle')}
              message={t('profile.movies.toolbar.emptyMessage')}
              actions={
                <button type="button" className="btn btn-sm" onClick={toolbar.resetAll}>
                  {t('profile.movies.toolbar.filtersResetAll')}
                </button>
              }
            />
          ) : (
            <ul className={styles.grid} aria-label={t('profile.movies.listAria')}>
              {toolbar.revealedItems.map((item) => (
                <ProfileMovieCard
                  key={`${item.tmdbId}|${item.mediaType}|${item.watchedAt}`}
                  item={item}
                  tmdbLanguage={tmdbLanguage}
                  hasHover={hasHover}
                  isLoggedIn={isLoggedIn}
                  inWatchlist={watchlistKeys.has(watchlistKey(item.tmdbId, item.mediaType))}
                  onToggleWatchlist={() => handleToggleWatchlist(item)}
                  onOpenDetails={() => setDetailsTarget(item)}
                  onProposeFallback={() => setProposeTarget(item)}
                  t={t}
                />
              ))}
            </ul>
          )}

          {toolbar.remainingCount > 0 && (
            <button type="button" className={styles.loadMoreBtn} onClick={toolbar.revealMore}>
              {t(
                toolbar.remainingCount === 1
                  ? 'profile.movies.loadMoreOne'
                  : 'profile.movies.loadMore',
                { count: toolbar.remainingCount }
              )}
            </button>
          )}
        </>
      )}

      {detailsTarget && (
        <MovieDetailsModal
          open={!!detailsTarget}
          movieTitle={detailsTarget.title}
          tmdbId={detailsTarget.tmdbId}
          mediaType={detailsTarget.mediaType}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {proposeTarget && (
        <ProposeToEventModal
          open={!!proposeTarget}
          movie={proposeTarget}
          onClose={() => setProposeTarget(null)}
        />
      )}
    </PageLayout>
  );
}
