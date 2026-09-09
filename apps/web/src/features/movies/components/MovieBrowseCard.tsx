import type { ReactNode } from 'react';
import clsx from 'clsx';
import MovieListCard from '@/features/movies/components/MovieListCard';
import styles from '@/features/movies/components/MovieListCard.module.css';
import { CardKebab } from '@/features/movies/components/movieCardParts';
import type { MovieListItemLike } from '@/features/movies/hooks/useMovieListToolbar';
import type { Translate } from '@/features/movies/types';
import type { RatingScale } from '@/shared/types/theme';
import WatchlistProposeSubmenu from '@/features/watchlist/components/WatchlistProposeSubmenu';
import badgeStyles from './MovieBrowseCard.module.css';

interface MovieBrowseCardProps {
  item: MovieListItemLike;
  hasHover: boolean;
  isLoggedIn: boolean;
  inWatchlist: boolean;
  onToggleWatchlist: () => void;
  onOpenDetails: () => void;
  onProposeFallback: () => void;
  openDetailsAriaLabel: string;
  leadingBadge?: ReactNode;
  ratingScale?: RatingScale;
  t: Translate;
}

export default function MovieBrowseCard({
  item,
  hasHover,
  isLoggedIn,
  inWatchlist,
  onToggleWatchlist,
  onOpenDetails,
  onProposeFallback,
  openDetailsAriaLabel,
  leadingBadge,
  ratingScale,
  t,
}: Readonly<MovieBrowseCardProps>) {
  const isTv = item.mediaType === 'tv';
  const hasBadges = isTv || leadingBadge != null;

  return (
    <MovieListCard
      title={item.title}
      year={item.year}
      posterPath={item.posterPath}
      voteAverage={item.voteAverage}
      ratingScale={ratingScale}
      runtimeMinutes={item.runtimeMinutes}
      onOpenDetails={onOpenDetails}
      openDetailsAriaLabel={openDetailsAriaLabel}
      badges={
        hasBadges && (
          <div className={badgeStyles.badgeGroup}>
            {leadingBadge}
            {isTv && (
              <span className={clsx(styles.badge, styles.badgeStacked)}>
                {t('movies.list.tvBadge')}
              </span>
            )}
          </div>
        )
      }
      kebab={
        <CardKebab
          title={item.title}
          year={item.year}
          tmdbId={item.tmdbId}
          mediaType={item.mediaType}
          isMine={false}
          isHost={false}
          canRemove={false}
          onRemove={() => undefined}
          inWatchlist={isLoggedIn ? inWatchlist : undefined}
          onToggleWatchlist={isLoggedIn ? onToggleWatchlist : undefined}
          onProposeToEvent={isLoggedIn && !hasHover ? onProposeFallback : undefined}
          onViewDetails={!hasHover ? onOpenDetails : undefined}
          t={t}
        />
      }
      overlay={
        hasHover && isLoggedIn && <WatchlistProposeSubmenu movie={item} onDone={() => undefined} />
      }
    />
  );
}
