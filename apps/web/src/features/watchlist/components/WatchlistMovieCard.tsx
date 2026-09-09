import MovieListCard from '@/features/movies/components/MovieListCard';
import styles from '@/features/movies/components/MovieListCard.module.css';
import { CardKebab } from '@/features/movies/components/movieCardParts';
import type { Translate } from '@/features/movies/types';
import WatchlistProposeSubmenu from '@/features/watchlist/components/WatchlistProposeSubmenu';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';
import type { RatingScale } from '@/shared/types/theme';

interface WatchlistMovieCardProps {
  item: WatchlistItem;
  hasHover: boolean;
  ratingScale?: RatingScale;
  t: Translate;
  onRemove: () => void;
  onOpenDetails: () => void;
  onProposeFallback: () => void;
  layout?: 'grid' | 'row';
}

export default function WatchlistMovieCard({
  item,
  hasHover,
  ratingScale,
  t,
  onRemove,
  onOpenDetails,
  onProposeFallback,
  layout,
}: Readonly<WatchlistMovieCardProps>) {
  return (
    <MovieListCard
      layout={layout}
      title={item.title}
      year={item.year}
      posterPath={item.posterPath}
      voteAverage={item.voteAverage}
      ratingScale={ratingScale}
      runtimeMinutes={item.runtimeMinutes}
      onOpenDetails={onOpenDetails}
      openDetailsAriaLabel={t('watchlist.card.openDetailsAria', { title: item.title })}
      badges={
        item.mediaType === 'tv' && <span className={styles.badge}>{t('movies.list.tvBadge')}</span>
      }
      kebab={
        <CardKebab
          title={item.title}
          year={item.year}
          tmdbId={item.tmdbId}
          mediaType={item.mediaType}
          isMine
          isHost={false}
          canRemove
          onRemove={onRemove}
          onProposeToEvent={!hasHover ? onProposeFallback : undefined}
          onViewDetails={!hasHover ? onOpenDetails : undefined}
          t={t}
        />
      }
      overlay={hasHover && <WatchlistProposeSubmenu movie={item} onDone={() => undefined} />}
    />
  );
}
