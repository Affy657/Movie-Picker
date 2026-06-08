import { lazy, Suspense } from 'react';
import { CalendarPlus, Eye, Film, ThumbsUp, Trophy, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import type { UserStats } from '@/features/profile/api/profileApi';
import { computeBadges, type BadgeId } from '@/features/profile/lib/badges';
import styles from './ProfileStatsSection.module.css';

const GenresDonut = lazy(() => import('./GenresDonut'));
const ActivityAreaChart = lazy(() => import('./ActivityAreaChart'));

const BADGE_NAME_KEYS: Record<BadgeId, TranslationKey> = {
  organizer: 'profile.stats.badges.organizer',
  cinephile: 'profile.stats.badges.cinephile',
  kingmaker: 'profile.stats.badges.kingmaker',
  juror: 'profile.stats.badges.juror',
};

const BADGE_DESC_KEYS: Record<BadgeId, TranslationKey> = {
  organizer: 'profile.stats.badges.organizerDesc',
  cinephile: 'profile.stats.badges.cinephileDesc',
  kingmaker: 'profile.stats.badges.kingmakerDesc',
  juror: 'profile.stats.badges.jurorDesc',
};

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
      key: 'votesCast',
      icon: ThumbsUp,
      label: t('profile.stats.votesCast'),
      value: stats.votesCast,
    },
    {
      key: 'winningProposals',
      icon: Trophy,
      label: t('profile.stats.winningProposals'),
      value: stats.winningProposals,
    },
    { key: 'moviesSeen', icon: Eye, label: t('profile.stats.moviesSeen'), value: stats.moviesSeen },
  ];

  const badges = computeBadges(stats);
  const hasGenres = stats.favoriteGenres.length > 0;
  const hasActivity = stats.monthlyActivity.some((p) => p.count > 0);
  const hasAnyData = counters.some((c) => c.value > 0) || hasGenres || hasActivity;

  return (
    <section className={styles.section} aria-labelledby="profile-stats-heading">
      <h2 id="profile-stats-heading" className={styles.heading}>
        {t('profile.stats.title')}
      </h2>

      {!hasAnyData && <p className={styles.empty}>{t('profile.stats.empty')}</p>}

      <ul className={styles.counters}>
        {counters.map(({ key, icon: Icon, label, value }) => (
          <li key={key} className={styles.counter}>
            <Icon size={18} aria-hidden className={styles.counterIcon} />
            <span className={styles.counterValue}>{value}</span>
            <span className={styles.counterLabel}>{label}</span>
          </li>
        ))}
      </ul>

      {(hasGenres || hasActivity) && (
        <div className={styles.charts}>
          {hasGenres && (
            <div className={styles.chartBlock}>
              <h3 className={styles.chartTitle}>{t('profile.stats.genresTitle')}</h3>
              <Suspense fallback={null}>
                <GenresDonut genres={stats.favoriteGenres} />
              </Suspense>
            </div>
          )}
          {hasActivity && (
            <div className={styles.chartBlock}>
              <h3 className={styles.chartTitle}>{t('profile.stats.activityTitle')}</h3>
              <Suspense fallback={null}>
                <ActivityAreaChart points={stats.monthlyActivity} />
              </Suspense>
            </div>
          )}
        </div>
      )}

      <div className={styles.badgesBlock}>
        <h3 className={styles.chartTitle}>{t('profile.stats.badgesTitle')}</h3>
        <ul className={styles.badgeList}>
          {badges.map((badge) => (
            <li
              key={badge.id}
              className={badge.earned ? `${styles.badge} ${styles.badgeEarned}` : styles.badge}
              title={t(BADGE_DESC_KEYS[badge.id], { threshold: badge.threshold })}
            >
              <span className={styles.badgeEmoji} aria-hidden>
                {badge.emoji}
              </span>
              <span className={styles.badgeName}>{t(BADGE_NAME_KEYS[badge.id])}</span>
              {!badge.earned && (
                <span className={styles.badgeProgress}>
                  {t('profile.stats.badgeLocked', {
                    current: badge.current,
                    threshold: badge.threshold,
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
