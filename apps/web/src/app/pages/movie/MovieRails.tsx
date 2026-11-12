import clsx from 'clsx';
import { ROUTES } from '@/app/routes';
import type { MovieCollectionRef } from '@/features/movies/api/moviesApi';
import type { ShowcaseItem, ShowcaseQuery } from '@/features/movies/api/showcaseApi';
import MovieBrowseCard, {
  type MovieBrowseCardItem,
  type MovieLibraryActions,
} from '@/features/movies/components/MovieBrowseCard';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import showcaseStyles from '@/features/movies/components/ShowcaseMovieCard.module.css';
import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import { useTranslation } from '@/shared/i18n';
import type { MovieMediaType } from '@/shared/types/movie';
import styles from './MovieRails.module.css';

const RAIL_LIMIT = 20;

interface RailProps {
  heading: string;
  query: ShowcaseQuery;
  seeAllTo?: string;
  seeAllLabel?: string;
  current: { tmdbId: number; mediaType: MovieMediaType };
  markCurrent?: boolean;
  library: MovieLibraryActions;
  onSelect: (item: MovieBrowseCardItem) => void;
}

function toCardItem(item: ShowcaseItem): MovieBrowseCardItem {
  return {
    tmdbId: item.id,
    mediaType: item.mediaType ?? 'movie',
    title: item.title,
    year: item.year,
    posterPath: item.posterPath,
    voteAverage: item.voteAverage,
    runtimeMinutes: item.runtimeMinutes,
    genreIds: item.genreIds,
  };
}

function isCurrent(item: MovieBrowseCardItem, current: RailProps['current']): boolean {
  return item.tmdbId === current.tmdbId && item.mediaType === current.mediaType;
}

function MovieRail({
  heading,
  query,
  seeAllTo,
  seeAllLabel,
  current,
  markCurrent = false,
  library,
  onSelect,
}: Readonly<RailProps>) {
  const { t } = useTranslation();
  const showcase = useMovieShowcase(query);
  const items = (showcase.data?.items ?? [])
    .map(toCardItem)
    .filter((item) => markCurrent || !isCurrent(item, current))
    .slice(0, RAIL_LIMIT);
  if (items.length === 0 || (markCurrent && items.length < 2)) return null;
  return (
    <MoviePreviewRow
      heading={heading}
      seeAllTo={seeAllTo}
      seeAllLabel={seeAllLabel}
      className={styles.rail}
    >
      <MoviePreviewRail size="md" itemCount={items.length}>
        {items.map((item) => (
          <MovieBrowseCard
            key={`${item.tmdbId}|${item.mediaType}`}
            item={item}
            hasHover={library.hasHover}
            isLoggedIn={library.isLoggedIn}
            inWatchlist={library.has(item)}
            onToggleWatchlist={() => library.toggle(item)}
            onProposeToEvent={() => library.propose(item)}
            onOpenDetails={() => onSelect(item)}
            leadingBadge={
              markCurrent && isCurrent(item, current) ? (
                <span className={clsx(showcaseStyles.badge, showcaseStyles.badgeStacked)}>
                  {t('moviePage.sagaThisFilm')}
                </span>
              ) : undefined
            }
          />
        ))}
      </MoviePreviewRail>
    </MoviePreviewRow>
  );
}

export default function MovieRails({
  current,
  collection,
  director,
  library,
  onSelect,
}: Readonly<{
  current: { tmdbId: number; mediaType: MovieMediaType };
  collection: MovieCollectionRef | null;
  director: { id: number; name: string } | null;
  library: MovieLibraryActions;
  onSelect: (item: MovieBrowseCardItem) => void;
}>) {
  const { t } = useTranslation();
  const isTv = current.mediaType === 'tv';
  return (
    <div className={styles.rails}>
      {collection ? (
        <MovieRail
          heading={collection.name}
          query={{ section: 'collection', collectionId: collection.id }}
          seeAllTo={ROUTES.movieCollection(collection.id)}
          seeAllLabel={t('moviePage.sagaSeeAll')}
          current={current}
          markCurrent
          library={library}
          onSelect={onSelect}
        />
      ) : null}
      {director ? (
        <MovieRail
          heading={t('moviePage.sameDirector', { name: director.name })}
          query={{ section: 'director', personId: director.id }}
          current={current}
          library={library}
          onSelect={onSelect}
        />
      ) : null}
      <MovieRail
        heading={t(isTv ? 'moviePage.similarShows' : 'moviePage.similarMovies')}
        query={{
          section: 'recommendations',
          seedTmdbId: current.tmdbId,
          seedMediaType: current.mediaType,
        }}
        seeAllTo={ROUTES.showcaseRecommendations(current.tmdbId, current.mediaType)}
        seeAllLabel={t('moviePage.similarSeeAll')}
        current={current}
        library={library}
        onSelect={onSelect}
      />
    </div>
  );
}
