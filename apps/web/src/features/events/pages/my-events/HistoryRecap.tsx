import { Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchUserStats } from '@/features/profile/api/profileApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import styles from './HistoryRecap.module.css';

interface HistoryRecapProps {
  totalFinished: number;
}

export default function HistoryRecap({ totalFinished }: Readonly<HistoryRecapProps>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const handle = user?.handle;

  const { data } = useQuery({
    queryKey: queryKeys.profile.stats(handle),
    queryFn: ({ signal }) => fetchUserStats(handle!, signal),
    enabled: !!handle,
  });

  return (
    <div className={styles.recap}>
      <div className={styles.stat}>
        <span className={styles.value}>{totalFinished}</span>
        <span className={styles.label}>{t('events.myEvents.recapFinishedLabel')}</span>
      </div>
      <span className={styles.divider} aria-hidden />
      <div className={styles.stat}>
        <span className={styles.value}>{data?.moviesSeen ?? 0}</span>
        <span className={styles.label}>{t('events.myEvents.recapMoviesLabel')}</span>
      </div>
      <span className={styles.divider} aria-hidden />
      <div className={styles.stat}>
        <span className={styles.valueRow}>
          <Flame aria-hidden size={16} className={styles.flameIcon} />
          <span className={styles.value}>{data?.currentStreakWeeks ?? 0}</span>
        </span>
        <span className={styles.label}>{t('events.myEvents.recapStreakLabel')}</span>
      </div>
    </div>
  );
}
