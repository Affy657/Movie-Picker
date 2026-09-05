import { Info } from 'lucide-react';
import clsx from 'clsx';
import MovieListCard from '@/features/movies/components/MovieListCard';
import styles from '@/features/movies/components/MovieListCard.module.css';
import { CardKebab } from '@/features/movies/components/movieCardParts';
import type { Translate } from '@/features/movies/types';
import WatchlistProposeSubmenu from '@/features/watchlist/components/WatchlistProposeSubmenu';
import type { UserWatchedMovieItem } from '@/features/profile/api/profileApi';
import badgeStyles from './ProfileMovieCard.module.css';

interface ProfileMovieCardProps {
  item: UserWatchedMovieItem;
  tmdbLanguage: string;
  hasHover: boolean;
  isLoggedIn: boolean;
  inWatchlist: boolean;
  onToggleWatchlist: () => void;
  onOpenDetails: () => void;
  onProposeFallback: () => void;
  t: Translate;
}

export default function ProfileMovieCard({
  item,
  tmdbLanguage,
  hasHover,
  isLoggedIn,
  inWatchlist,
  onToggleWatchlist,
  onOpenDetails,
  onProposeFallback,
  t,
}: Readonly<ProfileMovieCardProps>) {
  const isTv = item.mediaType === 'tv';

  return (
    <MovieListCard
      title={item.title}
      year={item.year}
      posterPath={item.posterPath}
      tmdbLanguage={tmdbLanguage}
      genreIds={item.genreIds}
      onOpenDetails={onOpenDetails}
      openDetailsAriaLabel={t('profile.movies.card.openDetailsAria', { title: item.title })}
      badges={
        isTv && (
          <div className={badgeStyles.badgeGroup}>
            <span className={clsx(styles.badge, styles.badgeStacked)}>
              {t('movies.list.tvBadge')}
            </span>
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
        hasHover && (
          <>
            {isLoggedIn && <WatchlistProposeSubmenu movie={item} onDone={() => undefined} />}
            <button type="button" className={styles.overlayDetailsBtn} onClick={onOpenDetails}>
              <Info aria-hidden size={13} />
              <span className={styles.overlayDetailsLabel}>{t('movies.details.toggleShow')}</span>
            </button>
          </>
        )
      }
    />
  );
}
