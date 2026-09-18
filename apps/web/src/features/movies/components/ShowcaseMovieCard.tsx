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
  kebab?: ReactNode;
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
  kebab,
  className,
}: Readonly<ShowcaseMovieCardProps>) {
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

        {kebab && <div className={styles.kebabSlot}>{kebab}</div>}
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <span className={styles.cardMeta}>
          {meta != null ? (
            <span className={styles.metaText}>{meta}</span>
          ) : (
            <>
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
            </>
          )}
        </span>
      </div>
    </>
  );

  return <li className={clsx(styles.card, className)}>{body}</li>;
}
