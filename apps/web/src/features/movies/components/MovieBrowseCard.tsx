import type { ReactNode } from 'react';
import clsx from 'clsx';
import MovieListCard from '@/features/movies/components/MovieListCard';
import MovieListRow from '@/features/movies/components/MovieListRow';
import styles from '@/features/movies/components/MovieListCard.module.css';
import rowStyles from '@/features/movies/components/MovieListRow.module.css';
import { MovieTableDispo } from '@/features/movies/components/MovieTable';
import { CardKebab } from '@/features/movies/components/movieCardParts';
import type { Translate } from '@/features/movies/types';
import Chip from '@/shared/components/Chip';
import { Skeleton } from '@/shared/components/Skeleton';
import { useLocale, useTranslation } from '@/shared/i18n';
import type { MovieMediaType, WatchProviderOffer } from '@/shared/types/movie';
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

export type MovieAvailability =
  | { status: 'pending' }
  | { status: 'ready'; providers: WatchProviderOffer[]; watchPageUrl: string | null };

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
  availability?: MovieAvailability;
  hasHover: boolean;
  isLoggedIn: boolean;
  inWatchlist: boolean;
  onToggleWatchlist: () => void;
  onProposeToEvent: () => void;
  onOpenDetails: () => void;
  onOpenAvailability?: () => void;
  leadingBadge?: ReactNode;
  ratingScale?: RatingScale;
  meta?: ReactNode;
  eager?: boolean;
}

function RowAvailability({
  availability,
  title,
  isMobile,
  onMore,
  t,
}: Readonly<{
  availability: MovieAvailability;
  title: string;
  isMobile: boolean;
  onMore: () => void;
  t: Translate;
}>) {
  if (availability.status === 'pending') {
    return (
      <span className={rowStyles.dispoSkeleton}>
        <Skeleton className={rowStyles.dispoSkeletonChip} />
        <Skeleton className={rowStyles.dispoSkeletonChip} />
      </span>
    );
  }
  const flatrate = availability.providers.filter((p) => p.type === 'flatrate');
  return (
    <MovieTableDispo
      flatrateProviders={flatrate}
      rentCount={availability.providers.filter((p) => p.type === 'rent').length}
      buyCount={availability.providers.filter((p) => p.type === 'buy').length}
      watchPageUrl={availability.watchPageUrl}
      maxVisible={isMobile ? 1 : 2}
      chipMaxWidth={isMobile ? undefined : '2.75rem'}
      onMoreClick={onMore}
      emptyLabel={t('movies.watchProviders.emptyLabel')}
      title={title}
      t={t}
    />
  );
}

function rowGenres(genreIds: number[] | undefined, tmdbLanguage: string): string[] {
  const labels = (genreIds ?? []).map((id) => genreLabel(id, tmdbLanguage));
  return [...new Set(labels)].slice(0, MAX_ROW_GENRES);
}

export default function MovieBrowseCard({
  item,
  layout = 'grid',
  isMobile = false,
  availability,
  hasHover,
  isLoggedIn,
  inWatchlist,
  onToggleWatchlist,
  onProposeToEvent,
  onOpenDetails,
  onOpenAvailability,
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
        dispo={
          availability ? (
            <RowAvailability
              availability={availability}
              title={item.title}
              isMobile={isMobile}
              onMore={onOpenAvailability ?? onOpenDetails}
              t={t}
            />
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
