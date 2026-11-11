import clsx from 'clsx';
import InlineError from '@/shared/components/InlineError';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import MovieCollectionCard from '@/features/movies/components/MovieCollectionCard';
import { useMovieCollections } from '@/features/movies/hooks/useMovieShowcase';
import { RAIL_PREVIEW_COUNT } from './HomeShowcaseRow';
import styles from './HomeShowcaseRow.module.css';
import { collectionDisplayName } from '@/features/movies/utils/collectionName';
import type { MovieCollection } from '@/features/movies/api/showcaseApi';

const SKELETON_CARDS = 6;
const STACK_SIZE = 3;

function stackSources(collection: MovieCollection): string[] {
  const previews = collection.previewPosterPaths ?? [];
  const paths = previews.length > 0 ? previews : [collection.posterPath];
  return paths
    .slice(0, STACK_SIZE)
    .map((path) => tmdbPosterSrcForListDisplay(posterImageSrc(path)))
    .filter((src): src is string => src != null);
}
const COLLECTION_CARD_HEIGHT = 102;

export default function HomeCollectionsRow() {
  const { t } = useTranslation();
  const collections = useMovieCollections();
  const items = collections.data?.items ?? [];
  const previewItems = items.slice(0, RAIL_PREVIEW_COUNT);

  let body;
  if (collections.isPending) {
    body = (
      <SkeletonScreen label={t('showcase.loading')}>
        <ul className={clsx(styles.skeletonGrid, styles.skeletonGridWide)}>
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <li key={index} className={styles.skeletonCard}>
              <Skeleton variant="block" height={COLLECTION_CARD_HEIGHT} />
            </li>
          ))}
        </ul>
      </SkeletonScreen>
    );
  } else if (collections.isError) {
    body = (
      <InlineError
        message={t('showcase.error')}
        retryLabel={t('showcase.retry')}
        onRetry={() => void collections.refetch()}
        messageRole="status"
      />
    );
  } else if (items.length === 0) {
    return null;
  } else {
    body = (
      <MoviePreviewRail size="md" itemCount={previewItems.length}>
        {previewItems.map((collection) => (
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
            stackSrcs={stackSources(collection)}
          />
        ))}
      </MoviePreviewRail>
    );
  }

  return (
    <MoviePreviewRow
      heading={t('showcase.sections.collectionsTitle')}
      seeAllTo={items.length > 0 ? ROUTES.movieCollections : undefined}
      seeAllLabel={
        items.length > 0 ? t('showcase.seeAllCollections', { count: items.length }) : undefined
      }
    >
      {body}
    </MoviePreviewRow>
  );
}
