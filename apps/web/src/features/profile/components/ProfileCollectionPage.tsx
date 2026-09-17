import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Film, RefreshCw, AlertCircle } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import Avatar from '@/shared/components/Avatar';
import { ROUTES } from '@/app/routes';
import { ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import LazyMovieDetailsModal, {
  loadMovieDetailsModal,
} from '@/features/movies/components/LazyMovieDetailsModal';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { toCollectionToolbarProps } from '@/features/movies/components/FilteredCollectionLayout';
import MovieListFilteredLayout from '@/features/movies/components/MovieListFilteredLayout';
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
import { useWatchlistToggle } from '@/features/watchlist/hooks/useWatchlistToggle';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import WatchlistSkeleton from '@/features/watchlist/components/WatchlistSkeleton';
import styles from './ProfileCollectionPage.module.css';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';

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

const MOVIE_DETAILS_CHUNKS = [loadMovieDetailsModal];

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
  useIdlePrefetch(MOVIE_DETAILS_CHUNKS);
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

  const [detailsTarget, setDetailsTarget] = useState<T | null>(null);
  const [proposeTarget, setProposeTarget] = useState<T | null>(null);
  const watchlist = useWatchlistToggle(isLoggedIn);

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

  return (
    <PageLayout className={styles.layout}>
      <Link to={ROUTES.profile(profile.handle)} className={styles.backLink}>
        <ArrowLeft size={ICON_SIZE.md} aria-hidden />
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

      {watchlist.error ? (
        <p className="error" role="alert">
          {watchlist.error}
        </p>
      ) : null}

      {itemsQuery.isPending && (
        <WatchlistSkeleton label={t('profile.loading')} gridClassName={styles.grid} />
      )}
      {!itemsQuery.isPending && itemsQuery.isError && (
        <div className={styles.moviesError} role="alert">
          <span className={styles.moviesErrorIcon} aria-hidden>
            <AlertCircle size={ICON_SIZE.lg} />
          </span>
          <div className={styles.moviesErrorBody}>
            <p className={styles.moviesErrorMessage}>{texts.loadError}</p>
            <Button type="button" size="sm" onClick={() => itemsQuery.refetch()}>
              <RefreshCw size={ICON_SIZE.md} aria-hidden />
              <span className={styles.btnLabel}>{t('profile.stats.retry')}</span>
            </Button>
          </div>
        </div>
      )}
      {!itemsQuery.isPending && !itemsQuery.isError && totalCount === 0 && (
        <EmptyState
          icon={<Film aria-hidden size={ICON_SIZE['3xl']} />}
          title={texts.emptyTitle}
          message={texts.emptyMessage}
        />
      )}
      {!itemsQuery.isPending && !itemsQuery.isError && totalCount > 0 && (
        <MovieListFilteredLayout
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
          filters={toolbar}
          filtersPanelId={filtersPanelId}
          tmdbLanguage={tmdbLanguage}
          isMobile={isMobile}
        >
          <ul className={styles.grid} aria-label={texts.listAria}>
            {toolbar.revealedItems.map((item) => (
              <MovieBrowseCard
                key={itemKey(item)}
                item={item}
                ratingScale={user?.ratingScale}
                hasHover={hasHover}
                isLoggedIn={isLoggedIn}
                inWatchlist={watchlist.has(item)}
                onToggleWatchlist={() => watchlist.toggle(item)}
                onProposeToEvent={() => setProposeTarget(item)}
                onOpenDetails={() => setDetailsTarget(item)}
              />
            ))}
          </ul>
          {toolbar.remainingCount > 0 && (
            <Button className={styles.loadMoreBtn} onClick={toolbar.revealMore}>
              {pluralizeCount(
                toolbar.remainingCount,
                'profile.movies.loadMoreOne',
                'profile.movies.loadMore',
                t
              )}
            </Button>
          )}
        </MovieListFilteredLayout>
      )}

      {detailsTarget && (
        <LazyMovieDetailsModal
          open={!!detailsTarget}
          title={detailsTarget.title}
          year={detailsTarget.year}
          tmdbId={detailsTarget.tmdbId}
          mediaType={detailsTarget.mediaType}
          posterSrc={posterImageSrc(detailsTarget.posterPath)}
          libraryContext={
            isLoggedIn
              ? {
                  inWatchlist: watchlist.has(detailsTarget),
                  onToggleWatchlist: () => watchlist.toggle(detailsTarget),
                  onProposeToEvent: () => setProposeTarget(detailsTarget),
                }
              : undefined
          }
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
