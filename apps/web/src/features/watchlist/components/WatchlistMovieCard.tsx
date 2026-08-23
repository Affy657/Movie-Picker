import { Info } from 'lucide-react';
import MovieListCard from '@/features/movies/components/MovieListCard';
import styles from '@/features/movies/components/MovieListCard.module.css';
import { CardKebab, type Translate } from '@/features/movies/components/movieCardParts';
import WatchlistProposeSubmenu from '@/features/watchlist/components/WatchlistProposeSubmenu';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';
import type { RatingScale } from '@/shared/types/theme';

interface WatchlistMovieCardProps {
  item: WatchlistItem;
  hasHover: boolean;
  tmdbLanguage: string;
  ratingScale?: RatingScale;
  t: Translate;
  onRemove: () => void;
  onOpenDetails: () => void;
  onProposeFallback: () => void;
}

export default function WatchlistMovieCard({
  item,
  hasHover,
  tmdbLanguage,
  ratingScale,
  t,
  onRemove,
  onOpenDetails,
  onProposeFallback,
}: Readonly<WatchlistMovieCardProps>) {
  return (
    <MovieListCard
      title={item.title}
      year={item.year}
      posterPath={item.posterPath}
      tmdbLanguage={tmdbLanguage}
      genreIds={item.genreIds}
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
      overlay={
        hasHover && (
          <>
            <WatchlistProposeSubmenu movie={item} onDone={() => undefined} />
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
