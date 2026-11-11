import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Film } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import type { RatingScale } from '@/shared/types/theme';
import styles from './ShowcaseMovieCard.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface ShowcaseMovieCardProps {
  title: string;
  year?: string;
  posterPath: string | null;
  voteAverage?: number | null;
  ratingScale?: RatingScale;
  runtimeMinutes?: number | null;
  meta?: ReactNode;
  eager?: boolean;
  onOpenDetails: () => void;
  badges?: ReactNode;
  cornerBadge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function MovieRankBadge({
  rank,
  label,
  stacked,
}: Readonly<{ rank: number; label: string; stacked?: boolean }>) {
  return (
    <span className={clsx(styles.badge, stacked && styles.badgeStacked)}>
      <span className="visually-hidden">{label}</span>
      <span aria-hidden>{rank}</span>
    </span>
  );
}

export default function ShowcaseMovieCard({
  title,
  year,
  posterPath,
  voteAverage,
  ratingScale,
  runtimeMinutes,
  meta,
  eager = false,
  onOpenDetails,
  badges,
  cornerBadge,
  actions,
  className,
}: Readonly<ShowcaseMovieCardProps>) {
  const { t, locale } = useTranslation();
  const posterRaw = posterImageSrc(posterPath);
  const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
  const voteLabel = formatTmdbVote(voteAverage, ratingScale, locale);
  const runtimeLabel = formatRuntimeMinutes(runtimeMinutes);

  const body = (
    <div className={styles.posterFrame}>
      <button
        type="button"
        className={styles.cardTrigger}
        onClick={onOpenDetails}
        aria-label={t('movies.card.openDetailsAria', { title })}
      />

      <div className={styles.posterRegion}>
        {posterSrc ? (
          <img
            src={posterSrc}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            decoding="async"
            className={styles.posterImg}
          />
        ) : (
          <div className={styles.posterPlaceholder} aria-hidden>
            <Film size={ICON_SIZE['2xl']} />
          </div>
        )}

        {badges}

        {cornerBadge && <div className={styles.cornerSlot}>{cornerBadge}</div>}
      </div>

      <div className={styles.overlay}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <span className={styles.cardMeta}>
          {meta ?? (
            <>
              {year && <span>{year}</span>}
              {voteLabel && <span title={t('movies.list.tmdbVoteTitle')}>{voteLabel}</span>}
              {runtimeLabel && <span title={t('movies.list.runtimeTitle')}>{runtimeLabel}</span>}
            </>
          )}
        </span>
        {actions && <div className={styles.actionBar}>{actions}</div>}
      </div>
    </div>
  );

  return <li className={clsx(styles.card, className)}>{body}</li>;
}
