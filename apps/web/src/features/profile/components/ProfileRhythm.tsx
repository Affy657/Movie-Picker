import clsx from 'clsx';
import { Flame } from 'lucide-react';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { DailyActivityPoint } from '@/features/events/api/userStatsApi';
import {
  monthlyActivity,
  shownStreak,
  weekdayActivity,
} from '@/features/profile/lib/profileActivity';
import styles from './ProfileStatsSection.module.css';

const FIRST_MONDAY = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

interface Props {
  points: readonly DailyActivityPoint[];
  streakWeeks: number;
  bestStreakWeeks: number;
}

function spokenCount(label: string, count: number, t: Translate): string {
  if (count === 0) return t('profile.stats.rhythm.countNone', { label });
  if (count === 1) return t('profile.stats.rhythm.countOne', { label });
  return t('profile.stats.rhythm.count', { label, count });
}

export default function ProfileRhythm({ points, streakWeeks, bestStreakWeeks }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const total = points.reduce((sum, point) => sum + point.count, 0);
  if (total === 0) return null;

  const months = monthlyActivity(points);
  const weekdays = weekdayActivity(points);
  const busiestMonth = Math.max(1, ...months.map((month) => month.count));
  const busiestDay = Math.max(...weekdays);
  const streak = shownStreak(streakWeeks, bestStreakWeeks);
  const longMonth = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const longDay = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  const shortDay = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const monthName = (name: string, partial: boolean) =>
    partial ? t('profile.stats.rhythm.partialMonth', { month: name }) : name;

  return (
    <section className={styles.panel} aria-labelledby="profile-rhythm-heading">
      <div className={styles.panelHead}>
        <h3 id="profile-rhythm-heading" className={styles.panelTitle}>
          {t('profile.stats.rhythm.title')}
        </h3>
        <span className={styles.panelNote}>
          {pluralizeCount(total, 'profile.stats.rhythm.totalOne', 'profile.stats.rhythm.total', t)}
        </span>
      </div>

      <ol className={styles.months} aria-label={t('profile.stats.rhythm.monthsLabel')}>
        {months.map((month) => {
          const date = new Date(Date.UTC(month.year, month.month, 1));
          const spoken = spokenCount(
            monthName(longMonth.format(date), month.startsMidMonth),
            month.count,
            t
          );
          return (
            <li key={`${month.year}-${month.month}`} className={styles.month}>
              <span className="visually-hidden">
                {month.inProgress
                  ? t('profile.stats.rhythm.inProgress', { label: spoken })
                  : spoken}
              </span>
              <span className={styles.barArea} aria-hidden>
                <span className={styles.monthCount}>{month.count}</span>
                <span
                  className={clsx(
                    styles.bar,
                    month.inProgress && styles.barInProgress,
                    month.count === 0 && styles.barEmpty
                  )}
                  style={{ ['--bar-ratio' as string]: month.count / busiestMonth }}
                />
              </span>
              <span className={styles.monthLabel} aria-hidden>
                {monthName(shortMonth.format(date), month.startsMidMonth)}
              </span>
            </li>
          );
        })}
      </ol>

      <p className={styles.subTitle}>{t('profile.stats.rhythm.weekdaysTitle')}</p>
      <ol className={styles.weekdays} aria-label={t('profile.stats.rhythm.weekdaysLabel')}>
        {weekdays.map((count, index) => {
          const date = new Date(FIRST_MONDAY + index * DAY_MS);
          const dayName = longDay.format(date);
          return (
            <li
              key={dayName}
              className={clsx(
                styles.weekday,
                count > 0 && count === busiestDay && styles.weekdayPeak,
                count === 0 && styles.weekdayEmpty
              )}
            >
              <span className="visually-hidden">{spokenCount(dayName, count, t)}</span>
              <span className={styles.dayLabel} aria-hidden>
                {shortDay.format(date)}
              </span>
              <span className={styles.dayCount} aria-hidden>
                {count}
              </span>
            </li>
          );
        })}
      </ol>

      {streak && (
        <>
          <p className={styles.streak}>
            <Flame size={ICON_SIZE.xl} aria-hidden className={styles.streakIcon} />
            <span>
              <strong>
                {streak.weeks} {t('profile.streak.weeksLabel')}
              </strong>
              {streak.bestWeeks > streak.weeks
                ? t('profile.stats.rhythm.streakBest', { count: streak.bestWeeks })
                : t('profile.stats.rhythm.streakIsRecord')}
            </span>
          </p>
          <p className={styles.hint}>{t('profile.stats.rhythm.streakHint')}</p>
        </>
      )}
    </section>
  );
}
