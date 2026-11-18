import { useId, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Lock } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import { MOVIE_PAGE_CHUNKS } from '@/app/moviePageChunk';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import { ApiError } from '@/shared/api/apiError';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { toCollectionToolbarProps } from '@/features/movies/components/FilteredCollectionLayout';
import MovieListFilteredLayout from '@/features/movies/components/MovieListFilteredLayout';
import { useCatalogToolbar } from '@/features/movies/hooks/useCatalogToolbar';
import type { TitleSummary } from '@/shared/types/movie';
import {
  ProfileLoadErrorState,
  ProfileNotFoundState,
} from '@/features/profile/components/ProfileQueryStates';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import ProfileCollectionHeader from '@/features/profile/components/ProfileCollectionHeader';
import { usePublicProfile } from '@/features/profile/hooks/usePublicProfile';
import { profileCollectionSeo } from '@/features/profile/utils/profileCollectionSeo';
import ProfileCollectionToolbar from '@/features/profile/components/ProfileCollectionToolbar';
import MovieBrowseCard from '@/features/movies/components/MovieBrowseCard';
import {
  useWatchlistToggle,
  type WatchlistToggleItem,
} from '@/features/library/hooks/useWatchlistToggle';
import ProposeToEventModal from '@/features/events/components/ProposeToEventModal';
import { useOpenMoviePage } from '@/features/movies/hooks/useOpenMoviePage';
import WatchlistSkeleton from '@/features/library/components/WatchlistSkeleton';
import styles from './ProfileCollectionPage.module.css';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import InlineError from '@/shared/components/InlineError';

export interface CountedCollection<T> {
  items: T[];
  total: number;
}

export interface ProfileCollectionTexts<T = TitleSummary> {
  pageTitle: (name: string) => string;
  seoDescription: (profile: PublicProfile) => string;
  subtitle: (items: readonly T[], total: number) => string;
  listAria: string;
  loadError: string;
  emptyTitle: string;
  emptyMessage: string;
  searchLabel: string;
  sortPrimaryLabel: string;
}

interface ProfileCollectionPageProps<T extends TitleSummary> {
  handle: string | undefined;
  queryKey: readonly unknown[];
  fetchItems: (handle: string, signal: AbortSignal) => Promise<T[] | CountedCollection<T>>;
  comparePrimary: (a: T, b: T) => number;
  itemKey: (item: T) => string;
  canonicalPath: (handle: string) => string;
  texts: ProfileCollectionTexts<T>;
  renderLeadingBadge?: (item: T, handle: string) => ReactNode;
  hidden?: { reason: string; message: string };
}

function isNotFoundError(error: unknown): boolean {
  return ApiError.is(error) && error.code === 404;
}

function counted<T>(fetched: T[] | CountedCollection<T>): CountedCollection<T> {
  return Array.isArray(fetched) ? { items: fetched, total: fetched.length } : fetched;
}

export default function ProfileCollectionPage<T extends TitleSummary>({
  handle,
  queryKey,
  fetchItems,
  comparePrimary,
  itemKey,
  canonicalPath,
  texts,
  renderLeadingBadge,
  hidden,
}: Readonly<ProfileCollectionPageProps<T>>) {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const isMobile = useIsMobile();
  const hasHover = useHasHoverCapability();
  const filtersPanelId = useId();

  const profileQuery = usePublicProfile(handle);

  const itemsQuery = useQuery({
    queryKey,
    queryFn: async ({ signal }) => counted(await fetchItems(handle ?? '', signal)),
    enabled: !!handle,
    retry: false,
  });

  const profile = profileQuery.data;
  const itemsHidden =
    !!hidden && ApiError.is(itemsQuery.error) && itemsQuery.error.reason === hidden.reason;
  const itemsFailed = itemsQuery.isError && !itemsHidden;
  const isNotFound =
    !handle ||
    (profileQuery.isError && isNotFoundError(profileQuery.error)) ||
    (itemsFailed && isNotFoundError(itemsQuery.error));

  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data]);
  const itemsTotal = itemsQuery.data?.total ?? 0;

  const mediaTypeLabels = useMemo(
    () => ({
      movie: t('watchlist.toolbar.filterTypeMovie'),
      tv: t('watchlist.toolbar.filterTypeTv'),
    }),
    [t]
  );

  const toolbar = useCatalogToolbar({ items, tmdbLanguage, mediaTypeLabels, comparePrimary });

  const openMoviePage = useOpenMoviePage();
  useIdlePrefetch(MOVIE_PAGE_CHUNKS);
  const [proposeTarget, setProposeTarget] = useState<WatchlistToggleItem | null>(null);
  const watchlist = useWatchlistToggle(isLoggedIn);

  usePageSeo(profileCollectionSeo(profile, isNotFound, t, texts, canonicalPath));

  if (profileQuery.isPending && handle) {
    return (
      <PageLayout className={styles.layout}>
        <WatchlistSkeleton label={t('profile.loading')} gridClassName={styles.grid} />
      </PageLayout>
    );
  }

  if (isNotFound) {
    return <ProfileNotFoundState handle={handle} />;
  }

  if (profileQuery.isError || !profile) {
    return <ProfileLoadErrorState error={profileQuery.error} />;
  }

  const activeFilterCount = toolbar.activeFilterChips.length;
  const totalCount = items.length;

  return (
    <PageLayout className={styles.layout}>
      <ProfileCollectionHeader
        profile={profile}
        title={texts.pageTitle(profile.displayName)}
        subtitle={itemsHidden ? null : texts.subtitle(items, itemsTotal)}
      />

      <h2 className="visually-hidden">{texts.listAria}</h2>

      {watchlist.error ? (
        <p className="error" role="alert">
          {watchlist.error}
        </p>
      ) : null}

      {itemsQuery.isPending && (
        <WatchlistSkeleton label={t('profile.loading')} gridClassName={styles.grid} />
      )}
      {itemsHidden && hidden ? (
        <EmptyState icon={<Lock aria-hidden size={ICON_SIZE['3xl']} />} message={hidden.message} />
      ) : null}
      {!itemsQuery.isPending && itemsFailed && (
        <InlineError
          message={texts.loadError}
          retryLabel={t('profile.stats.retry')}
          onRetry={() => void itemsQuery.refetch()}
        />
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
                onOpenDetails={() => openMoviePage(item)}
                leadingBadge={
                  renderLeadingBadge && handle ? renderLeadingBadge(item, handle) : undefined
                }
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
