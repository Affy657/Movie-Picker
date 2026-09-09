import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Film } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import type { RatingScale } from '@/shared/types/theme';
import styles from './MovieListCard.module.css';
import Card from '@/shared/components/Card';

interface MovieListCardProps {
  title: string;
  year?: string;
  posterPath: string | null;
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

  const body = (
    <>
      <button
        type="button"
        className={styles.cardTrigger}
        onClick={onOpenDetails}
        aria-label={openDetailsAriaLabel}
      />

      <div className={styles.posterRegion}>
        {posterSrc ? (
          <img
            src={posterSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className={styles.posterImg}
          />
        ) : (
          <div className={styles.posterPlaceholder} aria-hidden>
            <Film size={22} />
          </div>
        )}

        {badges}

        {kebab && layout === 'grid' && <div className={styles.kebabSlot}>{kebab}</div>}

        {overlay && <div className={styles.overlay}>{overlay}</div>}
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <span className={styles.cardMeta}>
          {year && <span className={styles.metaStart}>{year}</span>}
          {voteLabel && (
            <span className={styles.metaCenter} title={t('movies.list.tmdbVoteTitle')}>
              {voteLabel}
            </span>
          )}
          {runtimeLabel && (
            <span className={styles.metaEnd} title={t('movies.list.runtimeTitle')}>
              {runtimeLabel}
            </span>
          )}
        </span>
      </div>

      {kebab && layout === 'row' && <div className={styles.rowKebabSlot}>{kebab}</div>}
    </>
  );

  if (layout === 'row') {
    return (
      <Card
        as="li"
        padding="none"
        elevation="sm"
        className={clsx(styles.card, styles.cardAsRow, className)}
      >
        {body}
      </Card>
    );
  }

  return <li className={clsx(styles.card, className)}>{body}</li>;
}
