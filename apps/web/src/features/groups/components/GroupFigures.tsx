import type { ReactNode } from 'react';
import { Star } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useLocale, useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatRating } from '@/shared/utils/formatRating';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { FriendGroupStats } from '@/features/groups/api/groupsApi';
import { sinceMonth, weekdayName } from '@/features/groups/utils/groupFigures';
import styles from './GroupFigures.module.css';

interface Figure {
  key: string;
  value: ReactNode;
  label: string;
}

export default function GroupFigures({ stats }: Readonly<{ stats: FriendGroupStats }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  if (stats.nightCount === 0) return null;

  const count = new Intl.NumberFormat(locale);
  const month = stats.firstNightDate ? sinceMonth(stats.firstNightDate, locale) : null;
  const figures: Figure[] = [
    {
      key: 'nights',
      value: count.format(stats.nightCount),
      label: month
        ? pluralizeCount(
            stats.nightCount,
            'groups.page.nightsSinceOne',
            'groups.page.nightsSince',
            t,
            {
              month,
            }
          )
        : pluralizeCount(
            stats.nightCount,
            'groups.page.nightsHeldOne',
            'groups.page.nightsHeld',
            t
          ),
    },
    {
      key: 'films',
      value: count.format(stats.filmCount),
      label: stats.filmCount === 1 ? t('groups.page.filmsWonOne') : t('groups.page.filmsWon'),
    },
  ];
  if (stats.averageRating !== null) {
    figures.push({
      key: 'rating',
      value: (
        <>
          <Star size={ICON_SIZE.sm} aria-hidden className={styles.star} />
          {formatRating(stats.averageRating, user?.ratingScale ?? 'five', locale, { decimals: 1 })}
        </>
      ),
      label: t('groups.page.filmsAverage'),
    });
  }
  if (stats.usualWeekday !== null) {
    figures.push({
      key: 'evening',
      value: weekdayName(stats.usualWeekday, locale),
      label: t('groups.page.usualEvening'),
    });
  }

  return (
    <ul className={styles.figures} aria-label={t('groups.page.figuresAria')}>
      {figures.map((figure) => (
        <li key={figure.key} className={styles.figure}>
          <span className={styles.value}>{figure.value}</span>
          <span className={styles.label}>{figure.label}</span>
        </li>
      ))}
    </ul>
  );
}
