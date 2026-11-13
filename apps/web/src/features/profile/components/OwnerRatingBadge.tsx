import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Star } from 'lucide-react';
import cardStyles from '@/features/movies/components/ShowcaseMovieCard.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import styles from './OwnerRatingBadge.module.css';

export function ProfileCardBadge({
  description,
  icon,
  children,
}: Readonly<{ description: string; icon?: ReactNode; children: ReactNode }>) {
  return (
    <span className={clsx(cardStyles.badge, cardStyles.badgeStacked, styles.badge)}>
      <span className="visually-hidden">{description}</span>
      {icon}
      <span aria-hidden>{children}</span>
    </span>
  );
}

export default function OwnerRatingBadge({
  handle,
  value,
  scale,
}: Readonly<{ handle: string; value: number; scale: RatingScale }>) {
  const { t, locale } = useTranslation();
  const text = formatRating(value, scale, locale);
  return (
    <ProfileCardBadge
      description={t('profile.movies.ownerRating', { handle, value: text })}
      icon={<Star size={ICON_SIZE.xs} aria-hidden className={styles.star} />}
    >
      {text}
    </ProfileCardBadge>
  );
}
