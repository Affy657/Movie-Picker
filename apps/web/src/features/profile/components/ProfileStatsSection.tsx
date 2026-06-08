import { lazy, Suspense } from 'react';
import { CalendarPlus, Film, Trophy, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import type { UserStats } from '@/features/profile/api/profileApi';
import styles from './ProfileStatsSection.module.css';

const GenresBar = lazy(() => import('./GenresBar'));
const ActivityHeatmap = lazy(() => import('./ActivityHeatmap'));

interface Props {
  stats: UserStats;
}

export default function ProfileStatsSection({ stats }: Props) {
  const { t } = useTranslation();

  const counters: { key: string; icon: LucideIcon; label: string; value: number }[] = [
    {
      key: 'eventsCreated',
      icon: CalendarPlus,
      label: t('profile.stats.eventsCreated'),
      value: stats.eventsCreated,
    },
    {
      key: 'eventsJoined',
      icon: Users,
      label: t('profile.stats.eventsJoined'),
      value: stats.eventsJoined,
    },
    {
      key: 'moviesProposed',
      icon: Film,
      label: t('profile.stats.moviesProposed'),
      value: stats.moviesProposed,
    },
    {
      key: 'winningProposals',
      icon: Trophy,
      label: t('profile.stats.winningProposals'),
      value: stats.winningProposals,
    },
  ];

  const hasGenres = stats.favoriteGenres.length > 0;
  const hasActivity = stats.dailyActivity.some((p) => p.count > 0);
  const hasAnyData = counters.some((c) => c.value > 0) || hasGenres || hasActivity;

  return (
    <section className={styles.stats} aria-labelledby="profile-stats-heading">
      <h2 id="profile-stats-heading" className={styles.heading}>
        {t('profile.stats.title')}
      </h2>

      {!hasAnyData && <p className={styles.empty}>{t('profile.stats.empty')}</p>}

      {(hasGenres || hasActivity) && (
        <div className={styles.panels}>
          {hasActivity && (
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>{t('profile.stats.activityTitle')}</h3>
              <Suspense fallback={null}>
                <ActivityHeatmap points={stats.dailyActivity} />
              </Suspense>
            </div>
          )}
          {hasGenres && (
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>{t('profile.stats.genresTitle')}</h3>
              <Suspense fallback={null}>
                <GenresBar genres={stats.favoriteGenres} />
              </Suspense>
            </div>
          )}
        </div>
      )}

      <ul className={styles.heroGrid}>
        {counters.map(({ key, icon: Icon, label, value }) => (
          <li key={key} className={styles.heroStat}>
            <span className={styles.heroIcon} aria-hidden>
              <Icon size={20} />
            </span>
            <span className={styles.heroText}>
              <span className={styles.heroValue}>{value}</span>
              <span className={styles.heroLabel}>{label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
