import { CalendarDays, Trophy } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { shownStreak } from '@/features/profile/lib/profileActivity';
import ProfileStreakFlame from './ProfileStreakFlame';
import styles from './ProfileStatsSummary.module.css';

interface Props {
  nights: number;
  winning: number | null;
  streakWeeks: number;
  bestStreakWeeks: number;
  targetId: string;
}

export default function ProfileStatsSummary({
  nights,
  winning,
  streakWeeks,
  bestStreakWeeks,
  targetId,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const streak = shownStreak(streakWeeks, bestStreakWeeks);
  const shownWinning = winning != null && winning > 0 ? winning : 0;
  if (nights <= 0 && shownWinning === 0 && !streak) return null;

  const href = `#${targetId}`;

  return (
    <p className={styles.summary}>
      {nights > 0 && (
        <a href={href} className={styles.item}>
          <CalendarDays size={ICON_SIZE.md} aria-hidden className={styles.icon} />
          <span>
            <span className={styles.count}>{nights}</span>{' '}
            {pluralizeCount(
              nights,
              'profile.stats.figures.nightsOne',
              'profile.stats.figures.nights',
              t
            )}
          </span>
        </a>
      )}
      {shownWinning > 0 && (
        <a href={href} className={styles.item}>
          <Trophy size={ICON_SIZE.md} aria-hidden className={styles.icon} />
          <span>
            <span className={styles.count}>{shownWinning}</span>{' '}
            {pluralizeCount(
              shownWinning,
              'profile.stats.figures.winningOne',
              'profile.stats.figures.winning',
              t
            )}
          </span>
        </a>
      )}
      {streak && (
        <a href={href} className={styles.streakLink}>
          <ProfileStreakFlame weeks={streak.weeks} bestWeeks={streak.bestWeeks} />
        </a>
      )}
    </p>
  );
}
