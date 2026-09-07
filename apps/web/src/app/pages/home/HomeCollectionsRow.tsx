import Button from '@/shared/components/Button';
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

const SKELETON_CARDS = 3;

export default function HomeCollectionsRow() {
  const { t } = useTranslation();
  const collections = useMovieCollections();
  const items = collections.data?.items ?? [];
  const previewItems = items.slice(0, RAIL_PREVIEW_COUNT);

  let body;
  if (collections.isPending) {
    body = (
      <SkeletonScreen label={t('showcase.loading')}>
        <ul className={styles.skeletonGrid}>
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <li key={index} className={styles.skeletonCard}>
              <Skeleton variant="block" height={72} />
            </li>
          ))}
        </ul>
      </SkeletonScreen>
    );
  } else if (collections.isError) {
    body = (
      <p className={styles.state}>
        {t('showcase.error')}
        <Button size="sm" variant="secondary" onClick={() => void collections.refetch()}>
          {t('showcase.retry')}
        </Button>
      </p>
    );
  } else if (items.length === 0) {
    return null;
  } else {
    body = (
      <MoviePreviewRail size="wide" itemCount={previewItems.length}>
        {previewItems.map((collection) => (
          <MovieCollectionCard
            key={collection.id}
            to={ROUTES.movieCollection(collection.id)}
            name={collection.name}
            movieCountLabel={pluralizeCount(
              collection.movieCount,
              'showcase.collectionMoviesOne',
              'showcase.collectionMovies',
              t
            )}
            posterSrc={tmdbPosterSrcForListDisplay(posterImageSrc(collection.posterPath))}
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
