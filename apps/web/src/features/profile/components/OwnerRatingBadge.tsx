import { Star } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import ProfileCardBadge from './ProfileCardBadge';
import styles from './OwnerRatingBadge.module.css';

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
