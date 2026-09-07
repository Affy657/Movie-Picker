import { useId, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Film, RefreshCw, AlertCircle } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { getErrorMessage, ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import ActiveFilterChips from '@/features/movies/components/ActiveFilterChips';
import MovieListFiltersPanel from '@/features/movies/components/MovieListFiltersPanel';
import FilteredCollectionLayout, {
  FilterSheet,
  FilteredEmptyState,
  toCollectionToolbarProps,
} from '@/features/movies/components/FilteredCollectionLayout';
import {
  ProfileLoadErrorState,
  ProfileNotFoundState,
} from '@/features/profile/components/ProfileQueryStates';
import {
  fetchPublicProfile,
  fetchUserWatchedMovies,
  type UserWatchedMovieItem,
} from '@/features/profile/api/profileApi';
import { useProfileMoviesToolbar } from '@/features/profile/hooks/useProfileMoviesToolbar';
import ProfileMoviesToolbar from '@/features/profile/components/ProfileMoviesToolbar';
import MovieBrowseCard from '@/features/movies/components/MovieBrowseCard';
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

  usePageSeo(
    profile
      ? {
          title: pageTitle(t('profile.movies.pageTitle', { name: profile.displayName })),
          description: t('profile.movies.seoDescription', {
            name: profile.displayName,
            handle: profile.handle,
          }),
          canonical: absoluteUrl(ROUTES.profileMovies(profile.handle)),
        }
      : { title: pageTitle(t('profile.loading')), noindex: isNotFound }
  );

  if (profileQuery.isPending && handle) {
    return (
      <PageLayout className={styles.layout}>
        <WatchlistSkeleton label={t('profile.loading')} gridClassName={styles.grid} />
      </PageLayout>
    );
  }

  if (isNotFound) {
    return <ProfileNotFoundState />;
  }

  if (profileQuery.isError || !profile) {
    return <ProfileLoadErrorState error={profileQuery.error} />;
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

      {moviesQuery.isPending && (
        <WatchlistSkeleton label={t('profile.loading')} gridClassName={styles.grid} />
      )}
      {!moviesQuery.isPending && moviesQuery.isError && (
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
      )}
      {!moviesQuery.isPending && !moviesQuery.isError && totalCount === 0 && (
        <EmptyState
          icon={<Film aria-hidden size={28} />}
          title={t('profile.movies.emptyTitle')}
          message={t('profile.movies.emptyMessage')}
        />
      )}
      {!moviesQuery.isPending && !moviesQuery.isError && totalCount > 0 && (
        <FilteredCollectionLayout
          toolbar={
            <ProfileMoviesToolbar
              {...toCollectionToolbarProps(toolbar, {
                filtersPanelId,
                activeFilterCount,
                isMobile,
              })}
            />
          }
          desktopFilters={
            toolbar.filtersOpen && !isMobile ? (
              <div ref={filtersPanelRef}>{filtersPanel}</div>
            ) : null
          }
          chips={
            activeFilterCount > 0 ? (
              <ActiveFilterChips
                chips={toolbar.activeFilterChips}
                groupAriaLabel={t('watchlist.filter.toggleAria')}
                removeAriaLabel={t('profile.movies.toolbar.removeFilterAria')}
              />
            ) : null
          }
          mobileSheet={
            isMobile ? (
              <FilterSheet
                open={toolbar.filtersOpen}
                title={t('profile.movies.toolbar.filtersSheetTitle')}
                onClose={() => toolbar.setFiltersOpen(false)}
                resetLabel={t('profile.movies.toolbar.filtersReset')}
                applyLabel={t('profile.movies.toolbar.filtersApply', {
                  count: toolbar.visibleCount,
                })}
                onReset={toolbar.clearAllFilters}
              >
                {filtersPanel}
              </FilterSheet>
            ) : null
          }
          emptyFiltered={
            toolbar.visibleItems.length === 0 ? (
              <FilteredEmptyState
                title={t('profile.movies.toolbar.emptyTitle')}
                message={t('profile.movies.toolbar.emptyMessage')}
                resetLabel={t('profile.movies.toolbar.filtersResetAll')}
                onReset={toolbar.resetAll}
              />
            ) : null
          }
        >
          <ul className={styles.grid} aria-label={t('profile.movies.listAria')}>
            {toolbar.revealedItems.map((item) => (
              <MovieBrowseCard
                key={`${item.tmdbId}|${item.mediaType}|${item.watchedAt}`}
                item={item}
                openDetailsAriaLabel={t('profile.movies.card.openDetailsAria', {
                  title: item.title,
                })}
                ratingScale={user?.ratingScale}
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
        </FilteredCollectionLayout>
      )}

      {detailsTarget && (
        <MovieDetailsModal
          open={!!detailsTarget}
          title={detailsTarget.title}
          year={detailsTarget.year}
          tmdbId={detailsTarget.tmdbId}
          mediaType={detailsTarget.mediaType}
          posterSrc={posterImageSrc(detailsTarget.posterPath)}
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
