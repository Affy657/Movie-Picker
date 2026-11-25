import { Link } from 'react-router';
import { Film, Star } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useLocale, useTranslation } from '@/shared/i18n';
import { formatRating } from '@/shared/utils/formatRating';
import { formatShortDate } from '@/shared/utils/formatMyEventsListDate';
import { posterImageSrc, posterSrcAtSize } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { MyEventSummary } from '@/features/events/types';
import styles from './GroupFilms.module.css';

function RatingLine({ night }: Readonly<{ night: MyEventSummary }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const scale = user?.ratingScale ?? 'five';
  const average =
    night.averageRating === null
      ? null
      : formatRating(night.averageRating, scale, locale, { decimals: 1 });
  let mine: string | null = null;
  if (night.hasWinnerToRate) mine = t('groups.page.toRate');
  else if (night.myRating !== null)
    mine = t('groups.page.myRating', { value: formatRating(night.myRating, scale, locale) });

  return (
    <span className={styles.rating}>
      {average === null ? null : (
        <span className={styles.average}>
          <Star size={ICON_SIZE.sm} aria-hidden className={styles.star} />
          <span aria-hidden="true">{average}</span>
          <span className="visually-hidden">
            {t('groups.page.averageRating', { value: average })}
          </span>
        </span>
      )}
      {mine ? (
        <span className={night.hasWinnerToRate ? styles.toRate : undefined}>{mine}</span>
      ) : null}
    </span>
  );
}

export default function GroupFilms({ nights }: Readonly<{ nights: readonly MyEventSummary[] }>) {
  const { locale } = useLocale();
  return (
    <ul className={styles.grid}>
      {nights.map((night) => {
        const winner = night.winnerMovies[0];
        const src = posterSrcAtSize(posterImageSrc(winner?.posterPath), 'w342');
        return (
          <li key={night.id}>
            <Link to={ROUTES.eventDetail(night.slug)} className={styles.tile}>
              <span className={styles.poster}>
                {src ? (
                  <img src={src} alt="" className={styles.image} loading="lazy" decoding="async" />
                ) : (
                  <Film size={ICON_SIZE.xl} aria-hidden />
                )}
                <span className={styles.date}>{formatShortDate(night.date, locale)}</span>
                <span className={src ? 'visually-hidden' : styles.posterTitle}>
                  {winner?.title ?? night.title}
                </span>
              </span>
              <RatingLine night={night} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
