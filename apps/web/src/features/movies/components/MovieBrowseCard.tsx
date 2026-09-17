import type { ReactNode } from 'react';
import clsx from 'clsx';
import MovieListCard from '@/features/movies/components/MovieListCard';
import styles from '@/features/movies/components/MovieListCard.module.css';
import { CardKebab } from '@/features/movies/components/movieCardParts';
import { useTranslation } from '@/shared/i18n';
import type { MovieMediaType } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import badgeStyles from './MovieBrowseCard.module.css';

export interface MovieBrowseCardItem {
  tmdbId: number;
  title: string;
  year: string;
  posterPath: string | null;
  mediaType: MovieMediaType;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
}

export interface MovieLibraryActions {
  hasHover: boolean;
  isLoggedIn: boolean;
  has: (item: MovieBrowseCardItem) => boolean;
  toggle: (item: MovieBrowseCardItem) => void;
  propose: (item: MovieBrowseCardItem) => void;
}

interface MovieBrowseCardProps {
  item: MovieBrowseCardItem;
  layout?: 'grid' | 'row';
  hasHover: boolean;
  isLoggedIn: boolean;
  inWatchlist: boolean;
  onToggleWatchlist: () => void;
  onProposeToEvent: () => void;
  onOpenDetails: () => void;
  leadingBadge?: ReactNode;
  ratingScale?: RatingScale;
  meta?: ReactNode;
  eager?: boolean;
}

export default function MovieBrowseCard({
  item,
  layout,
  hasHover,
  isLoggedIn,
  inWatchlist,
  onToggleWatchlist,
  onProposeToEvent,
  onOpenDetails,
  leadingBadge,
  ratingScale,
  meta,
  eager,
}: Readonly<MovieBrowseCardProps>) {
  const { t } = useTranslation();
  const isTv = item.mediaType === 'tv';
  const hasBadges = isTv || leadingBadge != null;

  return (
    <MovieListCard
      layout={layout}
      title={item.title}
      year={item.year}
      posterPath={item.posterPath}
      voteAverage={item.voteAverage}
      ratingScale={ratingScale}
      runtimeMinutes={item.runtimeMinutes}
      meta={meta}
      eager={eager}
      onOpenDetails={onOpenDetails}
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
        hasHover ? (
          <CardKebab
            title={item.title}
            tmdbId={item.tmdbId}
            mediaType={item.mediaType}
            isMine={false}
            isHost={false}
            canRemove={false}
            onRemove={() => undefined}
            inWatchlist={isLoggedIn ? inWatchlist : undefined}
            onToggleWatchlist={isLoggedIn ? onToggleWatchlist : undefined}
            onProposeToEvent={isLoggedIn ? onProposeToEvent : undefined}
            onViewDetails={onOpenDetails}
            t={t}
          />
        ) : undefined
      }
    />
  );
}
