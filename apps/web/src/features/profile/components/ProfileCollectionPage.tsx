import { useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
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
  useMovieListToolbar,
  type MovieListItemLike,
} from '@/features/movies/hooks/useMovieListToolbar';
import {
  ProfileLoadErrorState,
  ProfileNotFoundState,
} from '@/features/profile/components/ProfileQueryStates';
import { fetchPublicProfile, type PublicProfile } from '@/features/profile/api/profileApi';
import ProfileCollectionToolbar from '@/features/profile/components/ProfileCollectionToolbar';
import MovieBrowseCard from '@/features/movies/components/MovieBrowseCard';
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '@/features/watchlist/hooks/useWatchlist';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import WatchlistSkeleton from '@/features/watchlist/components/WatchlistSkeleton';
import styles from './ProfileCollectionPage.module.css';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import Button from '@/shared/components/Button';

export interface ProfileCollectionTexts {
  pageTitle: (name: string) => string;
  seoDescription: (profile: PublicProfile) => string;
  subtitle: (count: number) => string;
  listAria: string;
  loadError: string;
  emptyTitle: string;
  emptyMessage: string;
  searchLabel: string;
  sortPrimaryLabel: string;
}

interface ProfileCollectionPageProps<T extends MovieListItemLike> {
  handle: string | undefined;
  queryKey: readonly unknown[];
  fetchItems: (handle: string, signal: AbortSignal) => Promise<T[]>;
  comparePrimary: (a: T, b: T) => number;
  itemKey: (item: T) => string;
  canonicalPath: (handle: string) => string;
  texts: ProfileCollectionTexts;
}

function watchlistKey(tmdbId: number, mediaType: string): string {
  return `${tmdbId}|${mediaType}`;
}

function useCollectionWatchlist<T extends MovieListItemLike>(
  isLoggedIn: boolean,
  t: ReturnType<typeof useTranslation>['t']
) {
  const [error, setError] = useState<string | null>(null);
  const watchlistQuery = useWatchlist({ enabled: isLoggedIn });
  const keys = useMemo(
    () => new Set((watchlistQuery.data ?? []).map((i) => watchlistKey(i.tmdbId, i.mediaType))),
    [watchlistQuery.data]
  );
  const { mutate: addToWatchlist } = useAddToWatchlist({
    onError: (err) => setError(getErrorMessage(err, t('watchlist.card.addError'))),
  });
  const { mutate: removeFromWatchlist } = useRemoveFromWatchlist({
    onError: (err) => setError(getErrorMessage(err, t('watchlist.card.removeError'))),
  });

  const toggle = (item: T) => {
    setError(null);
    if (keys.has(watchlistKey(item.tmdbId, item.mediaType))) {
      removeFromWatchlist({ tmdbId: item.tmdbId, mediaType: item.mediaType });
      return;
    }
    addToWatchlist({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      year: item.year,
      posterPath: item.posterPath,
    });
  };

  return { keys, error, toggle };
}

function collectionSeo(
  profile: PublicProfile | undefined,
  isNotFound: boolean,
  t: ReturnType<typeof useTranslation>['t'],
  texts: ProfileCollectionTexts,
  canonicalPath: (handle: string) => string
) {
  if (!profile) return { title: pageTitle(t('profile.loading')), noindex: isNotFound };
  return {
    title: pageTitle(texts.pageTitle(profile.displayName)),
    description: texts.seoDescription(profile),
    canonical: absoluteUrl(canonicalPath(profile.handle)),
  };
}

function isNotFoundError(error: unknown): boolean {
  return ApiError.is(error) && error.code === 404;
}

