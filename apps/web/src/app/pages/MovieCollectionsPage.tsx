import { useMemo, useState } from 'react';
import { Film } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import InlineError from '@/shared/components/InlineError';
import EmptyState from '@/shared/components/EmptyState';
import { SkeletonScreen } from '@/shared/components/Skeleton';
import { ROUTES } from '@/app/routes';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { SavedMark } from '@/features/library/components/ListSource';
import { useSavedLists } from '@/features/library/hooks/useSavedLists';
import { useWatchedKeys } from '@/features/library/hooks/useWatched';
import { withWatchedCount } from '@/features/library/utils/listCount';
import { progressOnceWatched } from '@/features/library/utils/listProgress';
import MovieCollectionCard, {
  MovieCollectionRows,
  MovieCollectionRowsSkeleton,
} from '@/features/movies/components/MovieCollectionCard';
import { collectionPosterSources } from '@/features/movies/utils/posterStack';
import ListToolbar from '@/features/movies/components/ListToolbar';
import { useMovieCollections } from '@/features/movies/hooks/useMovieShowcase';
import type { MovieCollection } from '@/features/movies/api/showcaseApi';
import styles from './ShowcaseListPage.module.css';
import { collectionDisplayName } from '@/features/movies/utils/collectionName';
import { ICON_SIZE } from '@/shared/components/iconSize';
import BackLink from '@/shared/components/BackLink';

const SKELETON_ROWS = 6;

type CollectionSortKey = 'popularity' | 'name' | 'size';

const DEFAULT_SORT_DIR: Record<CollectionSortKey, 'asc' | 'desc'> = {
  popularity: 'asc',
  name: 'asc',
  size: 'desc',
};

function compareCollections(
  a: MovieCollection,
  b: MovieCollection,
  sortBy: CollectionSortKey,
  rankById: Map<number, number>
): number {
  if (sortBy === 'name') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (sortBy === 'size') return a.movieCount - b.movieCount;
  return (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0);
}

export default function MovieCollectionsPage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const collections = useMovieCollections();
  const items = useMemo(() => collections.data?.items ?? [], [collections.data]);
  const { user } = useAuth();
  const isSignedIn = !!user;
  const watchedKeys = useWatchedKeys(isSignedIn);
  const savedLists = useSavedLists({ enabled: isSignedIn });
  const savedSagaIds = useMemo(
    () =>
      new Set(
        (savedLists.data ?? [])
          .filter((list) => list.sourceType === 'tmdbCollection')
          .map((list) => list.sourceId)
      ),
    [savedLists.data]
  );
  const watchedIn = (collection: MovieCollection) =>
    watchedKeys.ready
      ? watchedKeys.countAmong(
          (collection.movieIds ?? []).map((tmdbId) => ({ tmdbId, mediaType: 'movie' as const }))
        )
      : 0;

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<CollectionSortKey>('popularity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIR.popularity);

  usePageSeo({
    title: pageTitle(t('showcase.sections.collectionsTitle')),
    description: t('showcase.seo.collectionsDescription'),
    canonical: absoluteUrl(ROUTES.movieCollections),
  });

  const query = search.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    const rankById = new Map(items.map((collection, index) => [collection.id, index]));
    const matching = query
      ? items.filter((collection) =>
          collectionDisplayName(collection.name).toLowerCase().includes(query)
        )
      : items;
    const direction = sortDir === 'asc' ? 1 : -1;
    return [...matching].sort((a, b) => compareCollections(a, b, sortBy, rankById) * direction);
  }, [items, query, sortBy, sortDir]);

  const setSort = (key: CollectionSortKey) => {
    if (key === sortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDir(DEFAULT_SORT_DIR[key]);
  };

  const clearAll = () => {
    setSearch('');
    setSortBy('popularity');
    setSortDir(DEFAULT_SORT_DIR.popularity);
  };

  const isFiltered = query.length > 0;

  return (
    <PageLayout className={styles.layout}>
      <BackLink to={ROUTES.home}>{t('showcase.backToHome')}</BackLink>

      <div className={styles.headerText}>
        <h1 className={styles.pageTitle}>{t('showcase.sections.collectionsTitle')}</h1>
        <p className={styles.pageSubtitle}>{t('showcase.sections.collectionsSubtitle')}</p>
      </div>

      {collections.isPending ? (
        <SkeletonScreen label={t('showcase.loading')}>
          <MovieCollectionRowsSkeleton count={SKELETON_ROWS} />
        </SkeletonScreen>
      ) : null}

      {collections.isError ? (
        <InlineError
          message={t('showcase.error')}
          retryLabel={t('showcase.retry')}
          onRetry={() => void collections.refetch()}
        />
      ) : null}

      {!collections.isPending && !collections.isError && items.length === 0 ? (
        <EmptyState
          icon={<Film aria-hidden size={ICON_SIZE['3xl']} />}
          title={t('showcase.empty')}
          message={t('showcase.sections.collectionsSubtitle')}
        />
      ) : null}

      {items.length > 0 ? (
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchLabel={t('showcase.collectionsToolbar.searchLabel')}
          searchPlaceholder={t('showcase.collectionsToolbar.searchPlaceholder')}
          sortOptions={[
            { key: 'popularity', label: t('showcase.collectionsToolbar.sortPopularity') },
            { key: 'name', label: t('showcase.collectionsToolbar.sortName') },
            { key: 'size', label: t('showcase.collectionsToolbar.sortSize') },
          ]}
          sortBy={sortBy}
          sortDir={sortDir}
          onSetSort={setSort}
          sortLabel={t('profile.movies.toolbar.sortLabel')}
          sortMenuAriaLabel={t('profile.movies.toolbar.sortMenuAria')}
          sortDirectionAscLabel={t('profile.movies.toolbar.sortDirectionAsc')}
          sortDirectionDescLabel={t('profile.movies.toolbar.sortDirectionDesc')}
          isFiltered={isFiltered}
          resultCountText={t('showcase.collectionsFilteredCount', {
            shown: visibleItems.length,
            total: items.length,
          })}
          clearAllLabel={t('profile.movies.toolbar.clearAll')}
          onClearAll={clearAll}
          isMobile={isMobile}
          appearance="plain"
        />
      ) : null}

      {items.length > 0 && visibleItems.length === 0 ? (
        <EmptyState
          icon={<Film aria-hidden size={ICON_SIZE['3xl']} />}
          title={t('showcase.collectionsToolbar.noMatch')}
          message={t('showcase.collectionsToolbar.noMatchMessage')}
        />
      ) : null}

      {visibleItems.length > 0 ? (
        <MovieCollectionRows label={t('showcase.sections.collectionsTitle')}>
          {visibleItems.map((collection) => {
            const watched = watchedIn(collection);
            return (
              <MovieCollectionCard
                key={collection.id}
                layout="row"
                to={ROUTES.movieCollection(collection.id)}
                name={collectionDisplayName(collection.name)}
                movieCountLabel={withWatchedCount(
                  pluralizeCount(
                    collection.movieCount,
                    'showcase.collectionMoviesOne',
                    'showcase.collectionMovies',
                    t
                  ),
                  watched,
                  t
                )}
                stackSrcs={collectionPosterSources(collection)}
                progress={progressOnceWatched(watched, collection.movieCount)}
                extra={savedSagaIds.has(String(collection.id)) ? <SavedMark /> : undefined}
              />
            );
          })}
        </MovieCollectionRows>
      ) : null}
    </PageLayout>
  );
}
