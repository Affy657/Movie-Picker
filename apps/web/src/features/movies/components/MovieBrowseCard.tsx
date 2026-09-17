import type { ReactNode } from 'react';
import clsx from 'clsx';
import MovieListCard from '@/features/movies/components/MovieListCard';
import MovieListRow from '@/features/movies/components/MovieListRow';
import styles from '@/features/movies/components/MovieListCard.module.css';
import { CardKebab } from '@/features/movies/components/movieCardParts';
import Chip from '@/shared/components/Chip';
import { useLocale, useTranslation } from '@/shared/i18n';
import type { MovieMediaType } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import badgeStyles from './MovieBrowseCard.module.css';

const MAX_ROW_GENRES = 3;

export interface MovieBrowseCardItem {
  tmdbId: number;
  title: string;
  year: string;
  posterPath: string | null;
  mediaType: MovieMediaType;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  genreIds?: number[];
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
  isMobile?: boolean;
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

function rowGenres(genreIds: number[] | undefined, tmdbLanguage: string): string[] {
  const labels = (genreIds ?? []).map((id) => genreLabel(id, tmdbLanguage));
  return [...new Set(labels)].slice(0, MAX_ROW_GENRES);
}

export default function MovieBrowseCard({
  item,
  layout = 'grid',
  isMobile = false,
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
  const { tmdbLanguage } = useLocale();
  const isTv = item.mediaType === 'tv';
  const hasBadges = isTv || leadingBadge != null;

  const kebab = hasHover ? (
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
  ) : undefined;

  if (layout === 'row') {
    return (
      <MovieListRow
        title={item.title}
        year={item.year}
        posterPath={item.posterPath}
        voteAverage={item.voteAverage}
        ratingScale={ratingScale}
        runtimeMinutes={item.runtimeMinutes}
        genres={rowGenres(item.genreIds, tmdbLanguage)}
        badge={
          isTv ? (
            <Chip size="sm" tone="muted">
              {t('movies.list.tvBadge')}
            </Chip>
          ) : undefined
        }
        eager={eager}
        isMobile={isMobile}
        onOpenDetails={onOpenDetails}
        kebab={isMobile ? undefined : kebab}
      />
    );
  }

  return (
    <MovieListCard
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
      kebab={kebab}
    />
  );
}
