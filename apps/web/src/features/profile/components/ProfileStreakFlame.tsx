import { useId } from 'react';
import { useTranslation } from '@/shared/i18n';
import styles from './ProfileStreakFlame.module.css';

const FLAME_PATH =
  'M32 2c0 0 11 13 15 22c4 9 6 15 6 22c0 14-9 25-21 25c-12 0-21-11-21-25c0-8 3-15 8-21c1 5 3 8 6 9c0-10 3-22 7-32z';

interface Props {
  weeks: number;
  bestWeeks: number;
}

export default function ProfileStreakFlame({ weeks, bestWeeks }: Readonly<Props>) {
  const { t } = useTranslation();
  const gradientId = `streak-flame-${useId().replaceAll(':', '')}`;
  const isLit = weeks > 0;
  const showRecord = bestWeeks > weeks;

  const currentLabel = isLit
    ? `${weeks} ${t(weeks === 1 ? 'profile.streak.weekLabel' : 'profile.streak.weeksLabel')}`
    : t('profile.streak.broken');

  const recordLabel = t(
    bestWeeks === 1 ? 'profile.streak.recordWeek' : 'profile.streak.recordWeeks',
    { count: String(bestWeeks) }
  );

  const ariaLabel = showRecord ? `${currentLabel}, ${recordLabel}` : currentLabel;

  return (
    <div
      className={isLit ? styles.streak : `${styles.streak} ${styles.out}`}
      role="group"
      aria-label={ariaLabel}
    >
      <svg className={styles.flame} viewBox="0 0 64 80" aria-hidden focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="45%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d={FLAME_PATH} fill={`url(#${gradientId})`} />
      </svg>
      <span className={styles.textStack} aria-hidden>
        <span className={styles.current}>{currentLabel}</span>
        {showRecord && <span className={styles.record}>{recordLabel}</span>}
      </span>
    </div>
  );
}
