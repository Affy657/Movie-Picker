import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Film } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { metaGenresLabel } from '@/shared/utils/movieMetaLine';
import type { RatingScale } from '@/shared/types/theme';
import styles from './MovieListCard.module.css';
import Card from '@/shared/components/Card';

interface MovieListCardProps {
  title: string;
  year?: string;
  posterPath: string | null;
  tmdbLanguage: string;
  genreIds?: number[];
  voteAverage?: number | null;
  ratingScale?: RatingScale;
  runtimeMinutes?: number | null;
  onOpenDetails: () => void;
  openDetailsAriaLabel: string;
  badges?: ReactNode;
  kebab?: ReactNode;
  overlay?: ReactNode;
  className?: string;
  layout?: 'grid' | 'row';
}

export default function MovieListCard({
  title,
  year,
  posterPath,
  tmdbLanguage,
  genreIds,
  voteAverage,
  ratingScale,
  runtimeMinutes,
  onOpenDetails,
  openDetailsAriaLabel,
  badges,
  kebab,
  overlay,
  className,
  layout = 'grid',
}: Readonly<MovieListCardProps>) {
  const { t } = useTranslation();
  const posterRaw = posterImageSrc(posterPath);
  const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
  const voteLabel = formatTmdbVote(voteAverage, ratingScale);
  const runtimeLabel = formatRuntimeMinutes(runtimeMinutes);
  const genresLabel = metaGenresLabel(genreIds, tmdbLanguage) ?? '';

  return (
    <Card
      as="li"
      padding="none"
      elevation="sm"
      className={clsx(styles.card, layout === 'row' && styles.cardAsRow, className)}
    >
      <div className={styles.posterRegion}>
        <button
          type="button"
          className={styles.posterBtn}
          onClick={onOpenDetails}
          aria-label={openDetailsAriaLabel}
        >
          {posterSrc ? (
            <img src={posterSrc} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className={styles.posterPlaceholder} aria-hidden>
              <Film size={22} />
            </div>
          )}
        </button>

        {badges}

        {kebab && layout === 'grid' && <div className={styles.kebabSlot}>{kebab}</div>}

        {overlay && <div className={styles.overlay}>{overlay}</div>}
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <span className={styles.cardMeta}>
          {year && <span>{year}</span>}
          {voteLabel && <span title={t('movies.list.tmdbVoteTitle')}>{voteLabel}</span>}
          {runtimeLabel && <span title={t('movies.list.runtimeTitle')}>{runtimeLabel}</span>}
        </span>
        <span className={styles.cardGenres}>{genresLabel}</span>
      </div>

      {kebab && layout === 'row' && <div className={styles.rowKebabSlot}>{kebab}</div>}
    </Card>
  );
}
