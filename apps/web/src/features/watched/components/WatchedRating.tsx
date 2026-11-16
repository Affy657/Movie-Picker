import Button from '@/shared/components/Button';
import StarRating from '@/shared/components/StarRating';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import type { WatchedStatus } from '@/features/watched/api/watchedApi';
import styles from './WatchedRating.module.css';

export function hasWatchedRating(status: WatchedStatus | undefined): boolean {
  if (status?.status === 'elsewhere') return true;
  return status?.status === 'night' && status.rating != null;
}

export default function WatchedRating({
  status,
  scale,
  onRate,
}: Readonly<{
  status: WatchedStatus | undefined;
  scale: RatingScale;
  onRate: (value: number | null) => void;
}>) {
  const { t, locale } = useTranslation();
  if (!status || !hasWatchedRating(status)) return null;
  const value = status.rating == null ? null : formatRating(status.rating, scale, locale);

  if (status.status === 'night') {
    return (
      <span className={styles.rating}>
        <StarRating
          readOnly
          value={status.rating}
          ariaLabel={t('watched.rating.readOnly', { value: value ?? '' })}
        />
        <span className={styles.value} aria-hidden="true">
          {value}
        </span>
      </span>
    );
  }

  return (
    <span className={styles.rating}>
      <StarRating
        value={status.rating}
        onChange={onRate}
        ariaLabel={t('watched.rating.label')}
        starLabel={(stars) =>
          pluralizeCount(stars, 'events.ratings.starAriaOne', 'events.ratings.starAriaMany', t)
        }
      />
      {value ? (
        <>
          <span className={styles.value}>{value}</span>
          <Button variant="ghost" size="sm" onClick={() => onRate(null)}>
            {t('events.ratings.clear')}
          </Button>
        </>
      ) : null}
    </span>
  );
}
