import { lazy, Suspense } from 'react';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { UserStats } from '@/features/events/api/userStatsApi';
import styles from './ProfileActivitySection.module.css';

const GenresBar = lazy(() => import('./GenresBar'));
const ActivityWeeks = lazy(() => import('./ActivityWeeks'));

interface Props {
  stats: UserStats;
}

export default function ProfileActivitySection({ stats }: Readonly<Props>) {
  const { t } = useTranslation();

  const participations = stats.dailyActivity.reduce((sum, p) => sum + p.count, 0);
  const hasActivity = participations > 0;
  const hasGenres = stats.favoriteGenres.some((g) => g.count > 0);
  if (!hasActivity && !hasGenres) return null;

  return (
    <div className={styles.activity}>
      {hasActivity && (
        <section className={styles.block} aria-labelledby="profile-activity-heading">
          <h2 id="profile-activity-heading" className={styles.heading}>
            {t('profile.stats.activity.title')}
          </h2>
          <p className={styles.total}>
            <span className={styles.totalValue}>{participations}</span>
            <span className={styles.totalLabel}>
              {pluralizeCount(
                participations,
                'profile.stats.activity.countOne',
                'profile.stats.activity.count',
                t
              )}
            </span>
          </p>
          <Suspense fallback={null}>
            <ActivityWeeks points={stats.dailyActivity} />
          </Suspense>
        </section>
      )}

      {hasGenres && (
        <section className={styles.block} aria-labelledby="profile-genres-heading">
          <h2 id="profile-genres-heading" className={styles.heading}>
            {t('profile.stats.genresTitle')}
          </h2>
          <Suspense fallback={null}>
            <GenresBar genres={stats.favoriteGenres} />
          </Suspense>
          <p className={styles.hint}>{t('profile.stats.genresHint')}</p>
        </section>
      )}
    </div>
  );
}
