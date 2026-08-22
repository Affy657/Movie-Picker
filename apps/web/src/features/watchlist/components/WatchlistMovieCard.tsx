import { ImageOff, Info } from 'lucide-react';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { metaGenresLabel } from '@/shared/utils/movieMetaLine';
import { CardKebab, type Translate } from '@/features/movies/components/movieCardParts';
import WatchlistProposeSubmenu from '@/features/watchlist/components/WatchlistProposeSubmenu';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';
import type { RatingScale } from '@/shared/types/theme';
import styles from './WatchlistMovieCard.module.css';

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
  const posterRaw = posterImageSrc(item.posterPath);
  const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
  const voteLabel = formatTmdbVote(item.voteAverage, ratingScale);
  const runtimeLabel = formatRuntimeMinutes(item.runtimeMinutes);
  const genresLabel = metaGenresLabel(item.genreIds, tmdbLanguage) ?? '';

  return (
    <li className={styles.card}>
      <div className={styles.posterRegion}>
        <button
          type="button"
          className={styles.posterBtn}
          onClick={onOpenDetails}
          aria-label={t('watchlist.card.openDetailsAria', { title: item.title })}
        >
          {posterSrc ? (
            <img src={posterSrc} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className={styles.posterPlaceholder} aria-hidden>
              <ImageOff size={22} />
            </div>
          )}
        </button>

        {item.mediaType === 'tv' && (
          <span className={styles.tvBadge}>{t('movies.list.tvBadge')}</span>
        )}

        <div className={styles.kebabSlot}>
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
        </div>

        {hasHover && (
          <div className={styles.overlay}>
            <WatchlistProposeSubmenu movie={item} onDone={() => undefined} />
            <button type="button" className={styles.overlayDetailsBtn} onClick={onOpenDetails}>
              <Info aria-hidden size={13} />
              <span className={styles.overlayDetailsLabel}>{t('movies.details.toggleShow')}</span>
            </button>
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <span className={styles.cardMeta}>
          {item.year && <span>{item.year}</span>}
          {voteLabel && <span title={t('movies.list.tmdbVoteTitle')}>{voteLabel}</span>}
          {runtimeLabel && <span title={t('movies.list.runtimeTitle')}>{runtimeLabel}</span>}
        </span>
        <span className={styles.cardGenres}>{genresLabel}</span>
      </div>
    </li>
  );
}