export default function ProfileCollectionPage<T extends MovieListItemLike>({
  handle,
  queryKey,
  fetchItems,
  comparePrimary,
  itemKey,
  canonicalPath,
  texts,
}: Readonly<ProfileCollectionPageProps<T>>) {
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

  const itemsQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchItems(handle ?? '', signal),
    enabled: !!handle,
    retry: false,
  });

  const profile = profileQuery.data;
  const isNotFound =
    !handle ||
    (profileQuery.isError && isNotFoundError(profileQuery.error)) ||
    (itemsQuery.isError && isNotFoundError(itemsQuery.error));

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  const mediaTypeLabels = useMemo(
    () => ({
      movie: t('watchlist.toolbar.filterTypeMovie'),
      tv: t('watchlist.toolbar.filterTypeTv'),
    }),
    [t]
  );

  const toolbar = useMovieListToolbar({ items, tmdbLanguage, mediaTypeLabels, comparePrimary });
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

  const [detailsTarget, setDetailsTarget] = useState<T | null>(null);
  const [proposeTarget, setProposeTarget] = useState<T | null>(null);
  const {
    keys: watchlistKeys,
    error: watchlistError,
    toggle: handleToggleWatchlist,
  } = useCollectionWatchlist<T>(isLoggedIn, t);

  usePageSeo(collectionSeo(profile, isNotFound, t, texts, canonicalPath));

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

  const filtersPanel = (
    <MovieListFiltersPanel
      panelId={filtersPanelId}
      tmdbLanguage={tmdbLanguage}
      labels={filtersLabels}
      selectedGenres={toolbar.selectedGenres}
      onToggleGenre={toolbar.toggleGenre}
      selectedMediaTypes={toolbar.selectedMediaTypes}
      onToggleMediaType={toolbar.toggleMediaType}
      selectedDecade={toolbar.selectedDecade}
      onToggleDecade={toolbar.toggleDecade}
      onReset={isMobile ? undefined : toolbar.clearAllFilters}
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
          <h1 className={styles.pageTitle}>{texts.pageTitle(profile.displayName)}</h1>
          <p className={styles.pageSubtitle}>{texts.subtitle(totalCount)}</p>
        </div>
      </div>

      <h2 className="visually-hidden">{texts.listAria}</h2>

      {watchlistError ? (
        <p className="error" role="alert">
          {watchlistError}
        </p>
      ) : null}

      {itemsQuery.isPending && (
        <WatchlistSkeleton label={t('profile.loading')} gridClassName={styles.grid} />
      )}
      {!itemsQuery.isPending && itemsQuery.isError && (
        <div className={styles.moviesError} role="alert">
          <span className={styles.moviesErrorIcon} aria-hidden>
            <AlertCircle size={18} />
          </span>
          <div className={styles.moviesErrorBody}>
            <p className={styles.moviesErrorMessage}>{texts.loadError}</p>
            <Button type="button" size="sm" onClick={() => itemsQuery.refetch()}>
              <RefreshCw size={15} aria-hidden />
              <span className={styles.btnLabel}>{t('profile.stats.retry')}</span>
            </Button>
          </div>
        </div>
      )}
      {!itemsQuery.isPending && !itemsQuery.isError && totalCount === 0 && (
        <EmptyState
          icon={<Film aria-hidden size={28} />}
          title={texts.emptyTitle}
          message={texts.emptyMessage}
        />
      )}
      {!itemsQuery.isPending && !itemsQuery.isError && totalCount > 0 && (
        <FilteredCollectionLayout
          toolbar={
            <ProfileCollectionToolbar
              {...toCollectionToolbarProps(toolbar, {
                filtersPanelId,
                activeFilterCount,
                isMobile,
              })}
              searchLabel={texts.searchLabel}
              sortPrimaryLabel={texts.sortPrimaryLabel}
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
                applyLabel={pluralizeCount(
                  toolbar.visibleCount,
                  'profile.movies.toolbar.filtersApplyOne',
                  'profile.movies.toolbar.filtersApply',
                  t
                )}
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
          <ul className={styles.grid} aria-label={texts.listAria}>
            {toolbar.revealedItems.map((item) => (
              <MovieBrowseCard
                key={itemKey(item)}
                item={item}
                openDetailsAriaLabel={t('profile.movies.card.openDetailsAria', {
                  title: item.title,
                })}
                ratingScale={user?.ratingScale}
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
