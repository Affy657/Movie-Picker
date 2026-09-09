import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Film } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import Button from '@/shared/components/Button';
import EmptyState from '@/shared/components/EmptyState';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { ROUTES } from '@/app/routes';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import MovieCollectionCard from '@/features/movies/components/MovieCollectionCard';
import ListToolbar from '@/features/movies/components/ListToolbar';
import { useMovieCollections } from '@/features/movies/hooks/useMovieShowcase';
import type { MovieCollection } from '@/features/movies/api/showcaseApi';
import styles from './ShowcaseListPage.module.css';
import { collectionDisplayName } from '@/features/movies/utils/collectionName';

const SKELETON_CARDS = 6;

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

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<CollectionSortKey>('popularity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIR.popularity);

  usePageSeo({
    title: pageTitle(t('showcase.sections.collectionsTitle')),
    description: t('showcase.sections.collectionsSubtitle'),
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
      <Link to={ROUTES.home} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        <span>{t('showcase.backToHome')}</span>
      </Link>

      <div className={styles.headerText}>
        <h1 className={styles.pageTitle}>{t('showcase.sections.collectionsTitle')}</h1>
        <p className={styles.pageSubtitle}>{t('showcase.sections.collectionsSubtitle')}</p>
      </div>

      {collections.isPending ? (
        <SkeletonScreen label={t('showcase.loading')}>
          <ul className={styles.collectionGrid}>
            {Array.from({ length: SKELETON_CARDS }, (_, index) => (
              <li key={index}>
                <Skeleton variant="block" height={88} />
              </li>
            ))}
          </ul>
        </SkeletonScreen>
      ) : null}

      {collections.isError ? (
        <p className={styles.state} role="alert">
          {t('showcase.error')}
          <Button size="sm" variant="secondary" onClick={() => void collections.refetch()}>
            {t('showcase.retry')}
          </Button>
        </p>
      ) : null}

      {!collections.isPending && !collections.isError && items.length === 0 ? (
        <EmptyState
          icon={<Film aria-hidden size={28} />}
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
        />
      ) : null}

      {items.length > 0 && visibleItems.length === 0 ? (
        <EmptyState
          icon={<Film aria-hidden size={28} />}
          title={t('showcase.collectionsToolbar.noMatch')}
          message={t('showcase.collectionsToolbar.noMatchMessage')}
        />
      ) : null}

      {visibleItems.length > 0 ? (
        <ul className={styles.collectionGrid}>
          {visibleItems.map((collection) => (
            <MovieCollectionCard
              key={collection.id}
              to={ROUTES.movieCollection(collection.id)}
              name={collectionDisplayName(collection.name)}
              movieCountLabel={pluralizeCount(
                collection.movieCount,
                'showcase.collectionMoviesOne',
                'showcase.collectionMovies',
                t
              )}
              posterSrc={tmdbPosterSrcForListDisplay(posterImageSrc(collection.posterPath))}
            />
          ))}
        </ul>
      ) : null}
    </PageLayout>
  );
}
