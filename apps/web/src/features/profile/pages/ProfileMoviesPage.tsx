import { useId, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Film, RefreshCw, Search, Trophy } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import Sheet from '@/shared/components/Sheet';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useLocale, useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { metaGenresLabel } from '@/shared/utils/movieMetaLine';
import {
  fetchPublicProfile,
  fetchUserStats,
  fetchUserMovies,
} from '@/features/profile/api/profileApi';
import { useProfileMoviesToolbar } from '@/features/profile/hooks/useProfileMoviesToolbar';
import ProfileMoviesToolbar from '@/features/profile/components/ProfileMoviesToolbar';
import WatchlistFiltersPanel from '@/features/watchlist/components/WatchlistFiltersPanel';
import WatchlistSkeleton from '@/features/watchlist/components/WatchlistSkeleton';
import styles from './ProfileMoviesPage.module.css';

const MOVIES_TAKE = 60;

export default function ProfileMoviesPage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const isMobile = useIsMobile();
  const filtersPanelId = useId();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.public(handle),
    queryFn: () => fetchPublicProfile(handle ?? ''),
    enabled: !!handle,
    retry: false,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.profile.stats(handle),
    queryFn: ({ signal }) => fetchUserStats(handle ?? '', signal),
    enabled: !!handle,
    retry: false,
  });

  const moviesQuery = useQuery({
    queryKey: queryKeys.profile.movies(handle, 0, MOVIES_TAKE),
    queryFn: ({ signal }) => fetchUserMovies(handle ?? '', 0, MOVIES_TAKE, signal),
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
  const totalCount = moviesQuery.data?.totalCount ?? 0;
  const winnersCount = statsQuery.data?.winningProposals ?? 0;
  const subtitle = `${t(totalCount === 1 ? 'profile.movies.pageSubtitleOne' : 'profile.movies.pageSubtitle', { count: totalCount })}${winnersCount > 0 ? t(winnersCount === 1 ? 'profile.movies.pageWinnersOne' : 'profile.movies.pageWinners', { count: winnersCount }) : ''}`;

  const filtersPanel = (
    <WatchlistFiltersPanel
      panelId={filtersPanelId}
      boxed
      tmdbLanguage={tmdbLanguage}
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

            {toolbar.filtersOpen && !isMobile && filtersPanel}

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
              {toolbar.revealedItems.map((item, index) => {
                const posterRaw = posterImageSrc(item.posterPath);
                const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
                const genresLabel = metaGenresLabel(item.genreIds, tmdbLanguage) ?? '';
                return (
                  <li key={`${item.proposedAt}-${index}`} className={styles.card}>
                    <span className={styles.posterWrap}>
                      {posterSrc ? (
                        <img
                          src={posterSrc}
                          alt=""
                          className={styles.poster}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className={styles.posterPlaceholder} aria-hidden>
                          <Film size={22} />
                        </span>
                      )}
                      {item.isWinner && (
                        <span className={styles.winnerBadge}>
                          <Trophy size={11} aria-hidden />
                          <span className={styles.winnerBadgeLabel}>
                            {t('profile.movies.winnerBadgeShort')}
                          </span>
                        </span>
                      )}
                    </span>
                    <div className={styles.cardBody}>
                      <h2 className={styles.cardTitle}>{item.title}</h2>
                      <span className={styles.cardMeta}>{item.year}</span>
                      {genresLabel && <span className={styles.cardGenres}>{genresLabel}</span>}
                    </div>
                  </li>
                );
              })}
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
    </PageLayout>
  );
}
